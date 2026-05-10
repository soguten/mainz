/// <reference lib="deno.ns" />

import { Window } from "happy-dom";
import {
  createTestScreen,
  type TestScreen,
} from "../../src/testing/test-screen.ts";
import { disposeHappyDomWindow } from "../../src/ssg/happy-dom.ts";
import {
  describeBuiltOutput,
  extractModuleScriptSrc,
  isCsrBuiltOutput,
  loadBuiltDocument as loadBuiltDocumentHtml,
  loadBuiltRoutePreview,
  resolveOutputHtmlPath,
  resolveOutputScriptPath,
} from "../helpers/built-output-io.ts";
import { waitForNextNavigationReady } from "../helpers/navigation.ts";
import { describeBuiltArtifact, type BuiltArtifact } from "./artifacts.ts";
import { assert } from "@std/assert";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const GLOBAL_DOM_KEYS = [
  "window",
  "document",
  "customElements",
  "navigator",
  "location",
  "Node",
  "Element",
  "HTMLElement",
  "DocumentFragment",
  "Text",
  "Event",
  "EventTarget",
  "CustomEvent",
  "MutationObserver",
  "IntersectionObserver",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "requestIdleCallback",
  "cancelIdleCallback",
  "getComputedStyle",
  "HTMLInputElement",
  "MouseEvent",
  "HTMLTextAreaElement",
  "HTMLSelectElement",
  "HTMLOptionElement",
  "SVGElement",
  "SVGSVGElement",
  "SVGPathElement",
] as const;

type GlobalDomKey = (typeof GLOBAL_DOM_KEYS)[number];
type TimerHandle = ReturnType<Window["setTimeout"]>;
type IdleCallbackHandle = TimerHandle;
type TrackedTimerBindings = {
  setTimeout(
    callback: TimerHandler,
    delay?: number,
    ...args: unknown[]
  ): TimerHandle;
  clearTimeout(handle?: TimerHandle | number): void;
  setInterval(
    callback: TimerHandler,
    delay?: number,
    ...args: unknown[]
  ): TimerHandle;
  clearInterval(handle?: TimerHandle | number): void;
};
type TestAppDomSession = {
  window: Window;
  cleanup(): void;
};

let testAppDomLock: Promise<void> = Promise.resolve();

export type ResolvedTestApp = {
  id: string;
  readHtml(artifact: BuiltArtifact, routePath: string): Promise<string>;
  readJson<T>(artifact: BuiltArtifact, file: string): Promise<T>;
  loadDocument(args: {
    artifact: BuiltArtifact;
    documentHtmlPath: string;
    url: string;
  }): Promise<{
    html: string;
    htmlPath: string;
    outputDir: string;
    url?: string;
  }>;
  resolveHtmlPath(artifact: BuiltArtifact, routePath: string): string;
  preview(artifact: BuiltArtifact, routePath: string): Promise<{
    html: string;
    htmlPath: string;
    outputDir: string;
    responseStatus?: number;
  }>;
  renderDocument(args: {
    artifact: BuiltArtifact;
    documentHtmlPath: string;
    url: string;
    basePath?: string;
    navigationReady?: {
      locale?: string;
      path?: string;
      matchedPath?: string;
      navigationType?: "initial" | "push" | "pop";
    };
  }): Promise<TestScreen<Element>>;
  render(
    artifact: BuiltArtifact,
    routePath: string,
  ): Promise<TestScreen<Element>>;
};

export async function readBuiltRouteHtml(
  artifact: BuiltArtifact,
  routePath: string,
): Promise<string> {
  const htmlPath = resolveOutputHtmlPath(artifact.context.outputDir, routePath);
  return await Deno.readTextFile(htmlPath);
}

export function resolveBuiltRouteHtmlPath(
  artifact: BuiltArtifact,
  routePath: string,
): string {
  return resolveOutputHtmlPath(artifact.context.outputDir, routePath);
}

export async function readBuiltJsonFile<T>(
  artifact: BuiltArtifact,
  file: string,
): Promise<T> {
  return JSON.parse(
    await Deno.readTextFile(`${artifact.context.outputDir}/${file}`),
  ) as T;
}

