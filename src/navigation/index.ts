import { requirePageRoutePath, type PageHeadDefinition, type PageLoadContext } from "../components/page.ts";
import { ensureMainzCustomElementDefined } from "../components/registry.ts";
import { MAINZ_LOCALE_CHANGE_EVENT, type MainzLocaleChangeDetail } from "../runtime-events.ts";
import { buildRouteHead, resolveLocaleRedirectPath, shouldPrefixLocaleForRoute } from "../routing/index.ts";
import type { NavigationMode } from "../routing/types.ts";

const MAINZ_SCROLL_KEY_PREFIX = "mainz:scroll:";
const MAINZ_PREFETCH_ATTR = "data-mainz-prefetched";
const MAINZ_ENTERING_TRANSITION_MS = 260;
const MAINZ_HEAD_MANAGED_ATTR = "data-mainz-head-managed";

export type SpaRouteParams = Readonly<Record<string, string>>;
export type RoutePathResolver = (context: { url: URL; basePath: string }) => string | null;

export interface NavigationLocaleContext {
    locale: string;
    url: URL;
    basePath: string;
}

export interface SpaPageConstructor extends CustomElementConstructor {
    page?: {
        locales?: readonly string[];
        head?: PageHeadDefinition;
    };
    load?(context: PageLoadContext): unknown | Promise<unknown>;
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
    locales?: readonly string[];
    resolvePath?: RoutePathResolver;
    onLocaleChange?(context: NavigationLocaleContext): void;
    onRoute?(context: SpaNavigationRenderContext): void;
    onBeforeRender?(context: SpaNavigationRenderContext): void;
    spa?: SpaNavigationOptions;
}

export interface StartPagesAppOptions {
    mount?: string | Element;
    pages: readonly (SpaPageConstructor | SpaPageDefinition | SpaLazyPageDefinition)[];
    notFound?: SpaPageConstructor | SpaPageDefinition | SpaLazyPageDefinition;
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
    locales?: readonly string[];
    resolvePath?: RoutePathResolver;
    onLocaleChange?(context: NavigationLocaleContext): void;
    onRoute?(context: SpaNavigationRenderContext): void;
}

export function startPagesApp(options: StartPagesAppOptions): NavigationController {
    return startNavigation({
        mode: resolveMainzNavigationMode(),
        basePath: resolveMainzBasePath(),
        mount: options.mount,
        pages: options.pages,
        notFound: options.notFound,
        locales: resolvePagesAppLocales(options.pages, options.notFound),
    });
}

