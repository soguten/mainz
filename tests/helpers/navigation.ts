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
} from "../../src/runtime-events.ts";
import { waitForCustomEvent } from "../../src/testing/async-testing.ts";

export async function waitForNextLocaleChange(
  expectedLocale?: string,
): Promise<MainzLocaleChangeDetail> {
  return await waitForCustomEvent<MainzLocaleChangeDetail>(
    MAINZ_LOCALE_CHANGE_EVENT,
    {
      predicate: (detail) => {
        if (!detail?.locale) {
          return false;
        }

        return expectedLocale ? detail.locale === expectedLocale : true;
      },
      message: expectedLocale
        ? `Expected locale bootstrap event for ${expectedLocale}.`
        : "Expected locale bootstrap event.",
    },
  );
}

export async function waitForNextNavigationReady(options?: {
  target?: EventTarget;
  mode?: MainzNavigationReadyDetail["mode"];
  path?: string;
  matchedPath?: string;
  locale?: string;
  navigationType?: MainzNavigationReadyDetail["navigationType"];
  navigationSequence?: number;
}): Promise<MainzNavigationReadyDetail> {
  return await waitForCustomEvent<MainzNavigationReadyDetail>(
    MAINZ_NAVIGATION_READY_EVENT,
    {
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

        if (
          options?.matchedPath && detail.matchedPath !== options.matchedPath
        ) {
          return false;
        }

        if (options?.locale && detail.locale !== options.locale) {
          return false;
        }

        if (
          options?.navigationType &&
          detail.navigationType !== options.navigationType
        ) {
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
      message: "Expected navigation ready event.",
    },
  );
}

export async function waitForNextNavigationStart(options?: {
  target?: EventTarget;
  mode?: MainzNavigationStartDetail["mode"];
  path?: string;
  matchedPath?: string;
  locale?: string;
  navigationType?: MainzNavigationStartDetail["navigationType"];
  navigationSequence?: number;
}): Promise<MainzNavigationStartDetail> {
  return await waitForCustomEvent<MainzNavigationStartDetail>(
    MAINZ_NAVIGATION_START_EVENT,
    {
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

        if (
          options?.matchedPath && detail.matchedPath !== options.matchedPath
        ) {
          return false;
        }

        if (options?.locale && detail.locale !== options.locale) {
          return false;
        }

        if (
          options?.navigationType &&
          detail.navigationType !== options.navigationType
        ) {
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
      message: "Expected navigation start event.",
    },
  );
}

export async function waitForNextNavigationError(options?: {
  target?: EventTarget;
  mode?: MainzNavigationErrorDetail["mode"];
  path?: string;
  matchedPath?: string;
  locale?: string;
  navigationType?: MainzNavigationErrorDetail["navigationType"];
  navigationSequence?: number;
  phase?: MainzNavigationErrorDetail["phase"];
}): Promise<MainzNavigationErrorDetail> {
  return await waitForCustomEvent<MainzNavigationErrorDetail>(
    MAINZ_NAVIGATION_ERROR_EVENT,
    {
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

        if (
          options?.matchedPath && detail.matchedPath !== options.matchedPath
        ) {
          return false;
        }

        if (options?.locale && detail.locale !== options.locale) {
          return false;
        }

        if (
          options?.navigationType &&
          detail.navigationType !== options.navigationType
        ) {
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
      message: "Expected navigation error event.",
    },
  );
}

export async function waitForNextNavigationAbort(options?: {
  target?: EventTarget;
  mode?: MainzNavigationAbortDetail["mode"];
  path?: string;
  matchedPath?: string;
  locale?: string;
  navigationType?: MainzNavigationAbortDetail["navigationType"];
  navigationSequence?: number;
  reason?: MainzNavigationAbortDetail["reason"];
}): Promise<MainzNavigationAbortDetail> {
  return await waitForCustomEvent<MainzNavigationAbortDetail>(
    MAINZ_NAVIGATION_ABORT_EVENT,
    {
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

        if (
          options?.matchedPath && detail.matchedPath !== options.matchedPath
        ) {
          return false;
        }

        if (options?.locale && detail.locale !== options.locale) {
          return false;
        }

        if (
          options?.navigationType &&
          detail.navigationType !== options.navigationType
        ) {
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
      message: "Expected navigation abort event.",
    },
  );
}

export async function waitForNavigationLifecyclePair(options: {
  target?: EventTarget;
  mode?: MainzNavigationStartDetail["mode"];
  path?: string;
  matchedPath?: string;
  locale?: string;
  navigationType?: MainzNavigationStartDetail["navigationType"];
}): Promise<{
  started: Promise<MainzNavigationStartDetail>;
  ready: Promise<MainzNavigationReadyDetail>;
}> {
  return {
    started: waitForNextNavigationStart({
      target: options.target,
      mode: options.mode,
      path: options.path,
      matchedPath: options.matchedPath,
      locale: options.locale,
      navigationType: options.navigationType,
    }),
    ready: waitForNextNavigationReady({
      target: options.target,
      mode: options.mode,
      path: options.path,
      matchedPath: options.matchedPath,
      locale: options.locale,
      navigationType: options.navigationType,
    }),
  };
}
