import { resolveComponentAuthorization } from "../authorization/index.ts";
import type { Principal } from "../authorization/index.ts";
import {
    createAnonymousPrincipal,
    evaluateAuthorizationRequirement,
    readAuthorizationRuntimeOptions,
} from "../authorization/runtime.ts";
import {
    type AuthorizationRenderContext,
    getCurrentAuthorizationRenderContext,
    popAuthorizationRenderContext,
    pushAuthorizationRenderContext,
    resolveAuthorizationRenderContextFromProps,
} from "../authorization/render-context.ts";
import { DefaultProps, DefaultState } from "./types.ts";
import { popRenderOwner, pushRenderOwner } from "../jsx/render-owner.ts";
import {
    type ComponentRenderConfig,
    resolveComponentRenderConfig,
    resolveDecoratedCustomElementTag,
} from "./component-metadata.ts";
import {
    isAbortLikeError,
    isPromiseLike,
    isSsgBuildEnvironment,
    resolveComponentLoadEnvironment,
    shouldApplyRenderPolicyInSsgBuild,
    shouldWaitForClientRuntime,
    stableSerializeForLoadKey,
} from "./component-load.ts";
import {
    elementTagName,
    isDocumentFragmentLike,
    isElementLike,
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
import {
    getPortalDescriptor,
    isPortalMarkerNode,
    type PortalMarkerNode,
    resolvePortalTarget,
    syncPortalMarkerNode,
    toPortalRenderedNodes,
} from "../portal/index.ts";
import { warnAboutMissingLoadPlaceholder } from "./component-render-strategy-guardrails.ts";
import {
    attachServiceContainer,
    getCurrentServiceContainer,
    popCurrentServiceContainer,
    pushCurrentServiceContainer,
    readServiceContainer,
} from "../di/context.ts";
import type { ServiceContainer } from "../di/container.ts";
import {
    isRouteContext,
    type PageRouteParams,
    type RouteContext,
    type RouteProfileContext,
} from "./route-context.ts";
import type { NavigationMode, RenderMode } from "../routing/types.ts";
import type { RenderPolicy } from "../resources/index.ts";

export {
    CustomElement,
    RenderPolicy,
    RenderStrategy,
    resolveComponentRenderConfig,
    resolveComponentRenderPolicy,
    resolveComponentRenderStrategy,
} from "./component-metadata.ts";
export type { ComponentRenderConfig } from "./component-metadata.ts";

const HTMLElementBase = (globalThis.HTMLElement ?? class {}) as typeof HTMLElement;

export interface ComponentLoadContext<Props = DefaultProps> {
    signal: AbortSignal;
    props?: Props;
    route?: RouteContext;
    path?: string;
    matchedPath?: string;
    params?: PageRouteParams;
    locale?: string;
    url?: URL;
    renderMode?: RenderMode;
    navigationMode?: NavigationMode;
    principal?: Principal;
    profile?: RouteProfileContext;
    resources?: unknown;
}

interface ComponentLoadState<Data = unknown> {
    status: "idle" | "loading" | "resolved" | "rejected";
    data?: Data;
    error?: unknown;
}

interface ComponentPortalEntry {
    nodes: Node[];
    target: HTMLElement;
}

type ComponentRenderArgs<Data = unknown> = [] | [data: Data];

/**
 * Base class for Mainz components.
 *
 * `Component` is the primary base class for stateful and lifecycle-aware Mainz components.
 * A component can:
 *
 * - receive caller-provided `props`
 * - own local `state`
 * - optionally resolve lifecycle `data` through `load()`
 * - render visible output through `render()`
 * - provide async placeholder and error UI through `placeholder()` and `error()`
 *
 * `Component` uses the generic order `Component<Props, State, Data>`.
 *
 * Common shapes:
 *
 * - use `NoProps` when the component should not accept props
 * - use `ChildrenOnlyProps` when the component accepts only JSX children
 * - use `NoState` when the component does not keep local mutable state
 *
 * In Mainz's public model:
 *
 * - `props` are external inputs
 * - `state` is local UI state
 * - `data` is resolved lifecycle data returned by `load()`
 *
 * @template Props The type for the component's props.
 * @template State The type for the component's local state.
 * @template Data The lifecycle data resolved by `load()`.
 */
export abstract class Component<
    Props = DefaultProps,
    State = DefaultState,
    Data = unknown,
    LoadContext extends ComponentLoadContext<Props> = ComponentLoadContext<Props>,
> extends HTMLElementBase {
    private static tagNameCache = new WeakMap<typeof Component, string>();
    private static tagOwners = new Map<string, typeof Component>();
    private static tagSuffixCounter = 0;

    /** The properties of the component */
    props: Props = {} as Props;

    /** The state of the component */
    state: State = {} as State;

    /**
     * The active route context for this component subtree.
     * Available automatically for routed pages and their descendants.
     */
    get route(): RouteContext {
        const route = this.resolveComponentRouteContext();
        if (!route) {
            throw new Error(
                `Component "${this.constructor.name}" is not attached to an active route context.`,
            );
        }

        return route;
    }

    /** Stores registered event listeners for cleanup */
    private eventListeners: TrackedEventListener[] = [];

    private styleInjected = false;
    private renderedNodes: Node[] = [];
    private portalEntries = new Map<PortalMarkerNode, ComponentPortalEntry>();
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
        this.ensureStateInitialized();
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
        this.cleanupPortalEntries();
    }

    /**
     * Returns the initial local state for this component.
     *
     * Mainz calls `initState()` once, before the first render, when the component has not already
     * received state from some external initializer.
     *
     * Use this hook for synchronous state bootstrap.
     * Prefer `initState()` over `onMount()` when the initial render depends on local state.
     */
    protected initState?(): State;

    private ensureStateInitialized(): void {
        if (this.stateInitialized) {
            return;
        }

        const hasPreloadedState = Object.keys(this.state ?? {}).length > 0;

        if (!hasPreloadedState && this.initState) {
            this.state = this.initState();
        }

        this.stateInitialized = true;
    }

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

        this.ensureStateInitialized();
        this.renderDOM();
    }

    /**
     * Resolves the lifecycle data for this component.
     *
     * When present, `load()` becomes the source of the component's `Data` value.
     * Mainz may run it during initial render, during prop-driven rerenders, or in other
     * render-environment transitions that require fresh component data.
     *
     * Use `load()` for data that belongs to the component's render lifecycle.
     * Keep `props` for caller-provided input and `state` for local mutable UI state.
     */
    load?(context: LoadContext): Data | Promise<Data>;
    /**
     * Returns placeholder UI while async component loading is pending.
     */
    placeholder?(): HTMLElement | DocumentFragment | unknown;
    /**
     * Returns error UI for rejected async component loading.
     * Returning `undefined` falls back to `placeholder()`.
     */
    error?(error: unknown): HTMLElement | DocumentFragment | unknown;

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
                this.syncPortalEntries();
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
                this.syncPortalEntries();
                this.pruneDetachedEventListeners();
                this.afterRender?.();
                return;
            }

            this.renderedNodes = this.patchChildNodeList(
                this,
                this.renderedNodes,
                nextNodes,
            );
            this.syncPortalEntries();
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

        const renderConfig = this.requireRenderConfig();
        const environment = resolveComponentLoadEnvironment();
        if (shouldApplyRenderPolicyInSsgBuild(renderConfig.policy, environment)) {
            return this.resolvePolicyDrivenTree(renderConfig.policy);
        }

        if (!this.hasComponentLoad()) {
            return this.renderResolvedOutput();
        }

        if (this.componentLoadState.status === "resolved") {
            return this.renderResolvedOutput();
        }

        if (this.componentLoadState.status === "rejected") {
            return this.resolveComponentLoadErrorFallback(
                renderConfig,
                this.componentLoadState.error,
            );
        }

        return this.resolveComponentLoadFallback(renderConfig);
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

        const renderConfig = this.requireRenderConfig();
        const environment = resolveComponentLoadEnvironment();

        if (
            renderConfig.policy === "forbidden-in-ssg" &&
            isSsgBuildEnvironment(environment)
        ) {
            throw new Error(
                `Component "${this.constructor.name}" uses @RenderPolicy("forbidden-in-ssg") and cannot be rendered during SSG.`,
            );
        }

        if (
            shouldApplyRenderPolicyInSsgBuild(renderConfig.policy, environment) &&
            (renderConfig.policy === "placeholder-in-ssg" || renderConfig.policy === "hide-in-ssg")
        ) {
            this.applyComponentLoadState({
                status: "idle",
                data: undefined,
                error: undefined,
            });
            return;
        }

        if (shouldWaitForClientRuntime(renderConfig.strategy, environment)) {
            warnAboutMissingLoadPlaceholder(this.constructor, renderConfig);
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
                props: this.props,
                route: this.resolveComponentRouteContext(),
            } as LoadContext);
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
            {
                props: this.props ?? null,
                route: this.toSerializableRouteContext(this.resolveComponentRouteContext()),
            },
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
        const fromRoute =
            typeof this.props === "object" && this.props !== null && "route" in this.props
                ? readServiceContainer(
                    (this.props as Record<string, unknown>).route as object | null | undefined,
                )
                : undefined;

        return fromRoute ??
            this.serviceContainer ??
            readServiceContainer(this) ??
            getCurrentServiceContainer();
    }

    private requireRenderConfig(): ComponentRenderConfig {
        const renderConfig = resolveComponentRenderConfig(this.constructor);
        if (renderConfig) {
            return renderConfig;
        }

        return {
            strategy: "blocking",
            hasExplicitPolicy: false,
            hasExplicitStrategy: false,
        };
    }

    private hasComponentLoad(): boolean {
        return this.participatesInComponentLoad() && typeof this.load === "function";
    }

    protected participatesInComponentLoad(): boolean {
        return true;
    }

    private resolveComponentRouteContext(): RouteContext | undefined {
        const fromProps = this.readRouteContextFromValue(this.props);
        if (fromProps) {
            return fromProps;
        }

        return this.findAncestorRouteContext();
    }

    private findAncestorRouteContext(): RouteContext | undefined {
        let current: Node | null = this.parentNode;

        while (current) {
            if (current instanceof HTMLElementBase) {
                const element = current as HTMLElement & {
                    props?: unknown;
                };
                const fromProps = this.readRouteContextFromValue(element.props);
                if (fromProps) {
                    return fromProps;
                }
            }

            current = current.parentNode;
        }

        return undefined;
    }

    private readRouteContextFromValue(value: unknown): RouteContext | undefined {
        if (typeof value !== "object" || value === null) {
            return undefined;
        }

        const propsRecord = value as Record<string, unknown>;
        return isRouteContext(propsRecord.route) ? propsRecord.route : undefined;
    }

    private toSerializableRouteContext(
        route: RouteContext | undefined,
    ): Record<string, unknown> | null {
        if (!route) {
            return null;
        }

        return {
            path: route.path,
            matchedPath: route.matchedPath,
            params: route.params,
            locale: route.locale,
            url: route.url.toString(),
            renderMode: route.renderMode,
            navigationMode: route.navigationMode,
            principalId: route.principal?.id,
            profile: route.profile
                ? {
                    name: route.profile.name,
                    basePath: route.profile.basePath,
                    siteUrl: route.profile.siteUrl,
                }
                : undefined,
        };
    }

    private resolveComponentLoadFallback(
        renderConfig: ComponentRenderConfig,
    ): HTMLElement | DocumentFragment {
        if (typeof this.placeholder === "function") {
            const resolvedPlaceholder = this.placeholder();
            if (resolvedPlaceholder !== undefined) {
                return normalizeComponentRenderValue(
                    resolvedPlaceholder,
                    this.ownerDocument,
                );
            }
        }

        return this.ownerDocument.createDocumentFragment();
    }

    private resolvePolicyDrivenTree(
        policy: RenderPolicy | undefined,
    ): HTMLElement | DocumentFragment {
        if (policy === "forbidden-in-ssg") {
            throw new Error(
                `Component "${this.constructor.name}" uses @RenderPolicy("forbidden-in-ssg") and cannot be rendered during SSG.`,
            );
        }

        if (policy === "hide-in-ssg") {
            return this.ownerDocument.createDocumentFragment();
        }

        if (policy === "placeholder-in-ssg") {
            return this.resolveComponentLoadFallback(this.requireRenderConfig());
        }

        if (!this.hasComponentLoad()) {
            return this.renderResolvedOutput();
        }

        return this.ownerDocument.createDocumentFragment();
    }

    private renderResolvedOutput(): HTMLElement | DocumentFragment {
        if (this.shouldPassResolvedDataToRender()) {
            return this.render(this.data);
        }

        return this.render();
    }

    private shouldPassResolvedDataToRender(): boolean {
        return typeof this.load === "function";
    }

    private resolveComponentLoadErrorFallback(
        renderConfig: ComponentRenderConfig,
        error: unknown,
    ): HTMLElement | DocumentFragment {
        if (typeof this.error === "function") {
            const resolvedErrorFallback = this.error(error);
            if (resolvedErrorFallback !== undefined) {
                return normalizeComponentRenderValue(
                    resolvedErrorFallback,
                    this.ownerDocument,
                );
            }

            return this.resolveComponentLoadFallback(renderConfig);
        }

        return this.resolveComponentLoadFallback(renderConfig);
    }

    private patchNode(current: Node, next: Node): Node {
        if (isPortalMarkerNode(current) && isPortalMarkerNode(next)) {
            syncPortalMarkerNode(current, next);
            return current;
        }

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
            isElementLike(current, this.ownerDocument) &&
            isElementLike(next, this.ownerDocument)
        ) {
            this.syncAttributes(current, next);
            this.syncManagedDOMEvents(current, next);
            this.patchChildren(current, next);
            return current;
        }

        return current;
    }

    private patchChildren(current: Element, next: Element) {
        this.patchChildNodeList(
            current,
            Array.from(current.childNodes),
            Array.from(next.childNodes),
        );
    }

    private patchChildNodeList(
        parent: Element,
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

    private syncPortalEntries(): void {
        const nextMarkers = this.collectPortalMarkers();
        const retainedMarkers = new Set(nextMarkers);

        for (const marker of nextMarkers) {
            const descriptor = getPortalDescriptor(marker);
            const target = resolvePortalTarget(this, descriptor);
            const existingEntry = this.portalEntries.get(marker);

            if (!target) {
                if (existingEntry) {
                    this.cleanupPortalEntry(existingEntry);
                    this.portalEntries.delete(marker);
                }
                continue;
            }

            const nextNodes = toPortalRenderedNodes(descriptor.children, this.ownerDocument);
            if (existingEntry && existingEntry.target !== target) {
                this.cleanupPortalEntry(existingEntry);
                this.portalEntries.delete(marker);
            }

            const currentEntry = this.portalEntries.get(marker);
            const currentNodes = currentEntry?.nodes ?? [];
            const patchedNodes = this.patchChildNodeList(target, currentNodes, nextNodes);
            this.portalEntries.set(marker, {
                nodes: patchedNodes,
                target,
            });
        }

        for (const [marker, entry] of this.portalEntries) {
            if (retainedMarkers.has(marker)) {
                continue;
            }

            this.cleanupPortalEntry(entry);
            this.portalEntries.delete(marker);
        }
    }

    private collectPortalMarkers(): PortalMarkerNode[] {
        const markers: PortalMarkerNode[] = [];
        const visit = (node: Node) => {
            if (isPortalMarkerNode(node)) {
                markers.push(node);
                return;
            }

            for (const child of Array.from(node.childNodes)) {
                visit(child);
            }
        };

        for (const renderedNode of this.renderedNodes) {
            visit(renderedNode);
        }

        return markers;
    }

    private cleanupPortalEntries(): void {
        for (const entry of this.portalEntries.values()) {
            this.cleanupPortalEntry(entry);
        }

        this.portalEntries.clear();
    }

    private cleanupPortalEntry(entry: ComponentPortalEntry): void {
        for (const node of entry.nodes) {
            if (node.parentNode === entry.target) {
                entry.target.removeChild(node);
            }
        }
    }

    private toRenderedNodes(rendered: HTMLElement | DocumentFragment): Node[] {
        return toRenderedNodes(rendered, this.ownerDocument);
    }

    private syncAttributes(current: Element, next: Element) {
        syncAttributes(current, next);
        this.syncProperties(current, next);
    }

    private syncProperties(current: Element, next: Element) {
        syncProperties(current, next, this.ownerDocument);
    }

    private syncManagedDOMEvents(current: Element, next: Element) {
        syncManagedDOMEvents({
            current,
            next,
            registerEvent: (target, type, listener, options) =>
                this.registerEvent(target, type, listener, options),
            unregisterSpecificEvent: (target, event) => this.unregisterSpecificEvent(target, event),
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
            retainedNodes: this.getPortalRetainedNodes(),
        });
    }

    private getPortalRetainedNodes(): Node[] {
        return Array.from(this.portalEntries.values()).flatMap((entry) => entry.nodes);
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
     * Returns the visible DOM output for this component.
     *
     * `render()` is the primary view hook for every Mainz component.
     * Implement it as `render()` for synchronous components or `render(data)` when the component
     * owns lifecycle data through `load()`.
     *
     * When the component also defines `load()`, the rendered output may depend on resolved
     * lifecycle data, placeholder UI, or error UI depending on the active render state.
     *
     * @returns {HTMLElement | DocumentFragment} The rendered component element or a fragment.
     */
    abstract render(...args: ComponentRenderArgs<Data>): HTMLElement | DocumentFragment;

    /**
     * Runs after the component is connected to the DOM.
     *
     * Use `onMount()` for imperative work that depends on the component being attached, such as
     * subscriptions, observers, or DOM APIs that require a live node.
     */
    onMount?(): void;

    /**
     * Runs when the component is being removed from the DOM.
     *
     * Use `onUnmount()` to release imperative resources that outlive a single render pass.
     */
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

    /**
     * Runs after Mainz applies the latest rendered DOM output for this component.
     *
     * Use `afterRender()` for post-render coordination that depends on the committed DOM tree.
     * Prefer `render()` for declarative output and `afterRender()` only for imperative follow-up
     * work.
     */
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