export function startNavigation(options: StartNavigationOptions): NavigationController {
    if (typeof document === "undefined" || typeof window === "undefined") {
        return {
            mode: options.mode,
            cleanup() {},
        };
    }

    const normalizedBasePath = normalizeNavigationBasePath(options.basePath);
    const pageOptions = resolvePageNavigationOptions(options);

    document.documentElement.dataset.mainzNavigation = options.mode;

    if (options.mode === "spa") {
        return startSpaNavigation(options.mode, normalizedBasePath, pageOptions);
    }

    if (pageOptions) {
        void bootstrapDocumentNavigation(pageOptions, normalizedBasePath).catch(reportSpaNavigationError);
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

    if (resolvedUrl.pathname === window.location.pathname && resolvedUrl.search === window.location.search) {
        return false;
    }

    return true;
}

export function createScrollStorageKey(locationLike: Pick<Location, "pathname" | "search">): string {
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
    const initialUrl = resolveSpaLocalizedDocumentUrl(new URL(window.location.href), normalizedBasePath, pageOptions.locales);
    if (initialUrl.toString() !== window.location.href) {
        window.history.replaceState({ mainzNavigation: "spa" }, "", initialUrl);
    }

    void renderSpaRoute({
        routes,
        mount,
        url: initialUrl,
        navigationType: "initial",
        basePath: normalizedBasePath,
        locales: pageOptions.locales,
        resolvePath: pageOptions.resolvePath,
        onLocaleChange: pageOptions.onLocaleChange,
        onRoute: pageOptions.onRoute,
    }).catch(reportSpaNavigationError);

    const handleClick = (event: Event) => {
        if (!(event instanceof MouseEvent)) {
            return;
        }

        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
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

        const effectiveTargetUrl = resolveSpaLocalizedDocumentUrl(targetUrl, normalizedBasePath, pageOptions.locales);

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

        void renderSpaRoute({
            routes,
            mount,
            url: effectiveTargetUrl,
            navigationType: "push",
            basePath: normalizedBasePath,
            routeMatch,
            locales: pageOptions.locales,
            resolvePath: pageOptions.resolvePath,
            onLocaleChange: pageOptions.onLocaleChange,
            onRoute: pageOptions.onRoute,
        })
            .then((rendered) => {
                if (!rendered) {
                    return;
                }

                window.history.pushState({ mainzNavigation: "spa" }, "", effectiveTargetUrl);
                updateSpaScrollPosition(effectiveTargetUrl);
            })
            .catch(reportSpaNavigationError);
    };

    const handlePopState = () => {
        const currentUrl = new URL(window.location.href);
        const effectiveCurrentUrl = resolveSpaLocalizedDocumentUrl(currentUrl, normalizedBasePath, pageOptions.locales);
        if (effectiveCurrentUrl.toString() !== currentUrl.toString()) {
            window.history.replaceState({ mainzNavigation: "spa" }, "", effectiveCurrentUrl);
        }
        void renderSpaRoute({
            routes,
            mount,
            url: effectiveCurrentUrl,
            navigationType: "pop",
            basePath: normalizedBasePath,
            locales: pageOptions.locales,
            resolvePath: pageOptions.resolvePath,
            onLocaleChange: pageOptions.onLocaleChange,
            onRoute: pageOptions.onRoute,
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
    locales?: readonly string[];
    resolvePath?: RoutePathResolver;
    onLocaleChange?: ResolvedPageNavigationOptions["onLocaleChange"];
    onRoute?: ResolvedPageNavigationOptions["onRoute"];
}): Promise<boolean> {
    const currentPath = resolveRoutePath(args.url, args.basePath, args.resolvePath, args.locales);
    if (!currentPath) {
        return false;
    }

    const routeMatch = args.routeMatch ?? findMatchingSpaRoute(args.routes, currentPath);
    if (!routeMatch) {
        return false;
    }

    const page = await resolveSpaRoutePage(routeMatch.route);
    ensurePageCustomElement(page);

    const pageTagName = page.getTagName();
    const locale = resolveNavigationLocale(args.url, args.basePath, args.locales);
    const data = await resolvePageRouteData({
        page,
        params: routeMatch.params,
        locale,
        url: args.url,
    });
    const head = resolveSpaRouteHead({
        page,
        matchedPath: currentPath,
        locale,
        locales: args.locales,
    });
    const routeContext = {
        page,
        path: routeMatch.route.path,
        matchedPath: currentPath,
        params: routeMatch.params,
        data,
        head,
        locale,
        url: args.url,
        navigationType: args.navigationType,
        basePath: args.basePath,
    } satisfies SpaNavigationRenderContext;

    applyNavigationLocale(locale, args.url, args.basePath, args.onLocaleChange);

    args.onRoute?.(routeContext);

    const existingElement = args.mount.querySelector(pageTagName);
    if (args.navigationType === "initial" && existingElement instanceof HTMLElement) {
        applySpaRouteContext(existingElement, routeContext);
        applyResolvedPageHeadToDocument(head);
        return true;
    }

    const nextPageElement = document.createElement(pageTagName);
    applySpaRouteContext(nextPageElement, routeContext);
    args.mount.replaceChildren(nextPageElement);
    return true;
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

function normalizeSpaRoute(entry: SpaPageConstructor | SpaPageDefinition | SpaLazyPageDefinition): NormalizedSpaRoute {
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
    const missingRouteMessage = `SPA navigation page "${page.name}" must define @Route(...) or an explicit route path.`;
    const path = normalizeRoutePath(
        isSpaPageDefinition(entry)
            ? entry.path ?? requirePageRoutePath(page, missingRouteMessage)
            : requirePageRoutePath(page, missingRouteMessage),
    );

    if (!path) {
        throw new Error(`SPA navigation page "${page.name}" must define @Route(...) or an explicit route path.`);
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
            params["*"] = currentSegments.slice(currentIndex).map(decodeRouteParamSegment).join("/");
            return params;
        }

        if (routeSegment.startsWith("[...")) {
            params[routeSegment.slice(4, -1)] = currentSegments.slice(currentIndex).map(decodeRouteParamSegment).join("/");
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
    if (mount instanceof HTMLElement) {
        return mount;
    }

    const selector = typeof mount === "string" ? mount : "#app";
    const resolved = document.querySelector(selector);
    if (!(resolved instanceof HTMLElement)) {
        throw new Error(`SPA navigation could not find the mount element "${selector}".`);
    }

    return resolved;
}

function ensurePageCustomElement(page: SpaPageConstructor): void {
    ensureMainzCustomElementDefined(page as unknown as CustomElementConstructor & { getTagName(): string });
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

    throw new Error("SPA lazy navigation loader must resolve to a Page constructor or { default: Page }.");
}

function applySpaRouteContext(element: HTMLElement, context: SpaNavigationRenderContext): void {
    const nextProps = {
        ...readSpaElementProps(element),
        route: context,
        data: context.data,
    };

    (element as HTMLElement & { props?: Record<string, unknown> }).props = nextProps;

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
    matchedPath: string;
    locale?: string;
    locales?: readonly string[];
}): PageHeadDefinition | undefined {
    const routeLocales = resolveSpaRouteLocales(args.page, args.locales);
    const activeLocale = args.locale ?? routeLocales[0] ?? resolveMainzDefaultLocale();
    if (!activeLocale) {
        return args.page.page?.head;
    }

    return buildRouteHead({
        path: args.matchedPath,
        locale: activeLocale,
        locales: routeLocales,
        head: args.page.page?.head,
        localePrefix: resolveMainzLocalePrefix(),
        defaultLocale: resolveMainzDefaultLocale() ?? routeLocales[0],
        basePath: resolveMainzBasePath(),
        siteUrl: resolveMainzSiteUrl(),
    });
}

function resolveSpaRouteLocales(page: SpaPageConstructor, fallbackLocales?: readonly string[]): readonly string[] {
    const pageLocales = page.page?.locales;
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
    params: SpaRouteParams;
    locale?: string;
    url: URL;
}): Promise<unknown> {
    if (typeof args.page.load !== "function") {
        return undefined;
    }

    const context: PageLoadContext = {
        params: args.params,
        locale: args.locale,
        url: args.url,
        renderMode: resolveMainzRenderMode(),
        navigationMode: resolveMainzNavigationMode(),
    };

    return await args.page.load(context);
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

    if (!isUrlWithinNavigationBasePath(resolvedUrl, normalizeNavigationBasePath(options.basePath))) {
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

    const withLeadingSlash = normalizedBasePath.startsWith("/") ? normalizedBasePath : `/${normalizedBasePath}`;
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

function resolveSpaLocalizedDocumentUrl(url: URL, basePath: string, locales?: readonly string[]): URL {
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

function shouldRedirectSpaRootToLocalizedPath(url: URL, basePath: string, locales?: readonly string[]): boolean {
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
        preferredLocales.push(...navigator.languages.filter((value): value is string => typeof value === "string"));
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

    document.documentElement.lang = locale;
    document.dispatchEvent(new CustomEvent<MainzLocaleChangeDetail>(MAINZ_LOCALE_CHANGE_EVENT, {
        detail: {
            locale,
            url: url.toString(),
            basePath,
        },
    }));
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

function resolveNavigationLocale(url: URL, basePath: string, locales?: readonly string[]): string | undefined {
    if (!locales?.length) {
        const documentLocale = document.documentElement.lang.trim();
        return documentLocale || undefined;
    }

    const appPath = toAppRelativePath(url, basePath) ?? "/";
    const firstSegment = appPath.split("/").filter(Boolean)[0];

    if (firstSegment) {
        const matchedLocale = locales.find((locale) => locale.toLowerCase() === firstSegment.toLowerCase());
        if (matchedLocale) {
            return matchedLocale;
        }
    }

    const documentLocale = document.documentElement.lang.trim();
    if (!documentLocale) {
        return locales[0];
    }

    return locales.find((locale) => locale.toLowerCase() === documentLocale.toLowerCase()) ?? locales[0];
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

function resolvePageNavigationOptions(options: StartNavigationOptions): ResolvedPageNavigationOptions | undefined {
    const legacySpaOptions = options.spa;
    const pages = options.pages ?? legacySpaOptions?.pages;
    const notFound = options.notFound ?? legacySpaOptions?.notFound;
    const mount = options.mount ?? legacySpaOptions?.mount;
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
        locales,
        resolvePath,
        onLocaleChange,
        onRoute,
    };
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
        for (const locale of page.page?.locales ?? []) {
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
    return Array.isArray(fromGlobal) ? fromGlobal.filter((value): value is string => typeof value === "string") : [];
}

async function bootstrapDocumentNavigation(
    options: ResolvedPageNavigationOptions,
    basePath: string,
): Promise<void> {
    if (!options.pages.length && !options.notFound) {
        return;
    }

    const mount = resolveSpaMount(options.mount);
    const routes = normalizeSpaRoutes(options.pages, options.notFound);
    const url = new URL(window.location.href);
    const currentPath = resolveRoutePath(url, basePath, options.resolvePath, options.locales) ?? "/";
    const routeMatch = findMatchingSpaRoute(routes, currentPath);
    const locale = resolveNavigationLocale(url, basePath, options.locales);

    const existingContext = await resolveMountedRouteContext(mount, routes, {
        routeMatch,
        url,
        currentPath,
        basePath,
        locale,
        locales: options.locales,
    });
    if (existingContext) {
        applyNavigationLocale(locale, url, basePath, options.onLocaleChange);
        options.onRoute?.(existingContext);
        return;
    }

    await renderSpaRoute({
        routes,
        mount,
        url,
        navigationType: "initial",
        basePath,
        locales: options.locales,
        resolvePath: options.resolvePath,
        onLocaleChange: options.onLocaleChange,
        onRoute: options.onRoute,
    });
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
        locales?: readonly string[];
    },
): Promise<SpaNavigationRenderContext | null> {
    const matchedPage = context.routeMatch?.route.page;
    if (matchedPage) {
        ensurePageCustomElement(matchedPage);

        const mountedElement = mount.querySelector(matchedPage.getTagName());
            if (mountedElement instanceof HTMLElement) {
                const data = await resolvePageRouteData({
                    page: matchedPage,
                    params: context.routeMatch?.params ?? {},
                    locale: context.locale,
                    url: context.url,
                });
                const routeContext = {
                page: matchedPage,
                path: context.routeMatch?.route.path ?? context.currentPath,
                matchedPath: context.currentPath,
                params: context.routeMatch?.params ?? {},
                data,
                head: resolveSpaRouteHead({
                    page: matchedPage,
                    matchedPath: context.currentPath,
                    locale: context.locale,
                    locales: context.locales,
                }),
                locale: context.locale,
                url: context.url,
                navigationType: "initial",
                basePath: context.basePath,
                } satisfies SpaNavigationRenderContext;

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
        if (!(mountedElement instanceof HTMLElement)) {
            continue;
        }

        ensurePageCustomElement(route.page);

        const data = await resolvePageRouteData({
            page: route.page,
            params: context.routeMatch?.route === route ? context.routeMatch.params : {},
            locale: context.locale,
            url: context.url,
        });
        const routeContext = {
            page: route.page,
            path: route.path,
            matchedPath: context.currentPath,
            params: context.routeMatch?.route === route ? context.routeMatch.params : {},
            data,
            head: resolveSpaRouteHead({
                page: route.page,
                matchedPath: context.currentPath,
                locale: context.locale,
                locales: context.locales,
            }),
            locale: context.locale,
            url: context.url,
            navigationType: "initial",
            basePath: context.basePath,
        } satisfies SpaNavigationRenderContext;

        applySpaRouteContext(mountedElement, routeContext);
        applyResolvedPageHeadToDocument(routeContext.head);
        return routeContext;
    }

    return null;
}
