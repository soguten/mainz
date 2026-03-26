export const MAINZ_LOCALE_CHANGE_EVENT = "mainz:localechange";
export const MAINZ_NAVIGATION_START_EVENT = "mainz:navigationstart";
export const MAINZ_NAVIGATION_ERROR_EVENT = "mainz:navigationerror";
export const MAINZ_NAVIGATION_ABORT_EVENT = "mainz:navigationabort";
export const MAINZ_NAVIGATION_READY_EVENT = "mainz:navigationready";

export interface MainzLocaleChangeDetail {
    locale: string;
    url: string;
    basePath: string;
}

export interface MainzNavigationReadyDetail {
    mode: "spa" | "mpa" | "enhanced-mpa";
    navigationType: "initial" | "push" | "pop";
    path: string;
    matchedPath: string;
    locale?: string;
    url: string;
    basePath: string;
    navigationSequence: number;
}

export interface MainzNavigationStartDetail {
    mode: "spa" | "mpa" | "enhanced-mpa";
    navigationType: "initial" | "push" | "pop";
    path: string;
    matchedPath: string;
    locale?: string;
    url: string;
    basePath: string;
    navigationSequence: number;
}

export interface MainzNavigationErrorDetail {
    mode: "spa" | "mpa" | "enhanced-mpa";
    navigationType: "initial" | "push" | "pop";
    path: string;
    matchedPath: string;
    locale?: string;
    url: string;
    basePath: string;
    navigationSequence: number;
    phase:
        | "route-match"
        | "authorization"
        | "route-load"
        | "page-render"
        | "document-bootstrap"
        | "unknown";
    message: string;
    error?: unknown;
}

export interface MainzNavigationAbortDetail {
    mode: "spa" | "mpa" | "enhanced-mpa";
    navigationType: "initial" | "push" | "pop";
    path: string;
    matchedPath: string;
    locale?: string;
    url: string;
    basePath: string;
    navigationSequence: number;
    reason: "superseded" | "cleanup" | "redirected" | "teardown" | "unknown";
}
