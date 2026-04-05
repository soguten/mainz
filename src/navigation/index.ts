import {
    createPageLoadContext,
    type PageHeadDefinition,
    type PageHeadContext,
    type PageLoadContext,
    type RouteContext,
    type RouteProfileContext,
    requirePageRoutePath,
    resolvePageLocales,
} from "../components/page.ts";
import type { PageAuthorizationMetadata, Principal } from "../authorization/index.ts";
import { resolvePageAuthorization } from "../authorization/index.ts";
import {
    type AuthorizationRuntimeOptions,
    evaluatePageAuthorization,
    findMissingAuthorizationPolicies,
    resolveCurrentPrincipal,
    setAuthorizationRuntimeOptions,
} from "../authorization/runtime.ts";
import { ensureMainzCustomElementDefined } from "../components/registry.ts";
import {
    MAINZ_LOCALE_CHANGE_EVENT,
    MAINZ_NAVIGATION_ABORT_EVENT,
    MAINZ_NAVIGATION_ERROR_EVENT,
    MAINZ_NAVIGATION_READY_EVENT,
    MAINZ_NAVIGATION_START_EVENT,
    type MainzLocaleChangeDetail,
    type MainzNavigationAbortDetail,
    type MainzNavigationErrorDetail,
    type MainzNavigationReadyDetail,
    type MainzNavigationStartDetail,
} from "../runtime-events.ts";
import {
    buildRouteHead,
    resolveLocaleRedirectPath,
    shouldPrefixLocaleForRoute,
    toLocalePathSegment,
} from "../routing/index.ts";
import type { NavigationMode } from "../routing/types.ts";
import { attachServiceContainer, readServiceContainer } from "../di/context.ts";
import { withServiceContainer } from "../di/context.ts";
import {
    createServiceContainer,
    type ServiceContainer,
    type ServiceRegistration,
} from "../di/container.ts";

const MAINZ_SCROLL_KEY_PREFIX = "mainz:scroll:";
const MAINZ_PREFETCH_ATTR = "data-mainz-prefetched";
const MAINZ_ENTERING_TRANSITION_MS = 260;
const MAINZ_HEAD_MANAGED_ATTR = "data-mainz-head-managed";
const MAINZ_APP_DEFINITION_KIND: unique symbol = Symbol("mainz.appDefinitionKind");
const ROUTED_APP_CAPTURE_STACK: Array<(app: RoutedAppDefinition) => void> = [];

export type SpaRouteParams = Readonly<Record<string, string>>;
export type RoutePathResolver = (context: { url: URL; basePath: string }) => string | null;

export interface NavigationLocaleContext {
    locale: string;
    url: URL;
    basePath: string;
}

export interface SpaPageConstructor extends CustomElementConstructor {
    page?: {
        head?: PageHeadDefinition;
        authorization?: PageAuthorizationMetadata;
    };
    getTagName(): string;
    name: string;
}

export type SpaPageModule = SpaPageConstructor | {
    default: SpaPageConstructor;
};

export interface SpaRouteDefinition {
    path: string;
}

export interface SpaPageDefinition {
    page: SpaPageConstructor;
    path?: string;
}

export interface SpaLazyPageDefinition extends SpaRouteDefinition {
    load(): Promise<SpaPageModule>;
}

export interface SpaNavigationRenderContext {
    page: SpaPageConstructor;
    path: string;
    matchedPath: string;
    params: SpaRouteParams;
    principal: Principal;
    authorization?: PageAuthorizationMetadata;
    data?: unknown;
    head?: PageHeadDefinition;
    locale?: string;
    url: URL;
    navigationType: "initial" | "push" | "pop";
    basePath: string;
}

export interface SpaNavigationOptions {
    pages: readonly (SpaPageConstructor | SpaPageDefinition | SpaLazyPageDefinition)[];
    notFound?: SpaPageConstructor | SpaPageDefinition | SpaLazyPageDefinition;
    mount?: string | Element;
    auth?: AuthorizationRuntimeOptions;
    services?: readonly ServiceRegistration[];
    locales?: readonly string[];
    resolvePath?: RoutePathResolver;
    onLocaleChange?(context: NavigationLocaleContext): void;
    onRoute?(context: SpaNavigationRenderContext): void;
    onBeforeRender?(context: SpaNavigationRenderContext): void;
}

export interface StartNavigationOptions {
    mode: NavigationMode;
    basePath?: string;
    mount?: string | Element;
    pages?: readonly (SpaPageConstructor | SpaPageDefinition | SpaLazyPageDefinition)[];
    notFound?: SpaPageConstructor | SpaPageDefinition | SpaLazyPageDefinition;
    auth?: AuthorizationRuntimeOptions;
    services?: readonly ServiceRegistration[];
    locales?: readonly string[];
    resolvePath?: RoutePathResolver;
    onLocaleChange?(context: NavigationLocaleContext): void;
    onRoute?(context: SpaNavigationRenderContext): void;
    onBeforeRender?(context: SpaNavigationRenderContext): void;
    spa?: SpaNavigationOptions;
}

export interface RoutedAppDefinition {
    id: string;
    navigation?: NavigationMode;
    pages: readonly (SpaPageConstructor | SpaPageDefinition | SpaLazyPageDefinition)[];
    notFound?: SpaPageConstructor | SpaPageDefinition | SpaLazyPageDefinition;
    services?: readonly ServiceRegistration[];
}

type RootComponentConstructor = CustomElementConstructor & {
    getTagName(): string;
    name: string;
};

export interface RootAppDefinition {
    id: string;
    root: RootComponentConstructor;
    services?: readonly ServiceRegistration[];
}

export interface DefinedRoutedApp extends RoutedAppDefinition {
    readonly [MAINZ_APP_DEFINITION_KIND]: "routed";
}

export interface DefinedRootApp extends RootAppDefinition {
    readonly [MAINZ_APP_DEFINITION_KIND]: "root";
}

export interface StartDefinedAppOptions {
    mount?: string | Element;
    auth?: AuthorizationRuntimeOptions;
}

export interface NavigationController {
    mode: NavigationMode;
    cleanup(): void;
}

interface NavigationAnchorOptions {
    basePath?: string;
}

interface NormalizedSpaRoute {
    path: string;
    page?: SpaPageConstructor;
    load?: SpaLazyPageDefinition["load"];
}

interface SpaRouteMatch {
    route: NormalizedSpaRoute;
    params: Record<string, string>;
}

interface ResolvedPageNavigationOptions {
    pages: readonly (SpaPageConstructor | SpaPageDefinition | SpaLazyPageDefinition)[];
    notFound?: SpaPageConstructor | SpaPageDefinition | SpaLazyPageDefinition;
    mount?: string | Element;
    auth?: AuthorizationRuntimeOptions;
    services?: readonly ServiceRegistration[];
    serviceContainer?: ServiceContainer;
    locales?: readonly string[];
    resolvePath?: RoutePathResolver;
    onLocaleChange?(context: NavigationLocaleContext): void;
    onRoute?(context: SpaNavigationRenderContext): void;
}

interface InitialRouteSnapshot {
    pageTagName: string;
    path: string;
    matchedPath: string;
    params: Record<string, string>;
    locale?: string;
    data?: unknown;
    head?: PageHeadDefinition;
}

type RoutedPageElement = HTMLElement & {
    props?: Record<string, unknown>;
    rerender?: () => void;
    load?(context: PageLoadContext): unknown | Promise<unknown>;
    head(context?: PageHeadContext): PageHeadDefinition | undefined;
    data?: unknown;
};

type NavigationSequenceSource = () => number;
type NavigationLifecycleBaseArgs = Omit<NavigationLifecycleEmissionArgs, "sequence">;
type NavigationSequenceState = {
    navigationSequence: number;
    started: boolean;
    controller: AbortController;
    lifecycle?: NavigationLifecycleBaseArgs;
    terminalState?: "ready" | "error" | "abort";
};
type NavigationLifecycleEmissionArgs = {
    sequence: NavigationSequenceState;
    mount: HTMLElement;
    mode: NavigationMode;
    navigationType: SpaNavigationRenderContext["navigationType"];
    path: string;
    matchedPath: string;
    locale?: string;
    url: URL;
    basePath: string;
};

class NavigationAbortedError extends Error {
    constructor() {
        super("Navigation aborted.");
        this.name = "NavigationAbortedError";
    }
}

function isAbortLikeError(error: unknown): boolean {
    if (error instanceof NavigationAbortedError) {
        return true;
    }

    if (typeof DOMException !== "undefined" && error instanceof DOMException) {
        return error.name === "AbortError";
    }

    return error instanceof Error && error.name === "AbortError";
}

export function defineApp(app: RoutedAppDefinition): DefinedRoutedApp;
export function defineApp(app: RootAppDefinition): DefinedRootApp;
export function defineApp(
    app: RoutedAppDefinition | RootAppDefinition,
): DefinedRoutedApp | DefinedRootApp {
    if (isRoutedAppDefinitionShape(app)) {
        const definedApp = brandDefinedApp(app, "routed") as DefinedRoutedApp;
        captureDefinedRoutedApp(definedApp);
        return definedApp;
    }

    if (isRootAppDefinitionShape(app)) {
        return brandDefinedApp(app, "root") as DefinedRootApp;
    }

    return app as DefinedRoutedApp | DefinedRootApp;
}

export async function captureDefinedRoutedAppDuring<Value>(
    action: () => Value | Promise<Value>,
): Promise<{ value: Value; app?: RoutedAppDefinition }> {
    let capturedApp: RoutedAppDefinition | undefined;
    ROUTED_APP_CAPTURE_STACK.push((app) => {
        capturedApp ??= app;
    });

    try {
        const value = await action();
        return {
            value,
            app: capturedApp,
        };
    } finally {
        ROUTED_APP_CAPTURE_STACK.pop();
    }
}

export function resolveRoutedAppDefinitionFromModuleExports(
    moduleExports: Record<string, unknown>,
): RoutedAppDefinition | undefined {
    const candidates = [
        moduleExports.default,
        moduleExports.app,
        ...Object.values(moduleExports),
    ];

    return candidates.find(isDefinedRoutedApp);
}

export function startApp(
    app: DefinedRoutedApp,
    options?: StartDefinedAppOptions,
): NavigationController;
export function startApp(
    app: DefinedRootApp,
    options?: StartDefinedAppOptions,
): NavigationController;
export function startApp(
    root: RootComponentConstructor,
    options?: StartDefinedAppOptions,
): NavigationController;
export function startApp(
    appOrRoot: DefinedRoutedApp | DefinedRootApp | RootComponentConstructor,
    options?: StartDefinedAppOptions,
): NavigationController {
    if (isRootComponentConstructor(appOrRoot)) {
        return startRootApp({
            root: appOrRoot,
        }, options);
    }

    if (isDefinedRootApp(appOrRoot)) {
        return startRootApp(appOrRoot, options);
    }

    if (!isDefinedRoutedApp(appOrRoot)) {
        throw new TypeError(
            "startApp(...) for routed apps expects an app created with defineApp(...).",
        );
    }

    captureDefinedRoutedApp(appOrRoot);

    return startNavigation({
        mode: resolveMainzNavigationMode(),
        basePath: resolveMainzBasePath(),
        mount: options?.mount,
        pages: appOrRoot.pages,
        notFound: appOrRoot.notFound,
        auth: options?.auth,
        services: appOrRoot.services,
        locales: resolvePagesAppLocales(appOrRoot.pages, appOrRoot.notFound),
    });
}

