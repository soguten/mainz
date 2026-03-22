import { DefaultProps, DefaultState } from "./types.ts";
import {
    getManagedDOMEvents,
    ManagedDOMEventDescriptor,
    setManagedDOMEvents,
} from "../jsx/dom-factory.ts";
import { popRenderOwner, pushRenderOwner } from "../jsx/render-owner.ts";
import type { RenderStrategy, ResourceRuntime } from "../resources/index.ts";
import type { RenderMode } from "../routing/index.ts";

interface TrackedEventListener {
    target: EventTarget;
    type: string;
    listener: EventListenerOrEventListenerObject;
    options: boolean;
}

const HTMLElementBase = (globalThis.HTMLElement ?? class {}) as typeof HTMLElement;
const COMPONENT_CUSTOM_ELEMENT_TAG = Symbol(
    "mainz.component.custom-element-tag",
);
const COMPONENT_RENDER_STRATEGY = Symbol(
    "mainz.component.render-strategy",
);

export interface RenderStrategyOptions {
    fallback?: unknown | (() => unknown);
    errorFallback?: unknown | ((error: unknown) => unknown);
}

export interface ComponentRenderConfig extends RenderStrategyOptions {
    strategy: RenderStrategy;
}

interface ComponentLoadState<Data = unknown> {
    status: "idle" | "loading" | "resolved" | "rejected";
    data?: Data;
    error?: unknown;
}

type MainzComponentConstructor =
    & (abstract new (...args: unknown[]) => Component<any, any>)
    & {
        name: string;
        [COMPONENT_CUSTOM_ELEMENT_TAG]?: string;
        [COMPONENT_RENDER_STRATEGY]?: ComponentRenderConfig;
    };

const warnedMissingLoadFallbackComponents = new WeakSet<object>();

export function CustomElement(tagName: string) {
    return function <T extends MainzComponentConstructor>(
        value: T,
        _context?: ClassDecoratorContext<T>,
    ): void {
        applyDecoratedCustomElementTag(value, tagName);
    };
}

export function RenderStrategy(
    strategy: RenderStrategy,
    options: RenderStrategyOptions = {},
) {
    return function <T extends MainzComponentConstructor>(
        value: T,
        _context?: ClassDecoratorContext<T>,
    ): void {
        applyDecoratedRenderStrategy(value, {
            strategy,
            fallback: options.fallback,
            errorFallback: options.errorFallback,
        });
    };
}

/**
 * Abstract base class for custom web components.
 * Provides lifecycle management, state handling, event registration, and rendering logic.
 *
 * `Component` uses the generic order `Component<Props, State, Data>`.
 *
 * - Use `NoProps` when a component should not accept any props, including `children`.
 * - Use `ChildrenOnlyProps` when a component accepts only JSX children.
 * - Use `NoState` when a component does not use local state.
 *
 * @template Props The type for the component's props.
 * @template State The type for the component's state.
 * @template Data The resolved value returned by `load()` and exposed through `this.data`.
 */
export abstract class Component<
    Props = DefaultProps,
    State = DefaultState,
    Data = unknown,
