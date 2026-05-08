import { Window } from "happy-dom";

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
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
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
let happyDomLock: Promise<void> = Promise.resolve();

type HappyDOMController = {
  waitUntilComplete?: () => Promise<void>;
  whenAsyncComplete?: () => Promise<void>;
  abort?: () => void;
  cancelAsync?: () => void;
  close?: () => void;
};

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

export async function withHappyDom<T>(
  fn: (window: Window) => Promise<T> | T,
  options?: { url?: string },
): Promise<T> {
  const releaseLock = await acquireHappyDomLock();
  const window = new Window({
    url: options?.url ?? "https://mainz.local/",
  });

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

  installSafeDocumentWrite(window);

  const previousRuntime =
    (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__;
  (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__ = "build";

  try {
    return await fn(window);
  } finally {
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

    await cleanupHappyDomWindow(window);
    releaseLock();
  }
}

async function acquireHappyDomLock(): Promise<() => void> {
  const previousLock = happyDomLock;
  let releaseLock!: () => void;
  happyDomLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  await previousLock;
  return releaseLock;
}

function installSafeDocumentWrite(window: Window): void {
  const documentRecord = window.document as unknown as {
    write(...text: string[]): void;
    writeln?(...text: string[]): void;
  };
  const originalWrite = documentRecord.write.bind(documentRecord);

  documentRecord.write = (...text: string[]) => {
    originalWrite(...text.map(stripExternalDocumentResources));
  };

  if (typeof documentRecord.writeln === "function") {
    const originalWriteln = documentRecord.writeln.bind(documentRecord);
    documentRecord.writeln = (...text: string[]) => {
      originalWriteln(...text.map(stripExternalDocumentResources));
    };
  }
}

function stripExternalDocumentResources(html: string): string {
  return html
    .replace(/<link\b[^>]*\bhref=["']https?:\/\/[^"']+["'][^>]*>/gi, "")
    .replace(
      /<script\b[^>]*\bsrc=["']https?:\/\/[^"']+["'][^>]*>\s*<\/script>/gi,
      "",
    );
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

export async function cleanupHappyDomWindow(window: Window): Promise<void> {
  const happyDOM =
    (window as unknown as { happyDOM?: HappyDOMController }).happyDOM;

  happyDOM?.cancelAsync?.();
  happyDOM?.abort?.();

  try {
    if (typeof happyDOM?.whenAsyncComplete === "function") {
      await happyDOM.whenAsyncComplete();
    } else if (typeof happyDOM?.waitUntilComplete === "function") {
      await happyDOM.waitUntilComplete();
    }
  } catch {
    // Ignore cleanup-time async abort errors from Happy DOM.
  } finally {
    disposeHappyDomWindow(window);
  }
}

export function disposeHappyDomWindow(window: Window): void {
  const happyDOM =
    (window as unknown as { happyDOM?: HappyDOMController }).happyDOM;

  happyDOM?.cancelAsync?.();
  happyDOM?.abort?.();
  happyDOM?.close?.();
  window.close();
}
