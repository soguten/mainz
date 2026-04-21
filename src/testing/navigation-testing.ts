import { setupMainzDom } from "./mainz-testing.ts";
import {
    MAINZ_NAVIGATION_ABORT_EVENT,
    MAINZ_NAVIGATION_ERROR_EVENT,
    MAINZ_NAVIGATION_READY_EVENT,
    MAINZ_NAVIGATION_START_EVENT,
    type MainzNavigationAbortDetail,
    type MainzNavigationErrorDetail,
    type MainzNavigationReadyDetail,
    type MainzNavigationStartDetail,
} from "../runtime-events.ts";
import { waitForCustomEvent } from "./async-testing.ts";

/**
 * Runtime helpers used by Mainz navigation tests.
 */
export type NavigationTestRuntime =
    & typeof import("../navigation/index.ts")
    & typeof import("../navigation/internal.ts");

let navigationRuntimePromise: Promise<NavigationTestRuntime> | undefined;

/**
 * Loads the navigation runtime used by focused framework tests.
 */
export async function loadNavigationTestRuntime(): Promise<NavigationTestRuntime> {
    if (!navigationRuntimePromise) {
        navigationRuntimePromise = Promise.all([
            import("../navigation/index.ts"),
            import("../navigation/internal.ts"),
        ]).then(([publicRuntime, internalRuntime]) => ({
            ...publicRuntime,
            ...internalRuntime,
        }));
    }

    return await navigationRuntimePromise;
}

/**
 * Resets DOM and runtime globals used by navigation-focused tests.
 */