> extends HTMLElementBase {
    private static tagNameCache = new WeakMap<typeof Component, string>();
    private static tagOwners = new Map<string, typeof Component>();
    private static tagSuffixCounter = 0;

    /** The properties of the component */
    props: Props = {} as Props;

    /** The state of the component */
    state: State = {} as State;

    /** Stores registered event listeners for cleanup */
    private eventListeners: TrackedEventListener[] = [];

    private styleInjected = false;
    private renderedNodes: Node[] = [];
    private stateInitialized = false;
    private componentLoadState: ComponentLoadState<Data> = {
        status: "idle",
    };
    private activeLoadRequestId = 0;
    private asyncLoadKey?: string;

    /**
     * Called when the component is added to the DOM.
     * Initializes state once, renders the component, and triggers the `onMount` lifecycle method.
     */
    connectedCallback() {
        if (!this.stateInitialized) {
            const hasPreloadedState = Object.keys(this.state ?? {}).length > 0;

            if (!hasPreloadedState && this.initState) {
                this.state = this.initState();
            }

            this.stateInitialized = true;
        }

        this.renderDOM();
        this.onMount?.();
    }

    /**
     * Called when the component is removed from the DOM.
     * Removes event listeners and triggers the `onUnmount` lifecycle method, if defined.
     */
    disconnectedCallback() {
        this.onUnmount?.();

        for (const entry of this.eventListeners) {
            entry.target.removeEventListener(
                entry.type,
                entry.listener,
                entry.options,
            );
        }

        this.eventListeners = [];
    }

    /**
     * Computes the initial state before the first render.
     * Override this instead of using `onMount()` for state bootstrap.
     */
    protected initState?(): State;

    /**
     * Updates the component state and re-renders it.
     * @param partial The partial state to merge with the current state.
     */
    public setState(partial: Partial<State>) {
        const nextState = { ...this.state, ...partial };
        this.state = nextState;
        if (!this.isConnected) {
            return;
        }
        this.renderDOM();
    }

    /**
     * Re-renders the component using the current props and state.
     * Useful when runtime infrastructure updates props on an already mounted element.
     */
    public rerender(): void {
        if (!this.isConnected) {
            return;
        }

        this.renderDOM();
    }

    load?(): Data | Promise<Data>;

    /** Resolved data returned by `load()` for async components. */
    get data(): Data {
        return this.componentLoadState.data as Data;
    }

    /**
     * Registers an event listener for a target element and stores it for future cleanup.
     * Re-registering the same target/event/options replaces the previous listener.
     * @param target The target element to attach the event listener to.
     * @param type The event type (e.g., "click", "keydown").
     * @param listener The event listener function or object.
     * @param options The options for the event listener.
     */
    protected registerEvent(
        target: EventTarget,
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean,
    ) {
        const normalizedOptions = options === true;
        this.unregisterEventsByTargetAndType(target, type, normalizedOptions);

        target.addEventListener(type, listener, normalizedOptions);
        this.eventListeners.push({
            target,
            type,
            listener,
            options: normalizedOptions,
        });
    }

    public registerDOMEvent(
        target: EventTarget,
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean,
    ): void {
        this.registerEvent(target, type, listener, options);
    }

    /**
     * Injects styles into the component, using the `styles` static property if defined.
     * Logs a warning if the `styles` property is set as an instance property.
     */
    protected injectStyles() {
        if (Object.prototype.hasOwnProperty.call(this, "styles")) {
            console.warn(
                `${this.constructor.name} has 'styles' on the instance; use static styles.`,
            );
        }

        const ctor = this.constructor as typeof Component;
        const styles = ctor.styles;
        if (!styles) return;

        const add = (css: string) => {
            const s = document.createElement("style");
            s.textContent = css;
            this.appendChild(s);
        };

        if (typeof styles === "string") {
            add(styles);
        } else {
            styles.forEach(add);
        }
    }

    /**
     * Renders the DOM structure of the component.
     * Uses a small DOM diff to patch only changed nodes instead of replacing all content.
     */
    private renderDOM() {
        this.prepareComponentLoad();
        pushRenderOwner(this);

        try {
            const nextNodes = this.toRenderedNodes(this.resolveRenderedTree());

            if (!this.styleInjected) {
                this.innerHTML = "";
                this.injectStyles();
                this.styleInjected = true;
                for (const nextNode of nextNodes) {
                    this.appendChild(nextNode);
                }
                this.renderedNodes = nextNodes;
                this.pruneDetachedEventListeners();
                this.afterRender?.();
                return;
            }

            const renderedNodesAreAttached = this.renderedNodes.every((node) =>
                node.parentNode === this
            );

            if (this.renderedNodes.length === 0 || !renderedNodesAreAttached) {
                for (const currentNode of this.renderedNodes) {
                    if (currentNode.parentNode === this) {
                        this.removeChild(currentNode);
                    }
                }

                for (const nextNode of nextNodes) {
                    this.appendChild(nextNode);
                }

                this.renderedNodes = nextNodes;
                this.pruneDetachedEventListeners();
                this.afterRender?.();
                return;
            }

            this.renderedNodes = this.patchChildNodeList(
                this,
                this.renderedNodes,
                nextNodes,
            );
            this.pruneDetachedEventListeners();
            this.afterRender?.();
        } finally {
            popRenderOwner();
        }
    }

    private resolveRenderedTree(): HTMLElement | DocumentFragment {
        if (!this.hasComponentLoad()) {
            return this.render();
        }

        if (this.componentLoadState.status === "resolved") {
            return this.render();
        }

        if (this.componentLoadState.status === "rejected") {
            const renderConfig = this.requireLoadRenderConfig();
            return this.resolveComponentLoadErrorFallback(
                renderConfig,
                this.componentLoadState.error,
            );
        }

        return this.resolveComponentLoadFallback(this.requireLoadRenderConfig());
    }

    private prepareComponentLoad(): void {
        if (!this.hasComponentLoad()) {
            return;
        }

        const loadKey = this.computeComponentLoadKey();
        if (loadKey === this.asyncLoadKey && this.componentLoadState.status !== "idle") {
            return;
        }

        this.asyncLoadKey = loadKey;

        const renderConfig = this.requireLoadRenderConfig();
        const environment = resolveComponentLoadEnvironment();

        if (renderConfig.strategy === "forbidden-in-ssg" && environment.renderMode === "ssg") {
            throw new Error(
                `Component "${this.constructor.name}" uses @RenderStrategy("forbidden-in-ssg") and cannot be rendered during SSG.`,
            );
        }

        if (shouldWaitForClientRuntime(renderConfig.strategy, environment)) {
            warnAboutMissingLoadFallback(this.constructor, renderConfig);
            this.applyComponentLoadState({
                status: "loading",
                data: undefined,
                error: undefined,
            });
            return;
        }

        this.startComponentLoad(loadKey);
    }

    private startComponentLoad(loadKey: string): void {
        const requestId = ++this.activeLoadRequestId;
        this.applyComponentLoadState({
            status: "loading",
            data: undefined,
            error: undefined,
        });

        let loadResult: Data | Promise<Data>;
        try {
            loadResult = this.load!();
        } catch (error) {
            this.asyncLoadKey = loadKey;
            this.applyComponentLoadState({
                status: "rejected",
                data: undefined,
                error,
            }, true);
            return;
        }

        if (!isPromiseLike(loadResult)) {
            this.asyncLoadKey = loadKey;
            this.applyComponentLoadState({
                status: "resolved",
                data: loadResult,
                error: undefined,
            });
            return;
        }

        Promise.resolve(loadResult)
            .then((data) => {
                if (requestId !== this.activeLoadRequestId) {
                    return;
                }

                this.asyncLoadKey = loadKey;
                this.applyComponentLoadState({
                    status: "resolved",
                    data,
                    error: undefined,
                }, true);
            })
            .catch((error) => {
                if (requestId !== this.activeLoadRequestId) {
                    return;
                }

                this.asyncLoadKey = loadKey;
                this.applyComponentLoadState({
                    status: "rejected",
                    data: undefined,
                    error,
                }, true);
            });
    }

    private applyComponentLoadState(
        nextState: ComponentLoadState<Data>,
        rerender = false,
    ): void {
        this.componentLoadState = nextState;

        if (!rerender || !this.isConnected) {
            return;
        }

        this.renderDOM();
    }

    private computeComponentLoadKey(): string {
        return stableSerializeForLoadKey(this.props ?? null);
    }

    private requireLoadRenderConfig(): ComponentRenderConfig {
        const renderConfig = resolveComponentRenderConfig(this.constructor);
        if (renderConfig) {
            return renderConfig;
        }

        throw new Error(
            `Component "${this.constructor.name}" declares load() but does not declare @RenderStrategy(...). ` +
                "Component.load() requires a fixed component-level render strategy.",
        );
    }

    private hasComponentLoad(): boolean {
        return typeof this.load === "function";
    }

    private resolveComponentLoadFallback(
        renderConfig: ComponentRenderConfig,
    ): HTMLElement | DocumentFragment {
        if (typeof renderConfig.fallback === "function") {
            const resolvedFallback = renderConfig.fallback();
            if (resolvedFallback !== undefined) {
                return normalizeComponentRenderValue(resolvedFallback);
            }
        } else if (renderConfig.fallback !== undefined) {
            return normalizeComponentRenderValue(renderConfig.fallback);
        }

        return document.createDocumentFragment();
    }

    private resolveComponentLoadErrorFallback(
        renderConfig: ComponentRenderConfig,
        error: unknown,
    ): HTMLElement | DocumentFragment {
        if (typeof renderConfig.errorFallback === "function") {
            const resolvedErrorFallback = renderConfig.errorFallback(error);
            if (resolvedErrorFallback !== undefined) {
                return normalizeComponentRenderValue(resolvedErrorFallback);
            }

            return this.resolveComponentLoadFallback(renderConfig);
        }

        if (renderConfig.errorFallback !== undefined) {
            return normalizeComponentRenderValue(renderConfig.errorFallback);
        }

        return this.resolveComponentLoadFallback(renderConfig);
    }

    private patchNode(current: Node, next: Node): Node {
        if (!this.isSameNodeType(current, next)) {
            (current as ChildNode).replaceWith(next);
            return next;
        }

        if (
            current.nodeType === Node.TEXT_NODE && next.nodeType === Node.TEXT_NODE
        ) {
            if (current.textContent !== next.textContent) {
                current.textContent = next.textContent;
            }
            return current;
        }

        if (current instanceof Component && next instanceof Component) {
            this.syncAttributes(current, next);
            this.syncManagedDOMEvents(current, next);
            current.props = next.props;
            current.renderDOM();
            return current;
        }

        if (current instanceof HTMLElement && next instanceof HTMLElement) {
            this.syncAttributes(current, next);
            this.syncManagedDOMEvents(current, next);
            this.patchChildren(current, next);
            return current;
        }

        return current;
    }

    private patchChildren(current: HTMLElement, next: HTMLElement) {
        this.patchChildNodeList(
            current,
            Array.from(current.childNodes),
            Array.from(next.childNodes),
        );
    }

    private patchChildNodeList(
        parent: HTMLElement,
        currentChildren: Node[],
        nextChildren: Node[],
    ): Node[] {
        const managedStartIndex = this.findManagedChildStartIndex(
            parent,
            currentChildren,
        );
        const keyedCurrent = new Map<string, Node>();
        const unkeyedCurrent: Node[] = [];

        for (const child of currentChildren) {
            const key = this.getNodeKey(child);
            if (key == null) {
                unkeyedCurrent.push(child);
                continue;
            }

            keyedCurrent.set(this.buildNodeLookupKey(child, key), child);
        }

        const usedCurrent = new Set<Node>();
        const orderedChildren: Node[] = [];

        for (const nextChild of nextChildren) {
            const reusableChild = this.findReusableChild(
                nextChild,
                keyedCurrent,
                unkeyedCurrent,
                usedCurrent,
            );

            if (reusableChild) {
                usedCurrent.add(reusableChild);
                orderedChildren.push(this.patchNode(reusableChild, nextChild));
                continue;
            }

            orderedChildren.push(nextChild);
        }

        for (let index = 0; index < orderedChildren.length; index += 1) {
            const expectedNode = orderedChildren[index];
            const currentNodeAtIndex = parent.childNodes[managedStartIndex + index];

            if (currentNodeAtIndex !== expectedNode) {
                parent.insertBefore(expectedNode, currentNodeAtIndex ?? null);
            }
        }

        const orderedChildrenSet = new Set(orderedChildren);
        for (const currentChild of currentChildren) {
            if (
                !orderedChildrenSet.has(currentChild) &&
                currentChild.parentNode === parent
            ) {
                parent.removeChild(currentChild);
            }
        }

        return orderedChildren;
    }

    private findManagedChildStartIndex(
        parent: HTMLElement,
        currentChildren: Node[],
    ): number {
        for (const currentChild of currentChildren) {
            if (currentChild.parentNode !== parent) {
                continue;
            }

            const childIndex = Array.from(parent.childNodes).findIndex((node) =>
                node === currentChild
            );
            if (childIndex >= 0) {
                return childIndex;
            }
        }

        return parent.childNodes.length;
    }

    private toRenderedNodes(rendered: HTMLElement | DocumentFragment): Node[] {
        if (rendered instanceof DocumentFragment) {
            return Array.from(rendered.childNodes);
        }

        return [rendered];
    }

    private findReusableChild(
        nextChild: Node,
        keyedCurrent: Map<string, Node>,
        unkeyedCurrent: Node[],
        usedCurrent: Set<Node>,
    ): Node | undefined {
        const key = this.getNodeKey(nextChild);
        if (key != null) {
            const candidate = keyedCurrent.get(
                this.buildNodeLookupKey(nextChild, key),
            );
            if (
                candidate && !usedCurrent.has(candidate) &&
                this.isSameNodeType(candidate, nextChild)
            ) {
                return candidate;
            }

            return undefined;
        }

        for (const candidate of unkeyedCurrent) {
            if (usedCurrent.has(candidate)) continue;
            if (!this.isSameNodeType(candidate, nextChild)) continue;
            return candidate;
        }

        return undefined;
    }

    private syncAttributes(current: HTMLElement, next: HTMLElement) {
        for (const attr of Array.from(current.attributes)) {
            if (!next.hasAttribute(attr.name)) {
                current.removeAttribute(attr.name);
            }
        }

        for (const attr of Array.from(next.attributes)) {
            if (current.getAttribute(attr.name) !== attr.value) {
                current.setAttribute(attr.name, attr.value);
            }
        }

        this.syncProperties(current, next);
    }

    private syncProperties(current: HTMLElement, next: HTMLElement) {
        if (
            current instanceof HTMLInputElement && next instanceof HTMLInputElement
        ) {
            if (current.value !== next.value) {
                current.value = next.value;
            }

            if (current.checked !== next.checked) {
                current.checked = next.checked;
            }

            return;
        }

        if (
            current instanceof HTMLTextAreaElement &&
            next instanceof HTMLTextAreaElement
        ) {
            if (current.value !== next.value) {
                current.value = next.value;
            }
            return;
        }

        if (
            current instanceof HTMLSelectElement && next instanceof HTMLSelectElement
        ) {
            if (current.value !== next.value) {
                current.value = next.value;
            }
            return;
        }

        if (current.tagName === "OPTION" && next.tagName === "OPTION") {
            const currentOption = current as HTMLOptionElement;
            const nextOption = next as HTMLOptionElement;
            if (currentOption.selected !== nextOption.selected) {
                currentOption.selected = nextOption.selected;
            }
        }
    }

    private syncManagedDOMEvents(current: HTMLElement, next: HTMLElement) {
        const currentEvents = getManagedDOMEvents(current);
        const nextEvents = getManagedDOMEvents(next);

        for (const event of currentEvents) {
            this.unregisterSpecificEvent(current, event);
        }

        for (const event of nextEvents) {
            this.unregisterSpecificEvent(next, event);
            this.registerEvent(current, event.type, event.listener, event.options);
        }

        setManagedDOMEvents(current, nextEvents);
        setManagedDOMEvents(next, []);
    }

    private unregisterSpecificEvent(
        target: EventTarget,
        event: ManagedDOMEventDescriptor,
    ) {
        const normalizedOptions = event.options === true;
        target.removeEventListener(event.type, event.listener, normalizedOptions);
        this.eventListeners = this.eventListeners.filter((entry) => {
            return !(
                entry.target === target &&
                entry.type === event.type &&
                entry.listener === event.listener &&
                entry.options === normalizedOptions
            );
        });
    }

    private unregisterEventsByTargetAndType(
        target: EventTarget,
        type: string,
        options: boolean,
    ) {
        const staleEntries = this.eventListeners.filter((entry) => {
            return entry.target === target && entry.type === type &&
                entry.options === options;
        });

        for (const staleEntry of staleEntries) {
            staleEntry.target.removeEventListener(
                staleEntry.type,
                staleEntry.listener,
                staleEntry.options,
            );
        }

        this.eventListeners = this.eventListeners.filter((entry) => {
            return !(entry.target === target && entry.type === type &&
                entry.options === options);
        });
    }

    private pruneDetachedEventListeners() {
        const stillTracked: TrackedEventListener[] = [];

        for (const entry of this.eventListeners) {
            const { target } = entry;

            if (!(target instanceof Node)) {
                stillTracked.push(entry);
                continue;
            }

            if (target === this || this.contains(target)) {
                stillTracked.push(entry);
                continue;
            }

            target.removeEventListener(entry.type, entry.listener, entry.options);
        }

        this.eventListeners = stillTracked;
    }

    private getNodeKey(node: Node): string | null {
        if (!(node instanceof Element)) return null;

        return node.getAttribute("key") ??
            node.getAttribute("data-key") ??
            node.getAttribute("data-id");
    }

    private buildNodeLookupKey(node: Node, key: string): string {
        const elementTag = node instanceof Element ? elementTagName(node) : "node";
        return `${node.nodeType}:${elementTag}:${key}`;
    }

    private isSameNodeType(current: Node, next: Node) {
        if (current.nodeType !== next.nodeType) return false;

        if (current instanceof HTMLElement && next instanceof HTMLElement) {
            return current.tagName === next.tagName;
        }

        return true;
    }

    /**
     * Returns the custom tag name for the component in kebab-case.
     * @returns {string} The tag name of the component.
     */
    static get tagName(): string {
        const ctor = this as typeof Component;
        const cached = Component.tagNameCache.get(ctor);
        if (cached) return cached;

        let candidate = Component.resolveDesiredTagName(ctor);
        const owner = Component.tagOwners.get(candidate);

        if (owner && owner !== ctor) {
            Component.tagSuffixCounter += 1;
            candidate = `${candidate}-${Component.tagSuffixCounter}`;
        }

        Component.tagOwners.set(candidate, ctor);
        Component.tagNameCache.set(ctor, candidate);

        return candidate;
    }

    /**
     * Returns the custom tag name for the component.
     * @returns {string} The tag name of the component.
     */
    static getTagName(): string {
        return this.tagName;
    }

    /**
     * Returns the custom tag name for the current component instance.
     * @returns {string} The tag name of the component.
     */
    getTagName(): string {
        return (this.constructor as typeof Component).tagName;
    }

    /**
     * Abstract method for rendering the component's DOM structure.
     * Must be implemented by subclasses.
     * @returns {HTMLElement | DocumentFragment} The rendered component element or a Fragment.
     */
    abstract render(): HTMLElement | DocumentFragment;

    /** Optional lifecycle method called after the component is mounted */
    onMount?(): void;

    /** Optional lifecycle method called before the component is unmounted */
    onUnmount?(): void;

    /** Optional static property to define CSS styles for the component */
    static styles?: string | string[];

    protected static extendStyles(...extra: string[]): string[] {
        const parentClass = Object.getPrototypeOf(this) as typeof Component;
        const parentStyles = parentClass.styles
            ? Array.isArray(parentClass.styles) ? parentClass.styles : [parentClass.styles]
            : [];
        return [...parentStyles, ...extra];
    }

    afterRender?(): void;

    private static toKebabCase(str: string): string {
        return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    }

    private static resolveDesiredTagName(ctor: typeof Component): string {
        const explicitTag = Component.normalizeExplicitTag(
            ctor,
            resolveDecoratedCustomElementTag(ctor),
            "@CustomElement(...)",
        );
        if (explicitTag) {
            return explicitTag;
        }

        const normalizedName = Component.toKebabCase(ctor.name)
            .replace(/[^a-z0-9._-]/g, "-")
            .replace(/^-+|-+$/g, "") || "component";

        return `x-${normalizedName}`;
    }

    private static normalizeExplicitTag(
        ctor: typeof Component,
        explicitTag: string | undefined,
        source: "@CustomElement(...)",
    ): string | undefined {
        if (!explicitTag) {
            return undefined;
        }

        const normalizedExplicitTag = explicitTag.trim().toLowerCase();
        if (/^[a-z][a-z0-9._-]*-[a-z0-9._-]+$/.test(normalizedExplicitTag)) {
            return normalizedExplicitTag;
        }

        console.warn(
            `${ctor.name} has invalid ${source} "${explicitTag}". Falling back to generated tag.`,
        );
        return undefined;
    }
}

