import { setupMainzDom } from "./mainz-testing.ts";

let navigationRuntimePromise: Promise<typeof import("../navigation/index.ts")> | undefined;

export async function loadNavigationTestRuntime(): Promise<typeof import("../navigation/index.ts")> {
    if (!navigationRuntimePromise) {
        navigationRuntimePromise = import("../navigation/index.ts");
    }

    return await navigationRuntimePromise;
}

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
    delete (globalThis as Record<string, unknown>).__MAINZ_TARGET_LOCALES__;
    delete (globalThis as Record<string, unknown>).__MAINZ_DEFAULT_LOCALE__;
    delete (globalThis as Record<string, unknown>).__MAINZ_LOCALE_PREFIX__;
    delete (globalThis as Record<string, unknown>).__MAINZ_SITE_URL__;
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/");
}

export async function prepareNavigationTest(): Promise<typeof import("../navigation/index.ts")> {
    await setupMainzDom();
    resetMainzNavigationTestDom();
    return await loadNavigationTestRuntime();
}
