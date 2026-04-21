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
    type RouteContext,
    type RouteProfileContext,
} from "./route-context.ts";
import type { PageRouteParams } from "./page-contract.ts";
import type { NavigationMode, RenderMode } from "../routing/types.ts";
import type { RenderPolicy } from "../resources/resource.ts";

export {
    CustomElement,
    RenderPolicy,
    RenderStrategy,
    resolveComponentRenderConfig,
    resolveComponentRenderPolicy,
    resolveComponentRenderStrategy,
} from "./component-metadata.ts";
export type {
    ComponentRenderConfig,
    ComponentRenderPolicy,
    ComponentRenderStrategy,
} from "./component-metadata.ts";

/**
 * Runtime base class used by Mainz components.
 *
 * This falls back to an empty class in environments where `HTMLElement` is not available during
 * type analysis or server-side execution.
 */
export const ComponentElementBase =
    (globalThis.HTMLElement ?? class {}) as typeof HTMLElement;

/**
 * Context object passed to `Component.load()`.
 *
 * This carries the current request, route, and runtime metadata available while Mainz resolves
 * lifecycle data for a component.
 *
 * @template Props The props type associated with the component being loaded.
 */
export interface ComponentLoadContext<Props = DefaultProps> {
    /** Abort signal for the current lifecycle load operation. */
    signal: AbortSignal;
    /** Current component props, when available during the load phase. */
    props?: Props;
    /** Active route context for the owning page or route subtree. */
    route?: RouteContext;
    /** Current requested path. */
    path?: string;
    /** Current matched route path. */
    matchedPath?: string;
    /** Current route params. */
    params?: PageRouteParams;
    /** Resolved locale for the active route, when present. */
    locale?: string;
    /** Fully resolved URL for the current route. */
    url?: URL;
    /** Page render mode active for the current request. */
    renderMode?: RenderMode;
    /** Navigation mode active for the current request. */
    navigationMode?: NavigationMode;
    /** Resolved principal associated with the current request. */
    principal?: Principal;
    /** Active route profile metadata, when available. */
    profile?: RouteProfileContext;
    /** Runtime-specific resource helpers associated with the current request. */
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
/**
 * Positional arguments passed into `Component.render()`.
 *
 * Components without resolved lifecycle data receive no arguments.
 * Components with resolved data receive a single `data` argument.
 *
 * @template Data The lifecycle data type resolved by `load()`.
 */
export type PublicComponentRenderArgs<Data = unknown> = [] | [data: Data];

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
> extends ComponentElementBase {
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

    /** Initializes component state once before the first render. */
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

    /**
     * Registers a DOM event listener that should participate in Mainz-managed cleanup.
     */
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

    /** Resolves the concrete tree that should be committed for the current render pass. */
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

    /** Determines whether protected content should be hidden for the current principal. */
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

    /** Prepares async component loading for the current render pass when needed. */
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

    /** Starts a new async component load request for the current props and route context. */
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

    /** Applies a new async load state and optionally re-renders the component. */
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

    /** Aborts the active async load request, if one is in flight. */
    private abortActiveComponentLoad(): void {
        if (!this.activeLoadController) {
            return;
        }

        this.activeLoadController.abort();
        this.activeLoadController = undefined;
        this.activeLoadRequestId += 1;
    }

    /** Computes the stable cache key for the current async load inputs. */
    private computeComponentLoadKey(): string {
        return stableSerializeForLoadKey(
            {
                props: this.props ?? null,
                route: this.toSerializableRouteContext(this.resolveComponentRouteContext()),
            },
            (value): value is Node => isNodeLike(value, this.ownerDocument),
        );
    }

    /** Resolves the authorization context visible to this component render. */
    private resolveAuthorizationRenderContext(): AuthorizationRenderContext {
        const fromProps = resolveAuthorizationRenderContextFromProps(this.props);
        if (fromProps) {
            return fromProps;
        }

        return getCurrentAuthorizationRenderContext() ??
            this.authorizationRenderContext ??
            {};
    }

    /** Resolves the service container available to this component instance. */
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

    /** Returns the effective render configuration for this component constructor. */
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

    /** Indicates whether this component participates in the async load lifecycle. */
    private hasComponentLoad(): boolean {
        return this.participatesInComponentLoad() && typeof this.load === "function";
    }

    /** Controls whether Mainz should consider `load()` for this component type. */
    protected participatesInComponentLoad(): boolean {
        return true;
    }

    /** Resolves the nearest route context associated with this component subtree. */
    private resolveComponentRouteContext(): RouteContext | undefined {
        const fromProps = this.readRouteContextFromValue(this.props);
        if (fromProps) {
            return fromProps;
        }

        return this.findAncestorRouteContext();
    }

    /** Walks ancestor nodes to find an inherited route context. */
    private findAncestorRouteContext(): RouteContext | undefined {
        let current: Node | null = this.parentNode;

        while (current) {
            if (current instanceof ComponentElementBase) {
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

    /** Reads a route context from a props-like object when one is present. */
    private readRouteContextFromValue(value: unknown): RouteContext | undefined {
        if (typeof value !== "object" || value === null) {
            return undefined;
        }

        const propsRecord = value as Record<string, unknown>;
        return isRouteContext(propsRecord.route) ? propsRecord.route : undefined;
    }

    /** Converts a route context into a stable serializable structure for load keys. */
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

    /** Resolves placeholder output for pending async component loading. */
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

    /** Resolves output for policy-driven render branches such as SSG restrictions. */
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

    /** Renders the component once all required lifecycle data is available. */
    private renderResolvedOutput(): HTMLElement | DocumentFragment {
        if (this.shouldPassResolvedDataToRender()) {
            return this.render(this.data);
        }

        return this.render();
    }

    /** Indicates whether resolved lifecycle data should be passed into `render()`. */
    private shouldPassResolvedDataToRender(): boolean {
        return typeof this.load === "function";
    }

    /** Resolves fallback output for rejected async component loading. */
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

    /** Patches a single rendered node against its next rendered counterpart. */
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

    /** Patches the child list of a rendered element. */
    private patchChildren(current: Element, next: Element): void {
        this.patchChildNodeList(
            current,
            Array.from(current.childNodes),
            Array.from(next.childNodes),
        );
    }

    /** Patches a node list using Mainz's keyed child diffing strategy. */
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

    /** Synchronizes rendered portal markers with their resolved target containers. */
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

    /** Collects portal markers from the current rendered node set. */
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

    /** Cleans up all active portal entries owned by this component. */
    private cleanupPortalEntries(): void {
        for (const entry of this.portalEntries.values()) {
            this.cleanupPortalEntry(entry);
        }

        this.portalEntries.clear();
    }

    /** Removes a previously rendered portal entry from its target. */
    private cleanupPortalEntry(entry: ComponentPortalEntry): void {
        for (const node of entry.nodes) {
            if (node.parentNode === entry.target) {
                entry.target.removeChild(node);
            }
        }
    }

    /** Normalizes rendered output into a concrete node list for patching. */
    private toRenderedNodes(rendered: HTMLElement | DocumentFragment): Node[] {
        return toRenderedNodes(rendered, this.ownerDocument);
    }

    /** Synchronizes DOM attributes and derived properties between two elements. */
    private syncAttributes(current: Element, next: Element): void {
        syncAttributes(current, next);
        this.syncProperties(current, next);
    }

    /** Synchronizes DOM properties between two rendered elements. */
    private syncProperties(current: Element, next: Element): void {
        syncProperties(current, next, this.ownerDocument);
    }

    /** Synchronizes managed DOM event registrations between two rendered elements. */
    private syncManagedDOMEvents(current: Element, next: Element): void {
        syncManagedDOMEvents({
            current,
            next,
            registerEvent: (target, type, listener, options) =>
                this.registerEvent(target, type, listener, options),
            unregisterSpecificEvent: (target, event) => this.unregisterSpecificEvent(target, event),
        });
    }

    /** Unregisters a single managed DOM event listener from the tracked set. */
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

    /** Unregisters managed listeners that match a target, type, and options tuple. */
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

    /** Prunes tracked listeners whose target nodes are no longer retained. */
    private pruneDetachedEventListeners(): void {
        this.eventListeners = pruneDetachedEventListeners({
            host: this,
            ownerDocument: this.ownerDocument,
            eventListeners: this.eventListeners,
            retainedNodes: this.getPortalRetainedNodes(),
        });
    }

    /** Returns the portal-rendered nodes that should be retained during listener pruning. */
    private getPortalRetainedNodes(): Node[] {
        return Array.from(this.portalEntries.values()).flatMap((entry) => entry.nodes);
    }

    /** Returns the diffing key associated with a rendered node, when present. */
    private getNodeKey(node: Node): string | null {
        return getNodeKey(node, this.ownerDocument);
    }

    /** Builds the internal lookup key used by keyed child diffing. */
    private buildNodeLookupKey(node: Node, key: string): string {
        return buildNodeLookupKey(node, key, this.ownerDocument);
    }

    /** Determines whether two nodes can be patched in place instead of replaced. */
    private isSameNodeType(current: Node, next: Node): boolean {
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
    abstract render(...args: PublicComponentRenderArgs<Data>): HTMLElement | DocumentFragment;

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

    /** Appends styles to the inherited static style list of a component subclass. */
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

    /** Converts a PascalCase or camelCase class name into kebab-case. */
    private static toKebabCase(str: string): string {
        return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    }

    /** Resolves the final custom-element tag name for a component constructor. */
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

    /** Normalizes and validates an explicitly configured custom-element tag name. */
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
