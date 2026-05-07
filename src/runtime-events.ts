/**
 * Event name fired when the active locale changes at runtime.
 */
export const MAINZ_LOCALE_CHANGE_EVENT = "mainz:localechange";
/**
 * Event name fired when a navigation starts.
 */
export const MAINZ_NAVIGATION_START_EVENT = "mainz:navigationstart";
/**
 * Event name fired when a navigation fails.
 */
export const MAINZ_NAVIGATION_ERROR_EVENT = "mainz:navigationerror";
/**
 * Event name fired when a navigation is aborted.
 */
export const MAINZ_NAVIGATION_ABORT_EVENT = "mainz:navigationabort";
/**
 * Event name fired when a navigation completes successfully.
 */
export const MAINZ_NAVIGATION_READY_EVENT = "mainz:navigationready";

/**
 * Detail payload dispatched with locale-change events.
 */
export interface MainzLocaleChangeDetail {
  /** Active locale after the change. */
  locale: string;
  /** Absolute URL for the current page. */
  url: string;
  /** Base path configured for the app. */
  basePath: string;
}

/**
 * Detail payload dispatched when Mainz finishes a navigation.
 */
export interface MainzNavigationReadyDetail {
  /** Navigation runtime mode handling the transition. */
  mode: "spa" | "mpa" | "enhanced-mpa";
  /** Browser navigation type that triggered the transition. */
  navigationType: "initial" | "push" | "pop";
  /** Requested pathname. */
  path: string;
  /** Route pattern matched by the runtime. */
  matchedPath: string;
  /** Active locale when one is resolved. */
  locale?: string;
  /** Absolute URL for the resolved navigation target. */
  url: string;
  /** Base path configured for the app. */
  basePath: string;
  /** Monotonic sequence number for the navigation lifecycle. */
  navigationSequence: number;
}

/**
 * Detail payload dispatched when Mainz starts a navigation.
 */
export interface MainzNavigationStartDetail {
  /** Navigation runtime mode handling the transition. */
  mode: "spa" | "mpa" | "enhanced-mpa";
  /** Browser navigation type that triggered the transition. */
  navigationType: "initial" | "push" | "pop";
  /** Requested pathname. */
  path: string;
  /** Route pattern matched by the runtime. */
  matchedPath: string;
  /** Active locale when one is resolved. */
  locale?: string;
  /** Absolute URL for the resolved navigation target. */
  url: string;
  /** Base path configured for the app. */
  basePath: string;
  /** Monotonic sequence number for the navigation lifecycle. */
  navigationSequence: number;
}

/**
 * Detail payload dispatched when Mainz emits a navigation error.
 */
export interface MainzNavigationErrorDetail {
  /** Navigation runtime mode handling the transition. */
  mode: "spa" | "mpa" | "enhanced-mpa";
  /** Browser navigation type that triggered the transition. */
  navigationType: "initial" | "push" | "pop";
  /** Requested pathname. */
  path: string;
  /** Route pattern matched by the runtime. */
  matchedPath: string;
  /** Active locale when one is resolved. */
  locale?: string;
  /** Absolute URL for the resolved navigation target. */
  url: string;
  /** Base path configured for the app. */
  basePath: string;
  /** Monotonic sequence number for the navigation lifecycle. */
  navigationSequence: number;
  /** Lifecycle phase where the error happened. */
  phase:
    | "route-match"
    | "authorization"
    | "route-load"
    | "page-render"
    | "document-bootstrap"
    | "unknown";
  /** Error message emitted by the runtime. */
  message: string;
  /** Original error object when one is available. */
  error?: unknown;
}

/**
 * Detail payload dispatched when Mainz aborts a navigation.
 */
export interface MainzNavigationAbortDetail {
  /** Navigation runtime mode handling the transition. */
  mode: "spa" | "mpa" | "enhanced-mpa";
  /** Browser navigation type that triggered the transition. */
  navigationType: "initial" | "push" | "pop";
  /** Requested pathname. */
  path: string;
  /** Route pattern matched by the runtime. */
  matchedPath: string;
  /** Active locale when one is resolved. */
  locale?: string;
  /** Absolute URL for the resolved navigation target. */
  url: string;
  /** Base path configured for the app. */
  basePath: string;
  /** Monotonic sequence number for the navigation lifecycle. */
  navigationSequence: number;
  /** Abort reason emitted by the runtime. */
  reason: "superseded" | "cleanup" | "redirected" | "teardown" | "unknown";
}