function startRootApp(
    app: Pick<RootAppDefinition, "root" | "services">,
    options?: StartDefinedAppOptions,
): NavigationController {
    const mode = resolveMainzNavigationMode();
    if (typeof document === "undefined" || typeof window === "undefined") {
        return {
            mode,
            cleanup() {},
        };
    }

    setAuthorizationRuntimeOptions(options?.auth);
    document.documentElement.dataset.mainzNavigation = mode;

    const mount = resolveSpaMount(options?.mount);
    const serviceContainer = app.services?.length
        ? createServiceContainer(app.services)
        : undefined;

    ensureMainzCustomElementDefined(app.root);
    const rootElement = document.createElement(app.root.getTagName());
    attachServiceContainer(rootElement, serviceContainer);

    withServiceContainer(serviceContainer, () => {
        mount.replaceChildren(rootElement);
    });

    return {
        mode,
        cleanup() {
            if (rootElement.parentNode === mount) {
                mount.removeChild(rootElement);
                return;
            }

            rootElement.remove();
        },
    };
}

function captureDefinedRoutedApp(app: RoutedAppDefinition): void {
    ROUTED_APP_CAPTURE_STACK.at(-1)?.(app);
}

function isRoutedAppDefinitionShape(value: unknown): value is RoutedAppDefinition {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const record = value as Record<string, unknown>;
    if (typeof record.id !== "string" || record.id.trim().length === 0) {
        return false;
    }

    if (!Array.isArray(record.pages) || !record.pages.every(isRoutedPageEntry)) {
        return false;
    }

    if (
        "notFound" in record && record.notFound !== undefined && !isRoutedPageEntry(record.notFound)
    ) {
        return false;
    }

    return !("services" in record) || record.services === undefined ||
        Array.isArray(record.services);
}

function isRootAppDefinitionShape(value: unknown): value is RootAppDefinition {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const record = value as Record<string, unknown>;
    if (typeof record.id !== "string" || record.id.trim().length === 0) {
        return false;
    }

    if (!isRootComponentConstructor(record.root)) {
        return false;
    }

    return !("services" in record) || record.services === undefined ||
        Array.isArray(record.services);
}

function isRootComponentConstructor(value: unknown): value is RootComponentConstructor {
    return typeof value === "function" &&
        typeof (value as RootComponentConstructor).getTagName === "function";
}

function isRoutedPageEntry(value: unknown): boolean {
    if (typeof value === "function") {
        return true;
    }

    if (typeof value !== "object" || value === null) {
        return false;
    }

    return "page" in value || "load" in value;
}

function isDefinedRoutedApp(value: unknown): value is DefinedRoutedApp {
    return isRoutedAppDefinitionShape(value) &&
        readAppDefinitionKind(value) === "routed";
}

function isDefinedRootApp(value: unknown): value is DefinedRootApp {
    return isRootAppDefinitionShape(value) &&
        readAppDefinitionKind(value) === "root";
}

function readAppDefinitionKind(value: unknown): "routed" | "root" | undefined {
    if (typeof value !== "object" || value === null) {
        return undefined;
    }

    return (value as Record<PropertyKey, unknown>)[MAINZ_APP_DEFINITION_KIND] as
        | "routed"
        | "root"
        | undefined;
}

function brandDefinedApp<TApp extends RoutedAppDefinition | RootAppDefinition>(
    app: TApp,
    kind: "routed" | "root",
): TApp {
    if (readAppDefinitionKind(app) !== kind) {
        Object.defineProperty(app, MAINZ_APP_DEFINITION_KIND, {
            value: kind,
            configurable: false,
            enumerable: false,
            writable: false,
        });
    }

    return app;
}

export function startNavigation(options: StartNavigationOptions): NavigationController {
    if (typeof document === "undefined" || typeof window === "undefined") {
        return {
            mode: options.mode,
            cleanup() {},
        };
    }

    setAuthorizationRuntimeOptions(options.auth ?? options.spa?.auth);

    const normalizedBasePath = normalizeNavigationBasePath(options.basePath);
    const pageOptions = resolvePageNavigationOptions(options);
    if (pageOptions) {
        pageOptions.serviceContainer = createServiceContainer(pageOptions.services);
        assertRegisteredNavigationPolicies(pageOptions);
    }

    document.documentElement.dataset.mainzNavigation = options.mode;
    const nextNavigationSequence = createNavigationSequenceSource();

    if (options.mode === "spa") {
        return startSpaNavigation(
            options.mode,
            normalizedBasePath,
            nextNavigationSequence,
            pageOptions,
        );
    }

    if (pageOptions) {
        void bootstrapDocumentNavigation(
            options.mode,
            pageOptions,
            normalizedBasePath,
            nextNavigationSequence,
        ).catch(
            reportSpaNavigationError,
        );
    }

    if (options.mode !== "enhanced-mpa") {
        return {
            mode: options.mode,
            cleanup() {},
        };
    }

    document.documentElement.dataset.mainzViewTransitions = detectViewTransitionSupport();
    restoreScrollPosition();
    let enteringTransitionTimeoutId: number | undefined;

    const handleFocusIn = (event: Event) => {
        const anchor = findAnchorFromEvent(event);
        if (!isPrefetchableAnchor(anchor, { basePath: normalizedBasePath })) {
            return;
        }

        prefetchDocument(anchor);
    };

    const handlePointerEnter = (event: Event) => {
        const anchor = findAnchorFromEvent(event);
        if (!isPrefetchableAnchor(anchor, { basePath: normalizedBasePath })) {
            return;
        }

        prefetchDocument(anchor);
    };

    const handleClick = (event: Event) => {
        const anchor = findAnchorFromEvent(event);
        if (!isTransitionableAnchor(anchor, { basePath: normalizedBasePath })) {
            return;
        }

        setTransitionPhase("leaving");
        persistScrollPosition();
    };

    const handlePageHide = () => {
        persistScrollPosition();
    };

    const handlePageShow = () => {
        applyEnteringTransition();
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("pointerenter", handlePointerEnter, { capture: true });
    document.addEventListener("click", handleClick, { capture: true });
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);

    if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
    }

    return {
        mode: options.mode,
        cleanup() {
            document.removeEventListener("focusin", handleFocusIn);
            document.removeEventListener("pointerenter", handlePointerEnter, { capture: true });
            document.removeEventListener("click", handleClick, { capture: true });
            window.removeEventListener("pagehide", handlePageHide);
            window.removeEventListener("pageshow", handlePageShow);
            if (enteringTransitionTimeoutId !== undefined) {
                window.clearTimeout(enteringTransitionTimeoutId);
            }
        },
    };

    function applyEnteringTransition(): void {
        if (enteringTransitionTimeoutId !== undefined) {
            window.clearTimeout(enteringTransitionTimeoutId);
        }

        setTransitionPhase("entering");
        enteringTransitionTimeoutId = window.setTimeout(() => {
            clearTransitionPhase("entering");
            enteringTransitionTimeoutId = undefined;
        }, MAINZ_ENTERING_TRANSITION_MS);
    }
}

export function isPrefetchableAnchor(
    anchor: HTMLAnchorElement | null | undefined,
    options: NavigationAnchorOptions = {},
): anchor is HTMLAnchorElement {
    const resolvedUrl = resolveNavigableAnchorUrl(anchor, options);
    if (!resolvedUrl) {
        return false;
    }

    if (
        resolvedUrl.pathname === window.location.pathname &&
        resolvedUrl.search === window.location.search
    ) {
        return false;
    }

    return true;
}

export function createScrollStorageKey(
    locationLike: Pick<Location, "pathname" | "search">,
): string {
    return `${MAINZ_SCROLL_KEY_PREFIX}${locationLike.pathname}${locationLike.search}`;
}

export function detectViewTransitionSupport(): "native" | "fallback" {
    if (typeof document === "undefined") {
        return "fallback";
    }

    const cssSupports = typeof CSS !== "undefined" && typeof CSS.supports === "function"
        ? CSS.supports("view-transition-name: mainz-page")
        : false;

    return cssSupports ? "native" : "fallback";
}