function applyDecoratedCustomElementTag(
    ctor: MainzComponentConstructor,
    tagName: string,
): void {
    ctor[COMPONENT_CUSTOM_ELEMENT_TAG] = tagName;
}

function applyDecoratedRenderStrategy(
    ctor: MainzComponentConstructor,
    config: ComponentRenderConfig,
): void {
    ctor[COMPONENT_RENDER_STRATEGY] = config;
}

function resolveDecoratedCustomElementTag(
    ctor: MainzComponentConstructor,
): string | undefined {
    const tagName = ctor[COMPONENT_CUSTOM_ELEMENT_TAG]?.trim();
    return tagName ? tagName : undefined;
}

export function resolveComponentRenderStrategy(
    componentCtor: object,
): RenderStrategy | undefined {
    return resolveComponentRenderConfig(componentCtor)?.strategy;
}

export function resolveComponentRenderConfig(
    componentCtor: object,
): ComponentRenderConfig | undefined {
    const componentOwner = componentCtor as { [COMPONENT_RENDER_STRATEGY]?: ComponentRenderConfig };
    return componentOwner[COMPONENT_RENDER_STRATEGY];
}

function warnAboutMissingLoadFallback(
    componentCtor: object,
    renderConfig: ComponentRenderConfig,
): void {
    if (renderConfig.strategy !== "deferred" && renderConfig.strategy !== "client-only") {
        return;
    }

    if (
        renderConfig.fallback !== undefined ||
        warnedMissingLoadFallbackComponents.has(componentCtor)
    ) {
        return;
    }

    const componentName = resolveComponentName(componentCtor);
    console.warn(
        `Component "${componentName}" uses @RenderStrategy("${renderConfig.strategy}") without a fallback. ` +
            "Add a fallback to make the component's async placeholder explicit.",
    );
    warnedMissingLoadFallbackComponents.add(componentCtor);
}