export async function loadBuiltDocument(args: {
  artifact: BuiltArtifact;
  documentHtmlPath: string;
  url: string;
}): Promise<{
  html: string;
  htmlPath: string;
  outputDir: string;
  url?: string;
}> {
  return await loadBuiltDocumentHtml({
    outputDir: args.artifact.context.outputDir,
    navigationMode: args.artifact.recipe.navigation,
    documentHtmlPath: args.documentHtmlPath,
    url: args.url,
  });
}

// Route rendering resolves the route through the built artifact's preview path.
// This is the default authoring path when the test intent is "open this route".
export async function renderBuiltRoute(
  artifact: BuiltArtifact,
  routePath: string,
): Promise<TestScreen<Element>> {
  const routeDocument = await previewBuiltRoute(artifact, routePath);
  const scriptSrc = extractModuleScriptSrc(routeDocument.html);

  assert(
    scriptSrc,
    `Could not find module script src for ${describeBuiltArtifact(artifact)} + ${artifact.recipe.navigation} (${routePath}).`,
  );

  const scriptPath = resolveOutputScriptPath({
    outputDir: routeDocument.outputDir,
    htmlPath: routeDocument.htmlPath,
    scriptSrc,
  });
  await Deno.stat(scriptPath);

  const session = await createTestAppDomSession(toTestAppUrl(routePath));

  try {
    document.write(routeDocument.html);
    document.close();

    const navigationReady = waitForNextNavigationReady({
      mode: artifact.recipe.navigation,
      navigationType: "initial",
    });
    await import(
      `${
        pathToFileURL(scriptPath).href
      }?test-app-route=${Date.now()}-${describeBuiltArtifact(artifact)}-${artifact.recipe.navigation}-${
        encodeURIComponent(routePath)
      }`
    );
    await navigationReady;

    const appRoot = document.querySelector("#app");
    assert(
      appRoot instanceof HTMLElement,
      `Expected #app container while rendering ${routePath}.`,
    );

    return createTestScreen(appRoot, appRoot, {
      cleanup: () => session.cleanup(),
    });
  } catch (error) {
    session.cleanup();
    throw error;
  }
}

// Document rendering opens a concrete emitted HTML file directly.
// Use this when the physical document path matters, such as basePath and 404 cases.
export async function renderBuiltDocument(args: {
  artifact: BuiltArtifact;
  documentHtmlPath: string;
  url: string;
  basePath?: string;
  navigationReady?: {
    locale?: string;
    path?: string;
    matchedPath?: string;
    navigationType?: "initial" | "push" | "pop";
  };
}): Promise<TestScreen<Element>> {
  const builtDocument = await loadBuiltDocument({
    artifact: args.artifact,
    documentHtmlPath: args.documentHtmlPath,
    url: args.url,
  });
  const scriptSrc = extractModuleScriptSrc(builtDocument.html);

  assert(
    scriptSrc,
    `Could not find module script src for ${describeBuiltArtifact(args.artifact)} + ${args.artifact.recipe.navigation} (${args.documentHtmlPath}).`,
  );

  const scriptPath = resolveOutputScriptPath({
    outputDir: builtDocument.outputDir,
    htmlPath: builtDocument.htmlPath,
    scriptSrc,
    basePath: args.basePath,
  });
  await Deno.stat(scriptPath);

  const session = await createTestAppDomSession(args.url);

  try {
    document.write(builtDocument.html);
    document.close();

    const navigationReady = waitForNextNavigationReady({
      mode: args.artifact.recipe.navigation,
      locale: args.navigationReady?.locale,
      path: args.navigationReady?.path,
      matchedPath: args.navigationReady?.matchedPath,
      navigationType: args.navigationReady?.navigationType ?? "initial",
    });
    await import(
      `${
        pathToFileURL(scriptPath).href
      }?test-app-document=${Date.now()}-${describeBuiltArtifact(args.artifact)}-${args.artifact.recipe.navigation}-${
        encodeURIComponent(args.documentHtmlPath)
      }`
    );
    await navigationReady;

    const appRoot = document.querySelector("#app");
    assert(
      appRoot instanceof HTMLElement,
      `Expected #app container while rendering ${args.documentHtmlPath}.`,
    );

    return createTestScreen(appRoot, appRoot, {
      cleanup: () => session.cleanup(),
    });
  } catch (error) {
    session.cleanup();
    throw error;
  }
}