function startSpaNavigation(
    mode: NavigationMode,
    normalizedBasePath: string,
    nextNavigationSequence: NavigationSequenceSource,
    pageOptions?: ResolvedPageNavigationOptions,
): NavigationController {
    if (!pageOptions?.pages?.length && !pageOptions?.notFound) {
        return {
            mode,
            cleanup() {},
        };
    }

    const routes = normalizeSpaRoutes(pageOptions.pages, pageOptions.notFound);
    const mount = resolveSpaMount(pageOptions.mount);
    let activeSequence: NavigationSequenceState | undefined;
    const initialUrl = resolveSpaLocalizedDocumentUrl(
        new URL(window.location.href),
        normalizedBasePath,
        pageOptions.locales,
    );
    if (initialUrl.toString() !== window.location.href) {
        window.history.replaceState({ mainzNavigation: "spa" }, "", initialUrl);
    }

    const initialSequence = createNavigationSequenceState(nextNavigationSequence);
    activeSequence = initialSequence;
    void renderSpaRoute({
        routes,
        mount,
        url: initialUrl,
        navigationType: "initial",
        basePath: normalizedBasePath,
        auth: pageOptions.auth,
        serviceContainer: pageOptions.serviceContainer,
        locales: pageOptions.locales,
        resolvePath: pageOptions.resolvePath,
        onLocaleChange: pageOptions.onLocaleChange,
        onRoute: pageOptions.onRoute,
        mode,
        nextNavigationSequence,
        sequence: initialSequence,
    }).catch(reportSpaNavigationError);

    const handleClick = (event: Event) => {
        if (!(event instanceof MouseEvent)) {
            return;
        }

        if (
            event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
            event.shiftKey || event.altKey
        ) {
            return;
        }

        const anchor = findAnchorFromEvent(event);
        const targetUrl = resolveNavigableAnchorUrl(anchor, { basePath: normalizedBasePath });
        if (!targetUrl) {
            return;
        }

        const currentUrl = new URL(window.location.href);
        if (isSameDocumentHashNavigation(currentUrl, targetUrl)) {
            return;
        }

        const effectiveTargetUrl = resolveSpaLocalizedDocumentUrl(
            targetUrl,
            normalizedBasePath,
            pageOptions.locales,
        );

        const targetPath = resolveRoutePath(
            effectiveTargetUrl,
            normalizedBasePath,
            pageOptions.resolvePath,
            pageOptions.locales,
        );
        if (!targetPath) {
            return;
        }

        const routeMatch = findMatchingSpaRoute(routes, targetPath);
        if (!routeMatch) {
            return;
        }

        event.preventDefault();

        abortNavigationSequence(activeSequence, {
            mount,
            mode,
            navigationType: "push",
            path: routeMatch.route.path,
            matchedPath: targetPath,
            locale: resolveNavigationLocale(
                effectiveTargetUrl,
                normalizedBasePath,
                pageOptions.locales,
            ),
            url: effectiveTargetUrl,
            basePath: normalizedBasePath,
            reason: "superseded",
        });

        const sequence = createNavigationSequenceState(nextNavigationSequence);
        activeSequence = sequence;
        let pendingNavigationReady: NavigationLifecycleEmissionArgs | undefined;
        void renderSpaRoute({
            routes,
            mount,
            url: effectiveTargetUrl,
            navigationType: "push",
            basePath: normalizedBasePath,
            routeMatch,
            auth: pageOptions.auth,
            serviceContainer: pageOptions.serviceContainer,
            locales: pageOptions.locales,
            resolvePath: pageOptions.resolvePath,
            onLocaleChange: pageOptions.onLocaleChange,
            onRoute: pageOptions.onRoute,
            mode,
            nextNavigationSequence,
            sequence,
            finalizeNavigationReady(readyArgs) {
                pendingNavigationReady = readyArgs;
            },
        })
            .then((rendered) => {
                if (!rendered) {
                    return;
                }

                window.history.pushState({ mainzNavigation: "spa" }, "", effectiveTargetUrl);
                updateSpaScrollPosition(effectiveTargetUrl);
                if (pendingNavigationReady) {
                    emitNavigationReady(pendingNavigationReady);
                }
            })
            .catch(reportSpaNavigationError);
    };

    const handlePopState = () => {
        const currentUrl = new URL(window.location.href);
        const effectiveCurrentUrl = resolveSpaLocalizedDocumentUrl(
            currentUrl,
            normalizedBasePath,
            pageOptions.locales,
        );
        const currentPath = resolveRoutePath(
            effectiveCurrentUrl,
            normalizedBasePath,
            pageOptions.resolvePath,
            pageOptions.locales,
        ) ?? "/";
        const routeMatch = findMatchingSpaRoute(routes, currentPath);
        abortNavigationSequence(activeSequence, {
            mount,
            mode,
            navigationType: "pop",
            path: routeMatch?.route.path ?? currentPath,
            matchedPath: currentPath,
            locale: resolveNavigationLocale(
                effectiveCurrentUrl,
                normalizedBasePath,
                pageOptions.locales,
            ),
            url: effectiveCurrentUrl,
            basePath: normalizedBasePath,
            reason: "superseded",
        });
        const sequence = createNavigationSequenceState(nextNavigationSequence);
        activeSequence = sequence;
        if (effectiveCurrentUrl.toString() !== currentUrl.toString()) {
            window.history.replaceState({ mainzNavigation: "spa" }, "", effectiveCurrentUrl);
        }
        void renderSpaRoute({
            routes,
            mount,
            url: effectiveCurrentUrl,
            navigationType: "pop",
            basePath: normalizedBasePath,
            auth: pageOptions.auth,
            serviceContainer: pageOptions.serviceContainer,
            locales: pageOptions.locales,
            resolvePath: pageOptions.resolvePath,
            onLocaleChange: pageOptions.onLocaleChange,
            onRoute: pageOptions.onRoute,
            mode,
            nextNavigationSequence,
            sequence,
        })
            .then((rendered) => {
                if (!rendered) {
                    return;
                }

                updateSpaScrollPosition(effectiveCurrentUrl);
            })
            .catch(reportSpaNavigationError);
    };

    document.addEventListener("click", handleClick, { capture: true });
    window.addEventListener("popstate", handlePopState);

    return {
        mode,
        cleanup() {
            abortNavigationSequence(activeSequence, {
                mount,
                mode,
                navigationType: "initial",
                path: window.location.pathname,
                matchedPath: window.location.pathname,
                locale: document.documentElement.lang || undefined,
                url: new URL(window.location.href),
                basePath: normalizedBasePath,
                reason: "cleanup",
            });
            document.removeEventListener("click", handleClick, { capture: true });
            window.removeEventListener("popstate", handlePopState);
        },
    };
}

async function renderSpaRoute(args: {
    routes: readonly NormalizedSpaRoute[];
    mount: HTMLElement;
    url: URL;
    navigationType: SpaNavigationRenderContext["navigationType"];
    basePath: string;
    routeMatch?: SpaRouteMatch;
    auth?: AuthorizationRuntimeOptions;
    serviceContainer?: ServiceContainer;
    locales?: readonly string[];
    resolvePath?: RoutePathResolver;
    onLocaleChange?: ResolvedPageNavigationOptions["onLocaleChange"];
    onRoute?: ResolvedPageNavigationOptions["onRoute"];
    mode: NavigationMode;
    nextNavigationSequence: NavigationSequenceSource;
    sequence?: NavigationSequenceState;
    finalizeNavigationReady?: (args: NavigationLifecycleEmissionArgs) => void;
}): Promise<boolean> {
    const currentPath = resolveRoutePath(args.url, args.basePath, args.resolvePath, args.locales);
    if (!currentPath) {
        return false;
    }

    const routeMatch = args.routeMatch ?? findMatchingSpaRoute(args.routes, currentPath);
    if (!routeMatch) {
        return false;
    }

    const locale = resolveNavigationLocale(args.url, args.basePath, args.locales);
    const sequence = args.sequence ?? createNavigationSequenceState(args.nextNavigationSequence);
    emitNavigationStart({
        sequence,
        mount: args.mount,
        mode: args.mode,
        navigationType: args.navigationType,
        path: routeMatch.route.path,
        matchedPath: currentPath,
        locale,
        url: args.url,
        basePath: args.basePath,
    });

    let errorPhase: MainzNavigationErrorDetail["phase"] = "route-load";

    try {
        throwIfNavigationAborted(sequence);
        const page = await resolveSpaRoutePage(routeMatch.route);
        throwIfNavigationAborted(sequence);
        assertRegisteredPagePolicies(page, args.auth);
        ensurePageCustomElement(page);

        const pageTagName = page.getTagName();
        const authorization = resolvePageAuthorization(page);

        errorPhase = "authorization";
        const principal = await resolveCurrentPrincipal(args.auth);
        throwIfNavigationAborted(sequence);
        const accessDecision = await evaluatePageAuthorization({
            authorization,
            principal,
            policies: args.auth?.policies,
        });

        if (accessDecision.status === "redirect-login") {
            return await redirectUnauthorizedRouteToLogin({
                ...args,
                currentPath,
                locale,
                sequence,
            });
        }

        if (accessDecision.status === "forbidden") {
            applyNavigationLocale(locale, args.url, args.basePath, args.onLocaleChange);
            renderForbiddenRoute(args.mount);
            finalizeNavigationReady({
                sequence,
                mount: args.mount,
                mode: args.mode,
                navigationType: args.navigationType,
                path: routeMatch.route.path,
                matchedPath: currentPath,
                locale,
                url: args.url,
                basePath: args.basePath,
            }, args.finalizeNavigationReady);
            return true;
        }

        const existingElement = args.mount.querySelector(pageTagName);
        const pageElement = args.navigationType === "initial" && isHtmlElement(existingElement)
            ? existingElement as RoutedPageElement
            : args.mount.ownerDocument.createElement(pageTagName) as RoutedPageElement;

        errorPhase = "route-load";
        const data = await resolvePageRouteData({
            page,
            pageElement,
            path: routeMatch.route.path,
            matchedPath: currentPath,
            params: routeMatch.params,
            locale,
            principal,
            url: args.url,
            signal: sequence.controller.signal,
            basePath: args.basePath,
            navigationMode: args.mode,
            serviceContainer: args.serviceContainer,
        });
        throwIfNavigationAborted(sequence);
        const head = resolveSpaRouteHead({
            page,
            pageElement,
            path: routeMatch.route.path,
            matchedPath: currentPath,
            locale,
            locales: args.locales,
            data,
            principal,
            url: args.url,
            basePath: args.basePath,
            navigationMode: args.mode,
        });
        const routeContext = {
            page,
            path: routeMatch.route.path,
            matchedPath: currentPath,
            params: routeMatch.params,
            principal,
            authorization,
            data,
            head,
            locale,
            url: args.url,
            navigationType: args.navigationType,
            basePath: args.basePath,
        } satisfies SpaNavigationRenderContext;
        attachServiceContainer(routeContext, args.serviceContainer);

        errorPhase = "page-render";
        throwIfNavigationAborted(sequence);
        applyNavigationLocale(locale, args.url, args.basePath, args.onLocaleChange);

        args.onRoute?.(routeContext);
        throwIfNavigationAborted(sequence);

        if (args.navigationType === "initial" && isHtmlElement(existingElement)) {
            applySpaRouteContext(existingElement, routeContext);
            applyResolvedPageHeadToDocument(head);
            finalizeNavigationReady({
                sequence,
                mount: args.mount,
                mode: args.mode,
                navigationType: args.navigationType,
                path: routeContext.path,
                matchedPath: routeContext.matchedPath,
                locale: routeContext.locale,
                url: routeContext.url,
                basePath: routeContext.basePath,
            }, args.finalizeNavigationReady);
            return true;
        }

        const nextPageElement = pageElement;
        applySpaRouteContext(nextPageElement, routeContext);
        args.mount.replaceChildren(nextPageElement);
        finalizeNavigationReady({
            sequence,
            mount: args.mount,
            mode: args.mode,
            navigationType: args.navigationType,
            path: routeContext.path,
            matchedPath: routeContext.matchedPath,
            locale: routeContext.locale,
            url: routeContext.url,
            basePath: routeContext.basePath,
        }, args.finalizeNavigationReady);
        return true;
    } catch (error) {
        if (isAbortLikeError(error) || sequence.controller.signal.aborted) {
            return false;
        }
        emitNavigationError({
            sequence,
            mount: args.mount,
            mode: args.mode,
            navigationType: args.navigationType,
            path: routeMatch.route.path,
            matchedPath: currentPath,
            locale,
            url: args.url,
            basePath: args.basePath,
            phase: errorPhase,
            error,
        });
        throw error;
    }
}

function normalizeSpaRoutes(
    pages: readonly (SpaPageConstructor | SpaPageDefinition | SpaLazyPageDefinition)[],
    notFound?: SpaPageConstructor | SpaPageDefinition | SpaLazyPageDefinition,
): NormalizedSpaRoute[] {
    const routeEntries = [...pages];
    if (notFound) {
        routeEntries.push(normalizeSpaNotFoundRoute(notFound));
    }

    return routeEntries
        .map((entry) => normalizeSpaRoute(entry))
        .sort(compareSpaRoutesByPriority);
}