function resolveComponentLoadEnvironment(): {
    renderMode: RenderMode;
    runtime: ResourceRuntime;
} {
    return {
        renderMode: resolveMainzRenderMode(),
        runtime: resolveMainzRuntime(),
    };
}

function shouldWaitForClientRuntime(
    strategy: RenderStrategy,
    environment: { renderMode: RenderMode; runtime: ResourceRuntime },
): boolean {
    return environment.renderMode === "ssg" &&
        environment.runtime === "build" &&
        (strategy === "deferred" || strategy === "client-only");
}

function resolveMainzRenderMode(): RenderMode {
    if (typeof __MAINZ_RENDER_MODE__ !== "undefined") {
        return __MAINZ_RENDER_MODE__;
    }

    const fromGlobal = (globalThis as Record<string, unknown>).__MAINZ_RENDER_MODE__;
    return fromGlobal === "ssg" ? "ssg" : "csr";
}

function resolveMainzRuntime(): ResourceRuntime {
    if (typeof __MAINZ_RUNTIME_ENV__ !== "undefined") {
        return __MAINZ_RUNTIME_ENV__;
    }

    const fromGlobal = (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__;
    return fromGlobal === "build" ? "build" : "client";
}

function stableSerializeForLoadKey(
    value: unknown,
    seen = new WeakSet<object>(),
): string {
    if (value === null) {
        return "null";
    }

    if (value === undefined) {
        return '"[undefined]"';
    }

    if (typeof value === "string") {
        return JSON.stringify(value);
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    if (typeof value === "bigint") {
        return `"${value.toString()}n"`;
    }

    if (typeof value === "symbol") {
        return JSON.stringify(value.toString());
    }

    if (typeof value === "function") {
        return JSON.stringify("[function]");
    }

    if (value instanceof Date) {
        return JSON.stringify(value.toISOString());
    }

    if (typeof Node !== "undefined" && value instanceof Node) {
        return JSON.stringify(`[node:${value.nodeType}]`);
    }

    if (Array.isArray(value)) {
        return `[${value.map((entry) => stableSerializeForLoadKey(entry, seen)).join(",")}]`;
    }

    if (typeof value !== "object") {
        return JSON.stringify(String(value));
    }

    if (seen.has(value)) {
        return JSON.stringify("[circular]");
    }

    seen.add(value);
    const entries = Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) =>
            `${JSON.stringify(key)}:${stableSerializeForLoadKey(entryValue, seen)}`
        );
    seen.delete(value);
    return `{${entries.join(",")}}`;
}

function normalizeComponentRenderValue(value: unknown): HTMLElement | DocumentFragment {
    if (value instanceof DocumentFragment) {
        return value;
    }

    if (value instanceof HTMLElement) {
        return value;
    }

    if (value instanceof Node) {
        const fragment = document.createDocumentFragment();
        fragment.appendChild(value);
        return fragment;
    }

    if (value == null || value === false) {
        return document.createDocumentFragment();
    }

    const textNode = document.createTextNode(String(value));
    const fragment = document.createDocumentFragment();
    fragment.appendChild(textNode);
    return fragment;
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
    return typeof (value as Promise<T> | undefined)?.then === "function";
}

function resolveComponentName(componentCtor: object): string {
    const candidate = componentCtor as { name?: string };
    return candidate.name || "AnonymousComponent";
}

function elementTagName(element: Element): string {
    if (element instanceof HTMLElement) {
        return element.tagName;
    }

    return element.localName;
}
