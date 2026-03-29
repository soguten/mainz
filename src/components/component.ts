import {
    resolveComponentAuthorization,
} from "../authorization/index.ts";
import {
    createAnonymousPrincipal,
    evaluateAuthorizationRequirement,
    readAuthorizationRuntimeOptions,
} from "../authorization/runtime.ts";
import {
    getCurrentAuthorizationRenderContext,
    popAuthorizationRenderContext,
    pushAuthorizationRenderContext,
    resolveAuthorizationRenderContextFromProps,
    type AuthorizationRenderContext,
} from "../authorization/render-context.ts";
import { DefaultProps, DefaultState } from "./types.ts";
import { popRenderOwner, pushRenderOwner } from "../jsx/render-owner.ts";
import {
    resolveComponentRenderConfig,
    resolveDecoratedCustomElementTag,
    type ComponentRenderConfig,
    type RenderStrategyOptions,
} from "./component-metadata.ts";
import {
    isAbortLikeError,
    isPromiseLike,
    resolveComponentLoadEnvironment,
    stableSerializeForLoadKey,
    shouldWaitForClientRuntime,
} from "./component-load.ts";
import {
    elementTagName,
    isDocumentFragmentLike,
    isElementLike,
    isHtmlElementLike,
    isNodeLike,
    normalizeComponentRenderValue,
} from "./component-dom.ts";
import {
    pruneDetachedEventListeners,
    syncManagedDOMEvents,
    type TrackedEventListener,
    unregisterEventsByTargetAndType,
    unregisterSpecificEvent,
} from "./component-events.ts";
import {
    buildNodeLookupKey,
    getNodeKey,
    isSameNodeType,
    patchChildNodeList,
    syncAttributes,
    syncProperties,
    toRenderedNodes,
} from "./component-patching.ts";
import { warnAboutMissingLoadFallback } from "./component-render-strategy-guardrails.ts";
import {
    attachServiceContainer,
    getCurrentServiceContainer,
    popCurrentServiceContainer,
    pushCurrentServiceContainer,
    readServiceContainer,
} from "../di/context.ts";
import type { ServiceContainer } from "../di/container.ts";

export {
    CustomElement,
    RenderStrategy,
    resolveComponentRenderConfig,
    resolveComponentRenderStrategy,
} from "./component-metadata.ts";
export type { ComponentRenderConfig, RenderStrategyOptions } from "./component-metadata.ts";

const HTMLElementBase = (globalThis.HTMLElement ?? class {}) as typeof HTMLElement;

export interface ComponentLoadContext {
    signal: AbortSignal;
}

interface ComponentLoadState<Data = unknown> {
    status: "idle" | "loading" | "resolved" | "rejected";
    data?: Data;
    error?: unknown;
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
    private authorizationRenderContext?: AuthorizationRenderContext;
    private serviceContainer?: ServiceContainer;
    private suppressUnauthorizedRender = false;
    private componentLoadState: ComponentLoadState<Data> = {
        status: "idle",
    };
    private activeLoadRequestId = 0;
    private activeLoadController?: AbortController;
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
        const serviceContainer = this.resolveServiceContainer();
        this.serviceContainer = serviceContainer;
        attachServiceContainer(this, serviceContainer);
        pushCurrentServiceContainer(serviceContainer);