function normalizeSpaRoute(
    entry: SpaPageConstructor | SpaPageDefinition | SpaLazyPageDefinition,
): NormalizedSpaRoute {
    if (isSpaLazyPageDefinition(entry)) {
        const path = normalizeRoutePath(entry.path);
        if (!path) {
            throw new Error("SPA lazy navigation pages must define an explicit route path.");
        }

        return {
            path,
            load: entry.load,
        };
    }

    const page = isSpaPageDefinition(entry) ? entry.page : entry;
    const missingRouteMessage =
        `SPA navigation page "${page.name}" must define @Route(...) or an explicit route path.`;
    const path = normalizeRoutePath(
        isSpaPageDefinition(entry)
            ? entry.path ?? requirePageRoutePath(page, missingRouteMessage)
            : requirePageRoutePath(page, missingRouteMessage),
    );

    if (!path) {
        throw new Error(
            `SPA navigation page "${page.name}" must define @Route(...) or an explicit route path.`,
        );
    }

    return {
        page,
        path,
    };
}

function normalizeSpaNotFoundRoute(
    entry: SpaPageConstructor | SpaPageDefinition | SpaLazyPageDefinition,
): SpaPageDefinition | SpaLazyPageDefinition {
    if (isSpaLazyPageDefinition(entry)) {
        return {
            ...entry,
            path: "*",
        };
    }

    const page = isSpaPageDefinition(entry) ? entry.page : entry;

    return {
        page,
        path: "*",
    };
}

function isSpaPageDefinition(
    entry: SpaPageConstructor | SpaPageDefinition | SpaLazyPageDefinition,
): entry is SpaPageDefinition {
    return typeof entry === "object" && entry !== null && "page" in entry;
}

function isSpaLazyPageDefinition(
    entry: SpaPageConstructor | SpaPageDefinition | SpaLazyPageDefinition,
): entry is SpaLazyPageDefinition {
    return typeof entry === "object" && entry !== null && "load" in entry;
}

function compareSpaRoutesByPriority(a: NormalizedSpaRoute, b: NormalizedSpaRoute): number {
    const aStats = getRoutePatternStats(a.path);
    const bStats = getRoutePatternStats(b.path);

    if (aStats.staticCount !== bStats.staticCount) {
        return bStats.staticCount - aStats.staticCount;
    }

    if (aStats.dynamicCount !== bStats.dynamicCount) {
        return aStats.dynamicCount - bStats.dynamicCount;
    }

    if (aStats.hasCatchAll !== bStats.hasCatchAll) {
        return aStats.hasCatchAll ? 1 : -1;
    }

    if (aStats.depth !== bStats.depth) {
        return bStats.depth - aStats.depth;
    }

    return a.path.localeCompare(b.path);
}

function getRoutePatternStats(path: string): {
    staticCount: number;
    dynamicCount: number;
    hasCatchAll: boolean;
    depth: number;
} {
    const segments = getRouteSegments(path);
    let staticCount = 0;
    let dynamicCount = 0;
    let hasCatchAll = false;

    for (const segment of segments) {
        if (segment === "*" || segment.startsWith("[...")) {
            hasCatchAll = true;
            dynamicCount += 1;
            continue;
        }

        if (segment.startsWith(":") || isBracketDynamicSegment(segment)) {
            dynamicCount += 1;
            continue;
        }

        staticCount += 1;
    }

    return {
        staticCount,
        dynamicCount,
        hasCatchAll,
        depth: segments.length,
    };
}

function findMatchingSpaRoute(
    routes: readonly NormalizedSpaRoute[],
    currentPath: string,
): SpaRouteMatch | undefined {
    for (const route of routes) {
        const params = matchRoutePath(route.path, currentPath);
        if (!params) {
            continue;
        }

        return {
            route,
            params,
        };
    }

    return undefined;
}

function matchRoutePath(routePath: string, currentPath: string): Record<string, string> | null {
    const routeSegments = getRouteSegments(routePath);
    const currentSegments = getRouteSegments(currentPath);
    const params: Record<string, string> = {};

    let routeIndex = 0;
    let currentIndex = 0;

    while (routeIndex < routeSegments.length && currentIndex < currentSegments.length) {
        const routeSegment = routeSegments[routeIndex];
        const currentSegment = currentSegments[currentIndex];

        if (routeSegment === "*") {
            params["*"] = currentSegments.slice(currentIndex).map(decodeRouteParamSegment).join(
                "/",
            );
            return params;
        }

        if (routeSegment.startsWith("[...")) {
            params[routeSegment.slice(4, -1)] = currentSegments.slice(currentIndex).map(
                decodeRouteParamSegment,
            ).join("/");
            return params;
        }

        if (routeSegment.startsWith(":")) {
            params[routeSegment.slice(1)] = decodeRouteParamSegment(currentSegment);
            routeIndex += 1;
            currentIndex += 1;
            continue;
        }

        if (isBracketDynamicSegment(routeSegment)) {
            params[routeSegment.slice(1, -1)] = decodeRouteParamSegment(currentSegment);
            routeIndex += 1;
            currentIndex += 1;
            continue;
        }

        if (routeSegment !== currentSegment) {
            return null;
        }

        routeIndex += 1;
        currentIndex += 1;
    }

    if (routeIndex === routeSegments.length && currentIndex === currentSegments.length) {
        return params;
    }

    if (routeIndex === routeSegments.length - 1 && routeSegments[routeIndex] === "*") {
        params["*"] = currentSegments.slice(currentIndex).map(decodeRouteParamSegment).join("/");
        return params;
    }

    if (routeIndex === routeSegments.length - 1 && routeSegments[routeIndex].startsWith("[...")) {
        params[routeSegments[routeIndex].slice(4, -1)] = currentSegments.slice(currentIndex)
            .map(decodeRouteParamSegment)
            .join("/");
        return params;
    }

    return null;
}

function resolveSpaMount(mount?: string | Element): HTMLElement {
    if (isHtmlElement(mount)) {
        return mount;
    }

    const selector = typeof mount === "string" ? mount : "#app";
    const resolved = document.querySelector(selector);
    if (!isHtmlElement(resolved)) {
        throw new Error(`SPA navigation could not find the mount element "${selector}".`);
    }

    return resolved;
}

function ensurePageCustomElement(page: SpaPageConstructor): void {
    ensureMainzCustomElementDefined(
        page as unknown as CustomElementConstructor & { getTagName(): string },
    );
}

async function resolveSpaRoutePage(route: NormalizedSpaRoute): Promise<SpaPageConstructor> {
    if (route.page) {
        return route.page;
    }

    if (!route.load) {
        throw new Error(`SPA route "${route.path}" has no page constructor or lazy loader.`);
    }

    const loadedPage = resolveSpaPageModule(await route.load());
    route.page = loadedPage;
    return loadedPage;
}

function resolveSpaPageModule(module: SpaPageModule): SpaPageConstructor {
    if (typeof module === "function") {
        return module;
    }

    if (module && typeof module === "object" && typeof module.default === "function") {
        return module.default;
    }

    throw new Error(
        "SPA lazy navigation loader must resolve to a Page constructor or { default: Page }.",
    );
}

function applySpaRouteContext(element: HTMLElement, context: SpaNavigationRenderContext): void {
    const serviceContainer = readServiceContainer(context);
    const routeContext = attachServiceContainer(createRouteContext({
        path: context.path,
        matchedPath: context.matchedPath,
        params: context.params,
        locale: context.locale,
        url: context.url,
        renderMode: resolveMainzRenderMode(),
        navigationMode: resolveMainzNavigationMode(),
        principal: context.principal,
        profile: createRouteProfileContext(context.basePath),
    }), serviceContainer);

    const pageElement = element as RoutedPageElement;
    pageElement.data = context.data;
    pageElement.props = {
        ...readSpaElementProps(element),
        route: routeContext,
        data: context.data,
        head: context.head,
    };
    attachServiceContainer(element, serviceContainer);

    const rerender = (element as HTMLElement & { rerender?: () => void }).rerender;
    if (typeof rerender === "function") {
        rerender.call(element);
    }
}

function readSpaElementProps(element: HTMLElement): Record<string, unknown> {
    const currentProps = (element as HTMLElement & { props?: unknown }).props;
    if (typeof currentProps === "object" && currentProps !== null) {
        return currentProps as Record<string, unknown>;
    }

    return {};
}

function isHtmlElement(value: unknown): value is HTMLElement {
    if (!value || typeof value !== "object") {
        return false;
    }

    const ownerDocument = "ownerDocument" in value
        ? (value as { ownerDocument?: Document | null }).ownerDocument
        : undefined;
    const ownerWindow = ownerDocument?.defaultView;
    const ownerHTMLElement = ownerWindow?.HTMLElement;

    if (ownerHTMLElement) {
        return value instanceof ownerHTMLElement;
    }

    const ownerElement = ownerWindow?.Element;
    if (ownerElement) {
        return value instanceof ownerElement;
    }

    return false;
}

function applyResolvedPageHeadToDocument(headDefinition: PageHeadDefinition | undefined): void {
    if (typeof document === "undefined") {
        return;
    }

    const head = document.head;
    if (!head) {
        return;
    }

    head.querySelectorAll(`[${MAINZ_HEAD_MANAGED_ATTR}]`).forEach((node) => node.remove());

    if (!headDefinition) {
        return;
    }

    if (headDefinition.title) {
        document.title = headDefinition.title;
    }

    for (const meta of headDefinition.meta ?? []) {
        const element = document.createElement("meta");
        if (meta.name) {
            element.setAttribute("name", meta.name);
        }
        if (meta.property) {
            element.setAttribute("property", meta.property);
        }
        element.setAttribute("content", meta.content);
        element.setAttribute(MAINZ_HEAD_MANAGED_ATTR, "true");
        head.appendChild(element);
    }

    for (const link of headDefinition.links ?? []) {
        const element = document.createElement("link");
        element.setAttribute("rel", link.rel);
        element.setAttribute("href", link.href);
        if (link.hreflang) {
            element.setAttribute("hreflang", link.hreflang);
        }
        element.setAttribute(MAINZ_HEAD_MANAGED_ATTR, "true");
        head.appendChild(element);
    }
}

function resolveSpaRouteHead(args: {
    page: SpaPageConstructor;
    pageElement: RoutedPageElement;
    path: string;
    matchedPath: string;
    locale?: string;
    locales?: readonly string[];
    data?: unknown;
    principal?: Principal;
    url: URL;
    basePath: string;
    navigationMode: NavigationMode;
}): PageHeadDefinition | undefined {
    const routeContext = createRouteContext({
        path: args.path,
        matchedPath: args.matchedPath,
        params: resolveRouteParamsFromPageElement(args.pageElement),
        locale: args.locale,
        url: args.url,
        renderMode: resolveMainzRenderMode(),
        navigationMode: args.navigationMode,
        principal: args.principal,
        profile: createRouteProfileContext(args.basePath),
    });
    const headContext = createPageLoadContext({
        path: args.path,
        matchedPath: args.matchedPath,
        params: routeContext.params,
        locale: args.locale,
        url: args.url,
        renderMode: routeContext.renderMode,
        navigationMode: args.navigationMode,
        principal: args.principal,
        profile: routeContext.profile,
    });
    const instanceHead = typeof args.pageElement.head === "function"
        ? args.pageElement.head.call(args.pageElement, headContext)
        : undefined;
    const mergedHead = instanceHead;
    const routeLocales = resolveSpaRouteLocales(args.page, args.locales);
    const activeLocale = args.locale ?? routeLocales[0] ?? resolveMainzDefaultLocale();
    if (!activeLocale) {
        return mergedHead;
    }

    return buildRouteHead({
        path: args.matchedPath,
        locale: activeLocale,
        locales: routeLocales,
        head: mergedHead,
        localePrefix: resolveMainzLocalePrefix(),
        defaultLocale: resolveMainzDefaultLocale() ?? routeLocales[0],
        basePath: resolveMainzBasePath(),
        siteUrl: resolveMainzSiteUrl(),
    });
}