export async function previewBuiltRoute(
  artifact: BuiltArtifact,
  routePath: string,
): Promise<{
  html: string;
  htmlPath: string;
  outputDir: string;
  responseStatus?: number;
}> {
  const outputDir = artifact.context.outputDir;
  return await loadBuiltRoutePreview({
    outputDir,
    navigationMode: artifact.recipe.navigation,
    requestUrl: `http://127.0.0.1:4173${routePath}`,
    resolveHtmlPath(responseStatus: number | undefined) {
      return responseStatus === 404
        ? resolve(outputDir, "404.html")
        : resolveOutputHtmlPath(outputDir, routePath);
    },
  });
}

async function createTestAppDomSession(url: string): Promise<TestAppDomSession> {
  const releaseLock = await acquireTestAppDomLock();
  const window = new Window({ url });
  const previousValues = new Map<GlobalDomKey, unknown>();

  for (const key of GLOBAL_DOM_KEYS) {
    previousValues.set(key, (globalThis as Record<string, unknown>)[key]);
    (globalThis as Record<string, unknown>)[key] =
      (window as unknown as Record<string, unknown>)[key];
  }

  const extendedWindow = window as unknown as Window & {
    requestIdleCallback?: (callback: IdleRequestCallback) => number;
    cancelIdleCallback?: (handle: number) => void;
  };
  const pendingIdleCallbacks = new Set<IdleCallbackHandle>();
  const pendingTimeouts = new Set<TimerHandle>();
  const pendingIntervals = new Set<TimerHandle>();
  const trackedTimers = installTrackedWindowTimers(
    window,
    pendingTimeouts,
    pendingIntervals,
  );

  if (!extendedWindow.requestIdleCallback) {
    extendedWindow.requestIdleCallback = (callback: IdleRequestCallback) => {
      const handle = trackedTimers.setTimeout(() => {
        pendingIdleCallbacks.delete(handle);
        callback({
          didTimeout: false,
          timeRemaining: () => 0,
        });
      }, 0);
      pendingIdleCallbacks.add(handle);
      return handle as unknown as number;
    };
  }

  if (!extendedWindow.cancelIdleCallback) {
    extendedWindow.cancelIdleCallback = (handle: number) => {
      pendingIdleCallbacks.delete(handle as unknown as IdleCallbackHandle);
      trackedTimers.clearTimeout(handle as unknown as TimerHandle);
    };
  }

  const previousRuntime =
    (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__;
  (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__ = "build";

  let cleanedUp = false;

  return {
    window,
    cleanup() {
      if (cleanedUp) {
        return;
      }

      cleanedUp = true;

      if (previousRuntime === undefined) {
        delete (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__;
      } else {
        (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__ =
          previousRuntime;
      }

      runRegisteredWindowCleanups(window);

      for (const handle of pendingIdleCallbacks) {
        trackedTimers.clearTimeout(handle as unknown as TimerHandle);
      }
      pendingIdleCallbacks.clear();

      for (const handle of pendingTimeouts) {
        trackedTimers.clearTimeout(handle);
      }
      pendingTimeouts.clear();

      for (const handle of pendingIntervals) {
        trackedTimers.clearInterval(handle);
      }
      pendingIntervals.clear();

      for (const key of GLOBAL_DOM_KEYS) {
        const previous = previousValues.get(key);
        if (previous === undefined) {
          delete (globalThis as Record<string, unknown>)[key];
          continue;
        }

        (globalThis as Record<string, unknown>)[key] = previous;
      }

      disposeHappyDomWindow(window);
      releaseLock();
    },
  };
}

async function acquireTestAppDomLock(): Promise<() => void> {
  const previousLock = testAppDomLock;
  let releaseLock!: () => void;
  testAppDomLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  await previousLock;
  return releaseLock;
}

function installTrackedWindowTimers(
  window: Window,
  pendingTimeouts: Set<TimerHandle>,
  pendingIntervals: Set<TimerHandle>,
): TrackedTimerBindings {
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeClearTimeout = window.clearTimeout.bind(window);
  const nativeSetInterval = window.setInterval.bind(window);
  const nativeClearInterval = window.clearInterval.bind(window);

  const trackedSetTimeout: TrackedTimerBindings["setTimeout"] = (
    callback: TimerHandler,
    delay?: number,
    ...args: unknown[]
  ) => {
    let handle!: TimerHandle;
    handle = nativeSetTimeout(() => {
      pendingTimeouts.delete(handle);
      if (typeof callback === "function") {
        callback(...args);
      } else {
        new Function(String(callback))();
      }
    }, delay);
    pendingTimeouts.add(handle);
    return handle;
  };

  const trackedClearTimeout: TrackedTimerBindings["clearTimeout"] = (
    handle?: TimerHandle | number,
  ) => {
    if (handle === undefined) {
      return;
    }

    pendingTimeouts.delete(handle as TimerHandle);
    nativeClearTimeout(handle as TimerHandle);
  };

  const trackedSetInterval: TrackedTimerBindings["setInterval"] = (
    callback: TimerHandler,
    delay?: number,
    ...args: unknown[]
  ) => {
    const handle = nativeSetInterval(() => {
      if (typeof callback === "function") {
        callback(...args);
      } else {
        new Function(String(callback))();
      }
    }, delay);
    pendingIntervals.add(handle);
    return handle;
  };

  const trackedClearInterval: TrackedTimerBindings["clearInterval"] = (
    handle?: TimerHandle | number,
  ) => {
    if (handle === undefined) {
      return;
    }

    pendingIntervals.delete(handle as TimerHandle);
    nativeClearInterval(handle as TimerHandle);
  };

  window.setTimeout = trackedSetTimeout as unknown as typeof window.setTimeout;
  window.clearTimeout =
    trackedClearTimeout as unknown as typeof window.clearTimeout;
  window.setInterval =
    trackedSetInterval as unknown as typeof window.setInterval;
  window.clearInterval =
    trackedClearInterval as unknown as typeof window.clearInterval;

  (globalThis as typeof globalThis).setTimeout =
    trackedSetTimeout as unknown as typeof globalThis.setTimeout;
  (globalThis as typeof globalThis).clearTimeout =
    trackedClearTimeout as unknown as typeof globalThis.clearTimeout;
  (globalThis as typeof globalThis).setInterval =
    trackedSetInterval as unknown as typeof globalThis.setInterval;
  (globalThis as typeof globalThis).clearInterval =
    trackedClearInterval as unknown as typeof globalThis.clearInterval;

  return {
    setTimeout: trackedSetTimeout,
    clearTimeout: trackedClearTimeout,
    setInterval: trackedSetInterval,
    clearInterval: trackedClearInterval,
  };
}

function runRegisteredWindowCleanups(window: Window): void {
  const cleanupWindow = window as Window & {
    __MAINZ_WINDOW_CLEANUPS__?: Set<() => void>;
  };
  const cleanupRegistry = cleanupWindow.__MAINZ_WINDOW_CLEANUPS__;

  if (!cleanupRegistry?.size) {
    return;
  }

  for (const cleanup of [...cleanupRegistry]) {
    cleanup();
  }

  cleanupRegistry.clear();
}

export function describeTestAppArtifactOutput(artifact: BuiltArtifact): string {
  return describeBuiltOutput(artifact.context.outputDir);
}

export function isSpaShellArtifact(artifact: BuiltArtifact): boolean {
  return isCsrBuiltOutput(artifact.context.outputDir) &&
    artifact.recipe.navigation === "spa";
}

function toTestAppUrl(routePath: string): string {
  return new URL(routePath, "https://mainz.local").href;
}