        try {
            this.onMount?.();
        } finally {
            popCurrentServiceContainer();
        }
    }

    /**
     * Called when the component is removed from the DOM.
     * Removes event listeners and triggers the `onUnmount` lifecycle method, if defined.
     */
    disconnectedCallback() {
        this.abortActiveComponentLoad();
        this.componentLoadState = {
            status: "idle",
        };
        this.asyncLoadKey = undefined;
        pushCurrentServiceContainer(this.serviceContainer);

        try {
            this.onUnmount?.();
        } finally {
            popCurrentServiceContainer();
        }

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

    load?(context: ComponentLoadContext): Data | Promise<Data>;

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
            const s = this.ownerDocument.createElement("style");
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
        const authorizationRenderContext = this.resolveAuthorizationRenderContext();
        const serviceContainer = this.resolveServiceContainer();
        this.authorizationRenderContext = authorizationRenderContext;
        this.serviceContainer = serviceContainer;
        attachServiceContainer(this, serviceContainer);
        this.suppressUnauthorizedRender = this.shouldSuppressUnauthorizedRender();
        if (!this.suppressUnauthorizedRender) {
            this.prepareComponentLoad();
        }
        pushAuthorizationRenderContext(authorizationRenderContext);
        pushCurrentServiceContainer(serviceContainer);
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
            popCurrentServiceContainer();
            popAuthorizationRenderContext();
        }
    }

    private resolveRenderedTree(): HTMLElement | DocumentFragment {
        if (this.suppressUnauthorizedRender) {
            return this.ownerDocument.createDocumentFragment();
        }

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

    private shouldSuppressUnauthorizedRender(): boolean {
        const authorization = resolveComponentAuthorization(this.constructor);
        if (!authorization) {
            return false;
        }

        const environment = resolveComponentLoadEnvironment();
        if (environment.renderMode === "ssg" && environment.runtime === "build") {
            throw new Error(
                `Component "${this.constructor.name}" uses @Authorize(...) and cannot be rendered during SSG. ` +
                    "Protected component content must not appear in shared prerender output.",
            );
        }

        const authorizationContext = this.authorizationRenderContext;
        const principal = authorizationContext?.principal ?? createAnonymousPrincipal();
        const authorizationRuntime = readAuthorizationRuntimeOptions();
        const requirementDecision = evaluateAuthorizationRequirement({
            principal,
            requirement: authorization.requirement,
            policies: authorizationRuntime?.policies,
        });

        if (requirementDecision instanceof Promise) {
            throw new Error(
                `Component "${this.constructor.name}" authorization policies must resolve synchronously during component render.`,
            );
        }

        return !requirementDecision;
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
        this.abortActiveComponentLoad();

        const requestId = ++this.activeLoadRequestId;
        const controller = new AbortController();
        this.activeLoadController = controller;
        this.applyComponentLoadState({
            status: "loading",
            data: undefined,
            error: undefined,
        });

        let loadResult: Data | Promise<Data>;
        try {
            const serviceContainer = this.resolveServiceContainer();
            this.serviceContainer = serviceContainer;
            attachServiceContainer(this, serviceContainer);
            pushCurrentServiceContainer(serviceContainer);
            loadResult = this.load!({
                signal: controller.signal,
            });
        } catch (error) {
            if (isAbortLikeError(error) || controller.signal.aborted) {
                return;
            }

            this.asyncLoadKey = loadKey;
            this.applyComponentLoadState({
                status: "rejected",
                data: undefined,
                error,
            }, true);
            return;
        } finally {
            popCurrentServiceContainer();
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
                if (requestId !== this.activeLoadRequestId || controller.signal.aborted) {
                    return;
                }

                if (this.activeLoadController === controller) {
                    this.activeLoadController = undefined;
                }
                this.asyncLoadKey = loadKey;
                this.applyComponentLoadState({
                    status: "resolved",
                    data,
                    error: undefined,
                }, true);
            })
            .catch((error) => {
                if (requestId !== this.activeLoadRequestId || controller.signal.aborted) {
                    return;
                }

                if (isAbortLikeError(error)) {
                    return;
                }

                if (this.activeLoadController === controller) {
                    this.activeLoadController = undefined;
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

    private abortActiveComponentLoad(): void {
        if (!this.activeLoadController) {
            return;
        }

        this.activeLoadController.abort();
        this.activeLoadController = undefined;
        this.activeLoadRequestId += 1;
    }

    private computeComponentLoadKey(): string {
        return stableSerializeForLoadKey(
            this.props ?? null,
            (value): value is Node => isNodeLike(value, this.ownerDocument),
        );
    }

    private resolveAuthorizationRenderContext(): AuthorizationRenderContext {
        const fromProps = resolveAuthorizationRenderContextFromProps(this.props);
        if (fromProps) {
            return fromProps;
        }

        return getCurrentAuthorizationRenderContext() ??
            this.authorizationRenderContext ??
            {};
    }

    private resolveServiceContainer(): ServiceContainer | undefined {
        const fromRoute = typeof this.props === "object" && this.props !== null && "route" in this.props
            ? readServiceContainer(
                (this.props as Record<string, unknown>).route as object | null | undefined,
            )
            : undefined;

        return fromRoute ??
            this.serviceContainer ??
            readServiceContainer(this) ??
            getCurrentServiceContainer();
    }

    private requireLoadRenderConfig(): ComponentRenderConfig {
        const renderConfig = resolveComponentRenderConfig(this.constructor);
        if (renderConfig) {
            return renderConfig;
        }

        return {
            strategy: "blocking",
        };
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
                return normalizeComponentRenderValue(
                    resolvedFallback,
                    this.ownerDocument,
                );
            }
        } else if (renderConfig.fallback !== undefined) {
            return normalizeComponentRenderValue(
                renderConfig.fallback,
                this.ownerDocument,
            );
        }

        return this.ownerDocument.createDocumentFragment();
    }

    private resolveComponentLoadErrorFallback(
        renderConfig: ComponentRenderConfig,
        error: unknown,
    ): HTMLElement | DocumentFragment {
        if (typeof renderConfig.errorFallback === "function") {
            const resolvedErrorFallback = renderConfig.errorFallback(error);
            if (resolvedErrorFallback !== undefined) {
                return normalizeComponentRenderValue(
                    resolvedErrorFallback,
                    this.ownerDocument,
                );
            }

            return this.resolveComponentLoadFallback(renderConfig);
        }

        if (renderConfig.errorFallback !== undefined) {
            return normalizeComponentRenderValue(
                renderConfig.errorFallback,
                this.ownerDocument,
            );
        }

        return this.resolveComponentLoadFallback(renderConfig);
    }

    private patchNode(current: Node, next: Node): Node {
        if (!this.isSameNodeType(current, next)) {
            (current as ChildNode).replaceWith(next);
            return next;
        }

        if (current.nodeType === 3 && next.nodeType === 3) {
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

        if (
            isHtmlElementLike(current, this.ownerDocument) &&
            isHtmlElementLike(next, this.ownerDocument)
        ) {
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
        return patchChildNodeList({
            parent,
            currentChildren,
            nextChildren,
            getNodeKey: (node) => this.getNodeKey(node),
            buildNodeLookupKey: (node, key) => this.buildNodeLookupKey(node, key),
            patchNode: (current, next) => this.patchNode(current, next),
        });
    }

    private toRenderedNodes(rendered: HTMLElement | DocumentFragment): Node[] {
        return toRenderedNodes(rendered, this.ownerDocument);
    }

    private syncAttributes(current: HTMLElement, next: HTMLElement) {
        syncAttributes(current, next);
        this.syncProperties(current, next);
    }

    private syncProperties(current: HTMLElement, next: HTMLElement) {
        syncProperties(current, next, this.ownerDocument);
    }

    private syncManagedDOMEvents(current: HTMLElement, next: HTMLElement) {
        syncManagedDOMEvents({
            current,
            next,
            registerEvent: (target, type, listener, options) =>
                this.registerEvent(target, type, listener, options),
            unregisterSpecificEvent: (target, event) =>
                this.unregisterSpecificEvent(target, event),
        });
    }

    private unregisterSpecificEvent(
        target: EventTarget,
        event: {
            type: string;
            listener: EventListenerOrEventListenerObject;
            options?: boolean;
        },
    ) {
        this.eventListeners = unregisterSpecificEvent({
            target,
            event,
            eventListeners: this.eventListeners,
        });
    }

    private unregisterEventsByTargetAndType(
        target: EventTarget,
        type: string,
        options: boolean,
    ) {
        this.eventListeners = unregisterEventsByTargetAndType({
            target,
            type,
            options,
            eventListeners: this.eventListeners,
        });
    }

    private pruneDetachedEventListeners() {
        this.eventListeners = pruneDetachedEventListeners({
            host: this,
            ownerDocument: this.ownerDocument,
            eventListeners: this.eventListeners,
        });
    }

    private getNodeKey(node: Node): string | null {
        return getNodeKey(node, this.ownerDocument);
    }

    private buildNodeLookupKey(node: Node, key: string): string {
        return buildNodeLookupKey(node, key, this.ownerDocument);
    }

    private isSameNodeType(current: Node, next: Node) {
        return isSameNodeType(current, next, this.ownerDocument);
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