function resolveSpaRouteLocales(
    page: SpaPageConstructor,
    fallbackLocales?: readonly string[],
): readonly string[] {
    const pageLocales = resolvePageLocales(page);
    if (pageLocales?.length) {
        return pageLocales;
    }

    if (fallbackLocales?.length) {
        return fallbackLocales;
    }

    const targetLocales = readMainzTargetLocales();
    return targetLocales.length > 0 ? targetLocales : [];
}

async function resolvePageRouteData(args: {
    page: SpaPageConstructor;
    pageElement: RoutedPageElement;
    path: string;
    matchedPath: string;
    params: SpaRouteParams;
    locale?: string;
    principal?: Principal;
    url: URL;
    signal: AbortSignal;
    basePath: string;
    navigationMode: NavigationMode;
    serviceContainer?: ServiceContainer;
}): Promise<unknown> {
    const routeProfile = createRouteProfileContext(args.basePath);
    const routeContext = createRouteContext({
        path: args.path,
        matchedPath: args.matchedPath,
        params: args.params,
        locale: args.locale,
        url: args.url,
        renderMode: resolveMainzRenderMode(),
        navigationMode: args.navigationMode,
        principal: args.principal,
        profile: routeProfile,
    });
    applyPageLifecycleProps(args.pageElement, {
        route: routeContext,
        data: args.pageElement.data,
        head: readResolvedPageHeadFromProps(args.pageElement.props),
    });
    attachServiceContainer(args.pageElement, args.serviceContainer);

    const hasInstanceLoad = typeof args.pageElement.load === "function";
    const hasStaticLoad = typeof Reflect.get(args.page as object, "load") === "function";

    if (hasStaticLoad) {
        throw new Error(
            `Page "${args.page.name}" declares static load(), which is no longer supported. Move that logic into the page instance load() lifecycle.`,
        );
    }

    if (!hasInstanceLoad) {
        return undefined;
    }

    if (args.signal.aborted) {
        throw new NavigationAbortedError();
    }

    const context: PageLoadContext = createPageLoadContext({
        path: args.path,
        matchedPath: args.matchedPath,
        params: args.params,
        locale: args.locale,
        url: args.url,
        renderMode: resolveMainzRenderMode(),
        navigationMode: args.navigationMode,
        signal: args.signal,
        principal: args.principal,
        profile: routeProfile,
    });

    if (hasInstanceLoad) {
        const result = await withServiceContainer(
            args.serviceContainer,
            () => args.pageElement.load!.call(args.pageElement, context),
        );
        args.pageElement.data = result;
        applyPageLifecycleProps(args.pageElement, {
            route: routeContext,
            data: result,
            head: readResolvedPageHeadFromProps(args.pageElement.props),
        });
        return result;
    }
}

function createRouteContext(args: {
    path: string;
    matchedPath: string;
    params: SpaRouteParams;
    locale?: string;
    url: URL;
    renderMode: "csr" | "ssg";
    navigationMode: NavigationMode;
    principal?: Principal;
    profile?: RouteProfileContext;
}): RouteContext {
    return {
        path: args.path,
        matchedPath: args.matchedPath,
        params: args.params,
        locale: args.locale,
        url: args.url,
        renderMode: args.renderMode,
        navigationMode: args.navigationMode,
        principal: args.principal,
        profile: args.profile,
    };
}

function createRouteProfileContext(basePath: string): RouteProfileContext {
    return {
        basePath,
        siteUrl: resolveMainzSiteUrl(),
    };
}

function applyPageLifecycleProps(
    element: RoutedPageElement,
    args: {
        route: RouteContext;
        data?: unknown;
        head?: PageHeadDefinition;
    },
): void {
    const nextProps = {
        ...(element.props ?? {}),
        route: args.route,
        data: args.data,
        head: args.head,
    };

    element.props = nextProps;
}

function readResolvedPageHeadFromProps(props: unknown): PageHeadDefinition | undefined {
    if (typeof props !== "object" || props === null) {
        return undefined;
    }

    const propsRecord = props as Record<string, unknown>;
    return isPageHeadDefinition(propsRecord.head) ? propsRecord.head : undefined;
}

function resolveRouteParamsFromPageElement(element: RoutedPageElement): SpaRouteParams {
    if (typeof element.props !== "object" || element.props === null) {
        return {};
    }

    const route = (element.props as Record<string, unknown>).route;
    if (typeof route !== "object" || route === null) {
        return {};
    }

    const params = (route as Record<string, unknown>).params;
    return isStringRecord(params) ? params : {};
}

async function redirectUnauthorizedRouteToLogin(args: {
    routes: readonly NormalizedSpaRoute[];
    mount: HTMLElement;
    url: URL;
    navigationType: SpaNavigationRenderContext["navigationType"];
    basePath: string;
    currentPath: string;
    locale?: string;
    auth?: AuthorizationRuntimeOptions;
    serviceContainer?: ServiceContainer;
    locales?: readonly string[];
    resolvePath?: RoutePathResolver;
    onLocaleChange?: ResolvedPageNavigationOptions["onLocaleChange"];
    onRoute?: ResolvedPageNavigationOptions["onRoute"];
    mode: NavigationMode;
    nextNavigationSequence: NavigationSequenceSource;
    sequence: NavigationSequenceState;
}): Promise<boolean> {
    const loginPath = normalizeRoutePath(args.auth?.loginPath ?? "/login");
    if (!loginPath || loginPath === args.currentPath) {
        applyNavigationLocale(args.locale, args.url, args.basePath, args.onLocaleChange);
        renderForbiddenRoute(args.mount);
        emitNavigationReady({
            sequence: args.sequence,
            mount: args.mount,
            mode: args.mode,
            navigationType: args.navigationType,
            path: args.currentPath,
            matchedPath: args.currentPath,
            locale: args.locale,
            url: args.url,
            basePath: args.basePath,
        });
        return true;
    }

    const redirectUrl = buildAuthorizationRedirectUrl({
        loginPath,
        currentUrl: args.url,
        basePath: args.basePath,
        locale: args.locale,
        locales: args.locales,
    });

    if (args.navigationType === "push") {
        window.history.pushState({ mainzNavigation: "spa" }, "", redirectUrl);
    } else {
        window.history.replaceState({ mainzNavigation: "spa" }, "", redirectUrl);
    }

    updateSpaScrollPosition(redirectUrl);

    await renderSpaRoute({
        routes: args.routes,
        mount: args.mount,
        url: redirectUrl,
        navigationType: args.navigationType,
        basePath: args.basePath,
        auth: args.auth,
        serviceContainer: args.serviceContainer,
        locales: args.locales,
        resolvePath: args.resolvePath,
        onLocaleChange: args.onLocaleChange,
        onRoute: args.onRoute,
        mode: args.mode,
        nextNavigationSequence: args.nextNavigationSequence,
        sequence: args.sequence,
    });

    return false;
}

function buildAuthorizationRedirectUrl(args: {
    loginPath: string;
    currentUrl: URL;
    basePath: string;
    locale?: string;
    locales?: readonly string[];
}): URL {
    const redirectUrl = new URL(args.currentUrl.toString());
    redirectUrl.pathname = joinNavigationBasePath(
        args.basePath,
        buildLocalizedNavigationPath(args.loginPath, args.locale, args.locales),
    );
    redirectUrl.search = "";
    redirectUrl.hash = "";
    return redirectUrl;
}

function buildLocalizedNavigationPath(
    routePath: string,
    locale: string | undefined,
    locales: readonly string[] | undefined,
): string {
    const normalizedRoutePath = normalizeRoutePath(routePath) ?? "/";
    const shouldPrefixLocale = Boolean(
        locale &&
            locales?.length &&
            shouldPrefixLocaleForRoute(locales, resolveMainzLocalePrefix()),
    );

    if (!shouldPrefixLocale || !locale) {
        return normalizedRoutePath;
    }

    const localeSegment = toLocalePathSegment(locale);

    if (normalizedRoutePath === "/") {
        return `/${localeSegment}/`;
    }

    return `/${localeSegment}${normalizedRoutePath}`;
}

function renderForbiddenRoute(mount: HTMLElement): void {
    const element = document.createElement("section");
    element.setAttribute("data-mainz-authorization", "forbidden");
    element.setAttribute("data-mainz-status", "403");
    element.textContent = "403 Forbidden";
    mount.replaceChildren(element);
    applyResolvedPageHeadToDocument({
        title: "403 Forbidden",
    });
}

function updateSpaScrollPosition(url: URL): void {
    if (url.hash) {
        const anchorTarget = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        anchorTarget?.scrollIntoView();
        return;
    }

    window.scrollTo(0, 0);
}

function resolveNavigableAnchorUrl(
    anchor: HTMLAnchorElement | null | undefined,
    options: NavigationAnchorOptions = {},
): URL | null {
    if (!anchor) {
        return null;
    }

    const href = anchor.getAttribute("href")?.trim();
    if (!href || href.startsWith("#")) {
        return null;
    }

    if (anchor.hasAttribute("download")) {
        return null;
    }

    if (anchor.dataset.mainzNoPrefetch === "true") {
        return null;
    }

    const target = anchor.getAttribute("target");
    if (target && target !== "_self") {
        return null;
    }

    let resolvedUrl: URL;
    try {
        resolvedUrl = new URL(anchor.href, window.location.href);
    } catch {
        return null;
    }

    if (resolvedUrl.origin !== window.location.origin) {
        return null;
    }

    if (
        !isUrlWithinNavigationBasePath(resolvedUrl, normalizeNavigationBasePath(options.basePath))
    ) {
        return null;
    }

    return resolvedUrl;
}

function findAnchorFromEvent(event: Event): HTMLAnchorElement | null {
    const target = event.target;
    if (!(target instanceof Element)) {
        return null;
    }

    return target.closest("a[href]") as HTMLAnchorElement | null;
}

function prefetchDocument(anchor: HTMLAnchorElement): void {
    if (anchor.getAttribute(MAINZ_PREFETCH_ATTR) === "true") {
        return;
    }

    const prefetchLink = document.createElement("link");
    prefetchLink.setAttribute("rel", "prefetch");
    prefetchLink.setAttribute("href", anchor.href);
    prefetchLink.setAttribute("as", "document");

    document.head.appendChild(prefetchLink);
    anchor.setAttribute(MAINZ_PREFETCH_ATTR, "true");
}

function isTransitionableAnchor(
    anchor: HTMLAnchorElement | null | undefined,
    options: NavigationAnchorOptions = {},
): anchor is HTMLAnchorElement {
    if (!isPrefetchableAnchor(anchor, options)) {
        return false;
    }

    return !window.location.hash || new URL(anchor.href).hash !== window.location.hash;
}