export function resetMainzNavigationTestDom(): void {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    document.title = "";
    document.documentElement.removeAttribute("lang");
    delete document.documentElement.dataset.mainzNavigation;
    delete document.documentElement.dataset.mainzTransitionPhase;
    delete document.documentElement.dataset.mainzViewTransitions;
    delete (globalThis as Record<string, unknown>).__MAINZ_RENDER_MODE__;
    delete (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__;
    delete (globalThis as Record<string, unknown>).__MAINZ_NAVIGATION_MODE__;
    delete (globalThis as Record<string, unknown>).__MAINZ_BASE_PATH__;
    delete (globalThis as Record<string, unknown>).__MAINZ_APP_LOCALES__;
    delete (globalThis as Record<string, unknown>).__MAINZ_DEFAULT_LOCALE__;
    delete (globalThis as Record<string, unknown>).__MAINZ_LOCALE_PREFIX__;
    delete (globalThis as Record<string, unknown>).__MAINZ_SITE_URL__;
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/");
}

/**
 * Prepares a clean DOM and returns the Mainz navigation runtime for a test.
 */
export async function prepareNavigationTest(): Promise<NavigationTestRuntime> {
    await setupMainzDom();
    resetMainzNavigationTestDom();
    return await loadNavigationTestRuntime();
}

/**
 * Waits for the next matching Mainz navigation-ready event.
 */
export async function waitForNavigationReady(options?: {
    target?: EventTarget;
    mode?: MainzNavigationReadyDetail["mode"];
    path?: string;
    matchedPath?: string;
    locale?: string;
    navigationType?: MainzNavigationReadyDetail["navigationType"];
    navigationSequence?: number;
    message?: string;
}): Promise<MainzNavigationReadyDetail> {
    return await waitForCustomEvent<MainzNavigationReadyDetail>(MAINZ_NAVIGATION_READY_EVENT, {
        target: options?.target,
        predicate: (detail) => {
            if (!detail) {
                return false;
            }

            if (options?.mode && detail.mode !== options.mode) {
                return false;
            }

            if (options?.path && detail.path !== options.path) {
                return false;
            }

            if (options?.matchedPath && detail.matchedPath !== options.matchedPath) {
                return false;
            }

            if (options?.locale && detail.locale !== options.locale) {
                return false;
            }

            if (options?.navigationType && detail.navigationType !== options.navigationType) {
                return false;
            }

            if (
                typeof options?.navigationSequence === "number" &&
                detail.navigationSequence !== options.navigationSequence
            ) {
                return false;
            }

            return true;
        },
        message: options?.message ?? "Expected Mainz navigation ready event.",
    });
}

/**
 * Waits for the next matching Mainz navigation-start event.
 */
export async function waitForNavigationStart(options?: {
    target?: EventTarget;
    mode?: MainzNavigationStartDetail["mode"];
    path?: string;
    matchedPath?: string;
    locale?: string;
    navigationType?: MainzNavigationStartDetail["navigationType"];
    navigationSequence?: number;
    message?: string;
}): Promise<MainzNavigationStartDetail> {
    return await waitForCustomEvent<MainzNavigationStartDetail>(MAINZ_NAVIGATION_START_EVENT, {
        target: options?.target,
        predicate: (detail) => {
            if (!detail) {
                return false;
            }

            if (options?.mode && detail.mode !== options.mode) {
                return false;
            }

            if (options?.path && detail.path !== options.path) {
                return false;
            }

            if (options?.matchedPath && detail.matchedPath !== options.matchedPath) {
                return false;
            }

            if (options?.locale && detail.locale !== options.locale) {
                return false;
            }

            if (options?.navigationType && detail.navigationType !== options.navigationType) {
                return false;
            }

            if (
                typeof options?.navigationSequence === "number" &&
                detail.navigationSequence !== options.navigationSequence
            ) {
                return false;
            }

            return true;
        },
        message: options?.message ?? "Expected Mainz navigation start event.",
    });
}

/**
 * Waits for the next matching Mainz navigation-error event.
 */
export async function waitForNavigationError(options?: {
    target?: EventTarget;
    mode?: MainzNavigationErrorDetail["mode"];
    path?: string;
    matchedPath?: string;
    locale?: string;
    navigationType?: MainzNavigationErrorDetail["navigationType"];
    navigationSequence?: number;
    phase?: MainzNavigationErrorDetail["phase"];
    message?: string;
}): Promise<MainzNavigationErrorDetail> {
    return await waitForCustomEvent<MainzNavigationErrorDetail>(MAINZ_NAVIGATION_ERROR_EVENT, {
        target: options?.target,
        predicate: (detail) => {
            if (!detail) {
                return false;
            }

            if (options?.mode && detail.mode !== options.mode) {
                return false;
            }

            if (options?.path && detail.path !== options.path) {
                return false;
            }

            if (options?.matchedPath && detail.matchedPath !== options.matchedPath) {
                return false;
            }

            if (options?.locale && detail.locale !== options.locale) {
                return false;
            }

            if (options?.navigationType && detail.navigationType !== options.navigationType) {
                return false;
            }

            if (
                typeof options?.navigationSequence === "number" &&
                detail.navigationSequence !== options.navigationSequence
            ) {
                return false;
            }

            if (options?.phase && detail.phase !== options.phase) {
                return false;
            }

            return true;
        },
        message: options?.message ?? "Expected Mainz navigation error event.",
    });
}

/**
 * Waits for the next matching Mainz navigation-abort event.
 */
export async function waitForNavigationAbort(options?: {
    target?: EventTarget;
    mode?: MainzNavigationAbortDetail["mode"];
    path?: string;
    matchedPath?: string;
    locale?: string;
    navigationType?: MainzNavigationAbortDetail["navigationType"];
    navigationSequence?: number;
    reason?: MainzNavigationAbortDetail["reason"];
    message?: string;
}): Promise<MainzNavigationAbortDetail> {
    return await waitForCustomEvent<MainzNavigationAbortDetail>(MAINZ_NAVIGATION_ABORT_EVENT, {
        target: options?.target,
        predicate: (detail) => {
            if (!detail) {
                return false;
            }

            if (options?.mode && detail.mode !== options.mode) {
                return false;
            }

            if (options?.path && detail.path !== options.path) {
                return false;
            }

            if (options?.matchedPath && detail.matchedPath !== options.matchedPath) {
                return false;
            }

            if (options?.locale && detail.locale !== options.locale) {
                return false;
            }

            if (options?.navigationType && detail.navigationType !== options.navigationType) {
                return false;
            }

            if (
                typeof options?.navigationSequence === "number" &&
                detail.navigationSequence !== options.navigationSequence
            ) {
                return false;
            }

            if (options?.reason && detail.reason !== options.reason) {
                return false;
            }

            return true;
        },
        message: options?.message ?? "Expected Mainz navigation abort event.",
    });
}