function isSameDocumentHashNavigation(currentUrl: URL, targetUrl: URL): boolean {
    return currentUrl.pathname === targetUrl.pathname &&
        currentUrl.search === targetUrl.search &&
        currentUrl.hash !== targetUrl.hash;
}

function setTransitionPhase(phase: "entering" | "leaving"): void {
    document.documentElement.dataset.mainzTransitionPhase = phase;
}

function clearTransitionPhase(phase: "entering" | "leaving"): void {
    if (document.documentElement.dataset.mainzTransitionPhase === phase) {
        delete document.documentElement.dataset.mainzTransitionPhase;
    }
}

function persistScrollPosition(): void {
    try {
        window.sessionStorage.setItem(
            createScrollStorageKey(window.location),
            JSON.stringify({
                x: window.scrollX,
                y: window.scrollY,
            }),
        );
    } catch {
        // Ignore storage failures.
    }
}

function restoreScrollPosition(): void {
    if (window.location.hash) {
        return;
    }

    let savedPosition: { x: number; y: number } | null = null;

    try {
        const raw = window.sessionStorage.getItem(createScrollStorageKey(window.location));
        savedPosition = raw ? JSON.parse(raw) as { x: number; y: number } : null;
    } catch {
        savedPosition = null;
    }

    if (!savedPosition) {
        return;
    }

    window.scrollTo(savedPosition.x, savedPosition.y);
}

function toAppRelativePath(url: URL, basePath: string): string | null {
    if (!isUrlWithinNavigationBasePath(url, basePath)) {
        return null;
    }

    if (basePath === "/") {
        return normalizeRoutePath(url.pathname) ?? "/";
    }

    const basePathWithoutTrailingSlash = basePath.slice(0, -1);
    if (url.pathname === basePathWithoutTrailingSlash) {
        return "/";
    }

    return normalizeRoutePath(url.pathname.slice(basePathWithoutTrailingSlash.length)) ?? "/";
}

function normalizeNavigationBasePath(basePath?: string): string {
    const normalizedBasePath = (basePath ?? "/").trim();

    if (!normalizedBasePath || normalizedBasePath === "." || normalizedBasePath === "./") {
        return "/";
    }

    const withLeadingSlash = normalizedBasePath.startsWith("/")
        ? normalizedBasePath
        : `/${normalizedBasePath}`;
    return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function isUrlWithinNavigationBasePath(url: URL, basePath: string): boolean {
    if (basePath === "/") {
        return true;
    }

    const basePathWithoutTrailingSlash = basePath.slice(0, -1);
    return url.pathname === basePathWithoutTrailingSlash || url.pathname.startsWith(basePath);
}

function normalizeRoutePath(path: string | undefined): string | null {
    const trimmed = path?.trim();
    if (!trimmed) {
        return null;
    }

    const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    const normalizedSlashes = withLeadingSlash.replace(/\/{2,}/g, "/");

    if (normalizedSlashes.length > 1 && normalizedSlashes.endsWith("/")) {
        return normalizedSlashes.slice(0, -1);
    }

    return normalizedSlashes;
}

function getRouteSegments(path: string): string[] {
    return normalizeRoutePath(path)?.split("/").filter(Boolean) ?? [];
}

function isBracketDynamicSegment(segment: string): boolean {
    return /^\[[^\].]+\]$/.test(segment);
}

function decodeRouteParamSegment(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

function reportSpaNavigationError(error: unknown): void {
    console.error("[mainz] SPA navigation failed.", error);
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

function resolveSpaLocalizedDocumentUrl(
    url: URL,
    basePath: string,
    locales?: readonly string[],
): URL {
    if (!shouldRedirectSpaRootToLocalizedPath(url, basePath, locales)) {
        return url;
    }

    const localizedPath = resolveLocaleRedirectPath({
        supportedLocales: locales!,
        defaultLocale: locales?.[0],
        preferredLocales: readPreferredNavigationLocales(),
    });
    const nextUrl = new URL(url.toString());
    nextUrl.pathname = joinNavigationBasePath(basePath, localizedPath);
    return nextUrl;
}

function shouldRedirectSpaRootToLocalizedPath(
    url: URL,
    basePath: string,
    locales?: readonly string[],
): boolean {
    if (!locales?.length) {
        return false;
    }

    if (!shouldPrefixLocaleForRoute(locales, resolveMainzLocalePrefix())) {
        return false;
    }

    const appPath = toAppRelativePath(url, basePath);
    if (!appPath || appPath === "/") {
        return true;
    }

    const firstSegment = appPath.split("/").filter(Boolean)[0];
    if (!firstSegment) {
        return true;
    }

    return false;
}

function joinNavigationBasePath(basePath: string, routePath: string): string {
    if (basePath === "/") {
        return routePath;
    }

    const normalizedRoutePath = routePath.startsWith("/") ? routePath : `/${routePath}`;
    return `${basePath.slice(0, -1)}${normalizedRoutePath}`;
}

function readPreferredNavigationLocales(): readonly string[] {
    const preferredLocales: string[] = [];

    if (typeof navigator === "undefined") {
        return preferredLocales;
    }

    if (Array.isArray(navigator.languages)) {
        preferredLocales.push(
            ...navigator.languages.filter((value): value is string => typeof value === "string"),
        );
    }

    if (typeof navigator.language === "string" && navigator.language.trim()) {
        preferredLocales.push(navigator.language);
    }

    return preferredLocales;
}

function applyNavigationLocale(
    locale: string | undefined,
    url: URL,
    basePath: string,
    onLocaleChange?: ResolvedPageNavigationOptions["onLocaleChange"],
): void {
    if (!locale) {
        return;
    }

    if (typeof document !== "undefined") {
        document.documentElement.lang = locale;
        document.dispatchEvent(
            new CustomEvent<MainzLocaleChangeDetail>(MAINZ_LOCALE_CHANGE_EVENT, {
                detail: {
                    locale,
                    url: url.toString(),
                    basePath,
                },
            }),
        );
    }

    onLocaleChange?.({
        locale,
        url,
        basePath,
    });
}

function resolveRoutePath(
    url: URL,
    basePath: string,
    resolver?: RoutePathResolver,
    locales?: readonly string[],
): string | null {
    if (resolver) {
        const resolvedPath = resolver({ url, basePath });
        return normalizeRoutePath(resolvedPath ?? undefined) ?? "/";
    }

    const appPath = toAppRelativePath(url, basePath);
    if (!appPath) {
        return null;
    }

    return stripLocalePrefixFromPath(appPath, locales);
}

function resolveNavigationLocale(
    url: URL,
    basePath: string,
    locales?: readonly string[],
): string | undefined {
    if (!locales?.length) {
        const documentLocale = typeof document === "undefined"
            ? ""
            : document.documentElement.lang.trim();
        return documentLocale || undefined;
    }

    const appPath = toAppRelativePath(url, basePath) ?? "/";
    const firstSegment = appPath.split("/").filter(Boolean)[0];

    if (firstSegment) {
        const matchedLocale = locales.find((locale) =>
            locale.toLowerCase() === firstSegment.toLowerCase()
        );
        if (matchedLocale) {
            return matchedLocale;
        }
    }

    const documentLocale = typeof document === "undefined"
        ? ""
        : document.documentElement.lang.trim();
    if (!documentLocale) {
        return locales[0];
    }

    return locales.find((locale) => locale.toLowerCase() === documentLocale.toLowerCase()) ??
        locales[0];
}

function stripLocalePrefixFromPath(pathname: string, locales?: readonly string[]): string {
    if (!locales?.length) {
        return pathname || "/";
    }

    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
        return "/";
    }

    const [first, ...rest] = segments;
    const isLocaleSegment = locales.some((locale) => locale.toLowerCase() === first.toLowerCase());
    if (!isLocaleSegment) {
        return pathname || "/";
    }

    return rest.length === 0 ? "/" : `/${rest.join("/")}`;
}

function resolvePageNavigationOptions(
    options: StartNavigationOptions,
): ResolvedPageNavigationOptions | undefined {
    const legacySpaOptions = options.spa;
    const pages = options.pages ?? legacySpaOptions?.pages;
    const notFound = options.notFound ?? legacySpaOptions?.notFound;
    const mount = options.mount ?? legacySpaOptions?.mount;
    const auth = options.auth ?? legacySpaOptions?.auth;
    const services = options.services ?? legacySpaOptions?.services;
    const locales = options.locales ?? legacySpaOptions?.locales;
    const resolvePath = options.resolvePath ?? legacySpaOptions?.resolvePath;
    const onLocaleChange = options.onLocaleChange ?? legacySpaOptions?.onLocaleChange;
    const onRoute = options.onRoute ??
        options.onBeforeRender ??
        legacySpaOptions?.onRoute ??
        legacySpaOptions?.onBeforeRender;

    if (!pages?.length && !notFound && !mount && !onRoute) {
        return undefined;
    }

    return {
        pages: pages ?? [],
        notFound,
        mount,
        auth,
        services,
        locales,
        resolvePath,
        onLocaleChange,
        onRoute,
    };
}

function assertRegisteredNavigationPolicies(options: ResolvedPageNavigationOptions): void {
    const eagerPages = [
        ...collectImmediateNavigationPages(options.pages),
        ...collectImmediateNavigationPages(options.notFound ? [options.notFound] : []),
    ];

    const missingPolicies = findMissingAuthorizationPolicies({
        authorizations: eagerPages.map((page) => resolvePageAuthorization(page)),
        policies: options.auth?.policies,
    });
    if (missingPolicies.length === 0) {
        return;
    }

    throw new Error(
        `Configured pages reference unregistered authorization policies: ${
            missingPolicies.map((policyName) => `"${policyName}"`).join(", ")
        }. Register them under auth.policies before starting navigation.`,
    );
}

function createNavigationSequenceSource(): NavigationSequenceSource {
    let navigationSequence = 0;

    return () => {
        navigationSequence += 1;
        return navigationSequence;
    };
}

function createNavigationSequenceState(
    nextNavigationSequence: NavigationSequenceSource,
): NavigationSequenceState {
    return {
        navigationSequence: nextNavigationSequence(),
        started: false,
        controller: new AbortController(),
    };
}

function throwIfNavigationAborted(sequence: NavigationSequenceState): void {
    if (sequence.controller.signal.aborted) {
        throw new NavigationAbortedError();
    }
}

function emitNavigationStart(
    args: NavigationLifecycleEmissionArgs,
): MainzNavigationStartDetail | undefined {
    if (typeof document === "undefined" || args.sequence.started) {
        return undefined;
    }

    args.sequence.started = true;
    args.sequence.lifecycle = {
        mount: args.mount,
        mode: args.mode,
        navigationType: args.navigationType,
        path: args.path,
        matchedPath: args.matchedPath,
        locale: args.locale,
        url: args.url,
        basePath: args.basePath,
    };

    const detail = {
        mode: args.mode,
        navigationType: args.navigationType,
        path: args.path,
        matchedPath: args.matchedPath,
        locale: args.locale,
        url: args.url.toString(),
        basePath: args.basePath,
        navigationSequence: args.sequence.navigationSequence,
    } satisfies MainzNavigationStartDetail;

    args.mount.dispatchEvent(
        new CustomEvent<MainzNavigationStartDetail>(MAINZ_NAVIGATION_START_EVENT, {
            detail,
            bubbles: true,
        }),
    );

    return detail;
}

function emitNavigationReady(
    args: NavigationLifecycleEmissionArgs,
): MainzNavigationReadyDetail | undefined {
    if (typeof document === "undefined") {
        return undefined;
    }

    if (args.sequence.terminalState) {
        return undefined;
    }

    args.sequence.terminalState = "ready";

    const detail = {
        mode: args.mode,
        navigationType: args.navigationType,
        path: args.path,
        matchedPath: args.matchedPath,
        locale: args.locale,
        url: args.url.toString(),
        basePath: args.basePath,
        navigationSequence: args.sequence.navigationSequence,
    } satisfies MainzNavigationReadyDetail;

    args.mount.dispatchEvent(
        new CustomEvent<MainzNavigationReadyDetail>(MAINZ_NAVIGATION_READY_EVENT, {
            detail,
            bubbles: true,
        }),
    );

    return detail;
}

function finalizeNavigationReady(
    readyArgs: NavigationLifecycleEmissionArgs,
    finalize?: (args: NavigationLifecycleEmissionArgs) => void,
): void {
    if (finalize) {
        finalize(readyArgs);
        return;
    }

    emitNavigationReady(readyArgs);
}

function emitNavigationError(
    args: NavigationLifecycleEmissionArgs & {
        phase: MainzNavigationErrorDetail["phase"];
        error: unknown;
    },
): MainzNavigationErrorDetail | undefined {
    if (typeof document === "undefined") {
        return undefined;
    }

    if (args.sequence.terminalState) {
        return undefined;
    }

    args.sequence.terminalState = "error";

    const detail = {
        mode: args.mode,
        navigationType: args.navigationType,
        path: args.path,
        matchedPath: args.matchedPath,
        locale: args.locale,
        url: args.url.toString(),
        basePath: args.basePath,
        navigationSequence: args.sequence.navigationSequence,
        phase: args.phase,
        message: toErrorMessage(args.error),
        error: args.error,
    } satisfies MainzNavigationErrorDetail;

    args.mount.dispatchEvent(
        new CustomEvent<MainzNavigationErrorDetail>(MAINZ_NAVIGATION_ERROR_EVENT, {
            detail,
            bubbles: true,
        }),
    );

    return detail;
}

function abortNavigationSequence(
    sequence: NavigationSequenceState | undefined,
    args: Partial<NavigationLifecycleBaseArgs> & {
        reason: MainzNavigationAbortDetail["reason"];
    },
): MainzNavigationAbortDetail | undefined {
    if (!sequence || sequence.terminalState) {
        return undefined;
    }

    const lifecycle = sequence.lifecycle;
    const mount = lifecycle?.mount ?? args.mount;
    const mode = lifecycle?.mode ?? args.mode;
    const navigationType = lifecycle?.navigationType ?? args.navigationType;
    const path = lifecycle?.path ?? args.path;
    const matchedPath = lifecycle?.matchedPath ?? args.matchedPath;
    const locale = lifecycle?.locale ?? args.locale;
    const url = lifecycle?.url ?? args.url;
    const basePath = lifecycle?.basePath ?? args.basePath;

    if (!mount || !mode || !navigationType || !path || !matchedPath || !url || !basePath) {
        return undefined;
    }

    sequence.terminalState = "abort";
    sequence.controller.abort();

    const detail = {
        mode,
        navigationType,
        path,
        matchedPath,
        locale,
        url: url.toString(),
        basePath,
        navigationSequence: sequence.navigationSequence,
        reason: args.reason,
    } satisfies MainzNavigationAbortDetail;

    mount.dispatchEvent(
        new CustomEvent<MainzNavigationAbortDetail>(MAINZ_NAVIGATION_ABORT_EVENT, {
            detail,
            bubbles: true,
        }),
    );

    return detail;
}

function collectImmediateNavigationPages(
    entries: readonly (SpaPageConstructor | SpaPageDefinition | SpaLazyPageDefinition)[],
): SpaPageConstructor[] {
    const pages: SpaPageConstructor[] = [];

    for (const entry of entries) {
        if (isSpaLazyPageDefinition(entry)) {
            continue;
        }

        pages.push(isSpaPageDefinition(entry) ? entry.page : entry);
    }

    return pages;
}

function assertRegisteredPagePolicies(
    page: SpaPageConstructor,
    auth: AuthorizationRuntimeOptions | undefined,
): void {
    const missingPolicies = findMissingAuthorizationPolicies({
        authorizations: [resolvePageAuthorization(page)],
        policies: auth?.policies,
    });
    if (missingPolicies.length === 0) {
        return;
    }

    throw new Error(
        `Page "${page.name}" references unregistered authorization policies: ${
            missingPolicies.map((policyName) => `"${policyName}"`).join(", ")
        }. Register them under auth.policies before rendering protected routes.`,
    );
}

function resolvePagesAppLocales(
    pages: readonly (SpaPageConstructor | SpaPageDefinition | SpaLazyPageDefinition)[],
    notFound?: SpaPageConstructor | SpaPageDefinition | SpaLazyPageDefinition,
): readonly string[] | undefined {
    const inferredLocales = new Set<string>();
    const pageEntries = notFound ? [...pages, notFound] : [...pages];

    for (const entry of pageEntries) {
        if (isSpaLazyPageDefinition(entry)) {
            continue;
        }

        const page = isSpaPageDefinition(entry) ? entry.page : entry;
        for (const locale of resolvePageLocales(page) ?? []) {
            inferredLocales.add(locale);
        }
    }

    if (inferredLocales.size > 0) {
        return Array.from(inferredLocales);
    }

    const targetLocales = readMainzTargetLocales();
    return targetLocales.length > 0 ? targetLocales : undefined;
}

function resolveMainzNavigationMode(): NavigationMode {
    if (typeof __MAINZ_NAVIGATION_MODE__ !== "undefined") {
        return __MAINZ_NAVIGATION_MODE__;
    }

    const fromGlobal = (globalThis as Record<string, unknown>).__MAINZ_NAVIGATION_MODE__;
    if (fromGlobal === "spa" || fromGlobal === "mpa" || fromGlobal === "enhanced-mpa") {
        return fromGlobal;
    }

    return "enhanced-mpa";
}

function resolveMainzRenderMode(): "csr" | "ssg" {
    if (typeof __MAINZ_RENDER_MODE__ !== "undefined") {
        return __MAINZ_RENDER_MODE__;
    }

    const fromGlobal = (globalThis as Record<string, unknown>).__MAINZ_RENDER_MODE__;
    return fromGlobal === "ssg" ? "ssg" : "csr";
}

function resolveMainzBasePath(): string {
    if (typeof __MAINZ_BASE_PATH__ !== "undefined") {
        return __MAINZ_BASE_PATH__;
    }

    const fromGlobal = (globalThis as Record<string, unknown>).__MAINZ_BASE_PATH__;
    return typeof fromGlobal === "string" && fromGlobal.trim() ? fromGlobal : "/";
}

function resolveMainzDefaultLocale(): string | undefined {
    if (typeof __MAINZ_DEFAULT_LOCALE__ !== "undefined") {
        return __MAINZ_DEFAULT_LOCALE__;
    }

    const fromGlobal = (globalThis as Record<string, unknown>).__MAINZ_DEFAULT_LOCALE__;
    return typeof fromGlobal === "string" && fromGlobal.trim() ? fromGlobal : undefined;
}

function resolveMainzLocalePrefix(): "auto" | "always" {
    if (typeof __MAINZ_LOCALE_PREFIX__ !== "undefined") {
        return __MAINZ_LOCALE_PREFIX__;
    }

    const fromGlobal = (globalThis as Record<string, unknown>).__MAINZ_LOCALE_PREFIX__;
    return fromGlobal === "always" ? "always" : "auto";
}

function resolveMainzSiteUrl(): string | undefined {
    if (typeof __MAINZ_SITE_URL__ !== "undefined") {
        return __MAINZ_SITE_URL__ || undefined;
    }

    const fromGlobal = (globalThis as Record<string, unknown>).__MAINZ_SITE_URL__;
    return typeof fromGlobal === "string" && fromGlobal.trim() ? fromGlobal : undefined;
}

function readMainzTargetLocales(): readonly string[] {
    if (typeof __MAINZ_TARGET_LOCALES__ !== "undefined") {
        return __MAINZ_TARGET_LOCALES__;
    }

    const fromGlobal = (globalThis as Record<string, unknown>).__MAINZ_TARGET_LOCALES__;
    return Array.isArray(fromGlobal)
        ? fromGlobal.filter((value): value is string => typeof value === "string")
        : [];
}

async function bootstrapDocumentNavigation(
    mode: NavigationMode,
    options: ResolvedPageNavigationOptions,
    basePath: string,
    nextNavigationSequence: NavigationSequenceSource,
): Promise<void> {
    if (!options.pages.length && !options.notFound) {
        return;
    }

    const mount = resolveSpaMount(options.mount);
    const routes = normalizeSpaRoutes(options.pages, options.notFound);
    const url = new URL(window.location.href);
    const currentPath = resolveRoutePath(url, basePath, options.resolvePath, options.locales) ??
        "/";
    const routeMatch = findMatchingSpaRoute(routes, currentPath);
    const locale = resolveNavigationLocale(url, basePath, options.locales);
    const sequence = createNavigationSequenceState(nextNavigationSequence);

    emitNavigationStart({
        sequence,
        mount,
        mode,
        navigationType: "initial",
        path: routeMatch?.route.path ?? currentPath,
        matchedPath: currentPath,
        locale,
        url,
        basePath,
    });

    try {
        const existingContext = await resolveMountedRouteContext(mount, routes, {
            routeMatch,
            url,
            currentPath,
            basePath,
            locale,
            auth: options.auth,
            serviceContainer: options.serviceContainer,
            locales: options.locales,
            mode,
            nextNavigationSequence,
            sequence,
        });
        if (existingContext && typeof existingContext !== "string") {
            applyNavigationLocale(locale, url, basePath, options.onLocaleChange);
            options.onRoute?.(existingContext);
            emitNavigationReady({
                sequence,
                mount,
                mode,
                navigationType: existingContext.navigationType,
                path: existingContext.path,
                matchedPath: existingContext.matchedPath,
                locale: existingContext.locale,
                url: existingContext.url,
                basePath: existingContext.basePath,
            });
            return;
        }

        if (existingContext === "redirected" || existingContext === "forbidden") {
            if (existingContext === "forbidden") {
                applyNavigationLocale(locale, url, basePath, options.onLocaleChange);
                emitNavigationReady({
                    sequence,
                    mount,
                    mode,
                    navigationType: "initial",
                    path: routeMatch?.route.path ?? currentPath,
                    matchedPath: currentPath,
                    locale,
                    url,
                    basePath,
                });
            }
            return;
        }

        await renderSpaRoute({
            routes,
            mount,
            url,
            navigationType: "initial",
            basePath,
            auth: options.auth,
            serviceContainer: options.serviceContainer,
            locales: options.locales,
            resolvePath: options.resolvePath,
            onLocaleChange: options.onLocaleChange,
            onRoute: options.onRoute,
            mode,
            nextNavigationSequence,
            sequence,
        });
    } catch (error) {
        emitNavigationError({
            sequence,
            mount,
            mode,
            navigationType: "initial",
            path: routeMatch?.route.path ?? currentPath,
            matchedPath: currentPath,
            locale,
            url,
            basePath,
            phase: "document-bootstrap",
            error,
        });
        throw error;
    }
}

async function resolveMountedRouteContext(
    mount: HTMLElement,
    routes: readonly NormalizedSpaRoute[],
    context: {
        routeMatch?: SpaRouteMatch;
        url: URL;
        currentPath: string;
        basePath: string;
        locale?: string;
        auth?: AuthorizationRuntimeOptions;
        serviceContainer?: ServiceContainer;
        locales?: readonly string[];
        mode: NavigationMode;
        nextNavigationSequence: NavigationSequenceSource;
        sequence: NavigationSequenceState;
    },
): Promise<SpaNavigationRenderContext | "redirected" | "forbidden" | null> {
    const routeSnapshot = readInitialRouteSnapshot();
    const matchedPage = context.routeMatch?.route.page;
    if (matchedPage) {
        ensurePageCustomElement(matchedPage);

        const mountedElement = mount.querySelector(matchedPage.getTagName());
        if (isHtmlElement(mountedElement)) {
            const params = context.routeMatch?.params ?? {};
            const authorization = resolvePageAuthorization(matchedPage);
            const principal = await resolveCurrentPrincipal(context.auth);
            const accessDecision = await evaluatePageAuthorization({
                authorization,
                principal,
                policies: context.auth?.policies,
            });

            if (accessDecision.status === "redirect-login") {
                await redirectUnauthorizedRouteToLogin({
                    routes,
                    mount,
                    url: context.url,
                    navigationType: "initial",
                    basePath: context.basePath,
                    currentPath: context.currentPath,
                    locale: context.locale,
                    auth: context.auth,
                    serviceContainer: context.serviceContainer,
                    locales: context.locales,
                    mode: context.mode,
                    nextNavigationSequence: context.nextNavigationSequence,
                    sequence: context.sequence,
                });
                return "redirected";
            }

            if (accessDecision.status === "forbidden") {
                renderForbiddenRoute(mount);
                return "forbidden";
            }

            const matchedSnapshot = resolveMatchingSnapshot(routeSnapshot, {
                mountedElement,
                path: context.routeMatch?.route.path ?? context.currentPath,
                matchedPath: context.currentPath,
                params,
                locale: context.locale,
            });
            if (matchedSnapshot) {
                const snapshotRouteContext = attachServiceContainer(createRouteContext({
                    path: context.routeMatch?.route.path ?? context.currentPath,
                    matchedPath: context.currentPath,
                    params,
                    locale: context.locale,
                    url: context.url,
                    renderMode: resolveMainzRenderMode(),
                    navigationMode: context.mode,
                    principal,
                    profile: createRouteProfileContext(context.basePath),
                }), context.serviceContainer);
                (mountedElement as RoutedPageElement).data = matchedSnapshot.data;
                applyPageLifecycleProps(mountedElement as RoutedPageElement, {
                    route: snapshotRouteContext,
                    data: matchedSnapshot.data,
                    head: matchedSnapshot.head,
                });
            }
            const data = matchedSnapshot
                ? matchedSnapshot.data
                : await resolvePageRouteData({
                    page: matchedPage,
                    pageElement: mountedElement as RoutedPageElement,
                    path: context.routeMatch?.route.path ?? context.currentPath,
                    matchedPath: context.currentPath,
                    params,
                    locale: context.locale,
                    principal,
                    url: context.url,
                    signal: context.sequence.controller.signal,
                    basePath: context.basePath,
                    navigationMode: context.mode,
                    serviceContainer: context.serviceContainer,
                });
            const routeContext = {
                page: matchedPage,
                path: context.routeMatch?.route.path ?? context.currentPath,
                matchedPath: context.currentPath,
                params: context.routeMatch?.params ?? {},
                principal,
                authorization,
                data,
                head: matchedSnapshot?.head ?? resolveSpaRouteHead({
                    page: matchedPage,
                    pageElement: mountedElement as RoutedPageElement,
                    path: context.routeMatch?.route.path ?? context.currentPath,
                    matchedPath: context.currentPath,
                    locale: context.locale,
                    locales: context.locales,
                    data,
                    principal,
                    url: context.url,
                    basePath: context.basePath,
                    navigationMode: context.mode,
                }),
                locale: context.locale,
                url: context.url,
                navigationType: "initial",
                basePath: context.basePath,
            } satisfies SpaNavigationRenderContext;
            attachServiceContainer(routeContext, context.serviceContainer);

            applySpaRouteContext(mountedElement, routeContext);
            applyResolvedPageHeadToDocument(routeContext.head);
            return routeContext;
        }
    }

    for (const route of routes) {
        if (!route.page) {
            continue;
        }

        const tagName = route.page.getTagName();
        const mountedElement = mount.querySelector(tagName);
        if (!isHtmlElement(mountedElement)) {
            continue;
        }

        ensurePageCustomElement(route.page);

        const params = context.routeMatch?.route === route ? context.routeMatch.params : {};
        const authorization = resolvePageAuthorization(route.page);
        const principal = await resolveCurrentPrincipal(context.auth);
        const accessDecision = await evaluatePageAuthorization({
            authorization,
            principal,
            policies: context.auth?.policies,
        });

        if (accessDecision.status === "redirect-login") {
            await redirectUnauthorizedRouteToLogin({
                routes,
                mount,
                url: context.url,
                navigationType: "initial",
                basePath: context.basePath,
                currentPath: context.currentPath,
                locale: context.locale,
                auth: context.auth,
                locales: context.locales,
                mode: context.mode,
                nextNavigationSequence: context.nextNavigationSequence,
                sequence: context.sequence,
            });
            return "redirected";
        }

        if (accessDecision.status === "forbidden") {
            renderForbiddenRoute(mount);
            return "forbidden";
        }

        const matchedSnapshot = resolveMatchingSnapshot(routeSnapshot, {
            mountedElement,
            path: route.path,
            matchedPath: context.currentPath,
            params,
            locale: context.locale,
        });
        if (matchedSnapshot) {
            const snapshotRouteContext = attachServiceContainer(createRouteContext({
                path: route.path,
                matchedPath: context.currentPath,
                params,
                locale: context.locale,
                url: context.url,
                renderMode: resolveMainzRenderMode(),
                navigationMode: context.mode,
                principal,
                profile: createRouteProfileContext(context.basePath),
            }), context.serviceContainer);
            (mountedElement as RoutedPageElement).data = matchedSnapshot.data;
            applyPageLifecycleProps(mountedElement as RoutedPageElement, {
                route: snapshotRouteContext,
                data: matchedSnapshot.data,
                head: matchedSnapshot.head,
            });
        }
        const data = matchedSnapshot
            ? matchedSnapshot.data
            : await resolvePageRouteData({
                page: route.page,
                pageElement: mountedElement as RoutedPageElement,
                path: route.path,
                matchedPath: context.currentPath,
                params,
                locale: context.locale,
                principal,
                url: context.url,
                signal: context.sequence.controller.signal,
                basePath: context.basePath,
                navigationMode: context.mode,
                serviceContainer: context.serviceContainer,
            });
        const routeContext = {
            page: route.page,
            path: route.path,
            matchedPath: context.currentPath,
            params,
            principal,
            authorization,
            data,
            head: matchedSnapshot?.head ?? resolveSpaRouteHead({
                page: route.page,
                pageElement: mountedElement as RoutedPageElement,
                path: route.path,
                matchedPath: context.currentPath,
                locale: context.locale,
                locales: context.locales,
                data,
                principal,
                url: context.url,
                basePath: context.basePath,
                navigationMode: context.mode,
            }),
            locale: context.locale,
            url: context.url,
            navigationType: "initial",
            basePath: context.basePath,
        } satisfies SpaNavigationRenderContext;
        attachServiceContainer(routeContext, context.serviceContainer);

        applySpaRouteContext(mountedElement, routeContext);
        applyResolvedPageHeadToDocument(routeContext.head);
        return routeContext;
    }

    return null;
}

function readInitialRouteSnapshot(): InitialRouteSnapshot | undefined {
    const snapshotScript = document.getElementById("mainz-route-snapshot");
    if (!(snapshotScript instanceof Element) || snapshotScript.tagName !== "SCRIPT") {
        return undefined;
    }

    const snapshotText = snapshotScript.textContent?.trim();
    if (!snapshotText) {
        return undefined;
    }

    try {
        const parsed = JSON.parse(snapshotText) as Record<string, unknown>;
        if (!isInitialRouteSnapshot(parsed)) {
            return undefined;
        }

        return parsed;
    } catch {
        return undefined;
    }
}

function resolveMatchingSnapshot(
    snapshot: InitialRouteSnapshot | undefined,
    args: {
        mountedElement: HTMLElement;
        path: string;
        matchedPath: string;
        params: Record<string, string>;
        locale?: string;
    },
): InitialRouteSnapshot | undefined {
    if (!snapshot) {
        return undefined;
    }

    if (snapshot.pageTagName !== args.mountedElement.tagName.toLowerCase()) {
        return undefined;
    }

    if (snapshot.path !== args.path || snapshot.matchedPath !== args.matchedPath) {
        return undefined;
    }

    if ((snapshot.locale ?? undefined) !== (args.locale ?? undefined)) {
        return undefined;
    }

    if (!recordsEqual(snapshot.params, args.params)) {
        return undefined;
    }

    return snapshot;
}

function isInitialRouteSnapshot(value: unknown): value is InitialRouteSnapshot {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return typeof candidate.pageTagName === "string" &&
        typeof candidate.path === "string" &&
        typeof candidate.matchedPath === "string" &&
        isStringRecord(candidate.params) &&
        (typeof candidate.locale === "string" || typeof candidate.locale === "undefined") &&
        (typeof candidate.head === "undefined" || isPageHeadDefinition(candidate.head));
}

function recordsEqual(left: Record<string, string>, right: Record<string, string>): boolean {
    const leftEntries = Object.entries(left);
    const rightEntries = Object.entries(right);
    if (leftEntries.length !== rightEntries.length) {
        return false;
    }

    return leftEntries.every(([key, value]) => right[key] === value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
    return typeof value === "object" && value !== null &&
        Object.values(value).every((entry) => typeof entry === "string");
}

function isPageHeadDefinition(value: unknown): value is PageHeadDefinition {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return "title" in candidate || "meta" in candidate || "links" in candidate;
}
