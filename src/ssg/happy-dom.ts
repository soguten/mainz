import { AsyncLocalStorage } from "node:async_hooks";
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
  "console",
  "__MAINZ_RUNTIME_ENV__",
] as const;

type GlobalDomKey = (typeof GLOBAL_DOM_KEYS)[number];
const EXECUTION_CONTEXT_KEY = Symbol.for("mainz.ssr.execution-context");
const GLOBAL_ACCESSORS_KEY = Symbol.for("mainz.ssr.global-accessors-installed");

interface HappyDomExecutionContext {
  window: Window;
  runtimeEnv: "build";
  console?: Console;
  pageRequest?: { request: Request; signal?: AbortSignal };
}

interface ExecutionContextBridge {
  getStore(): HappyDomExecutionContext | undefined;
  runWith<T>(
    patch: Partial<HappyDomExecutionContext>,
    fn: () => T,
  ): T;
}

const executionContext = getExecutionContextBridge();

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
  const window = new Window({
    url: options?.url ?? "https://mainz.local/",
  });
  installGlobalDomAccessors();

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

  try {
    return await executionContext.runWith(
      { window, runtimeEnv: "build" },
      () => fn(window),
    );
  } finally {
    await executionContext.runWith(
      { window, runtimeEnv: "build" },
      async () => {
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

        await cleanupHappyDomWindow(window);
      },
    );
  }
}

/** Runs with request-specific console methods without mutating process globals. */
export function withHappyDomConsole<T>(
  overrides: Pick<Console, "warn" | "error">,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  const current = executionContext.getStore();
  if (!current) {
    return fn();
  }

  const scopedConsole = Object.assign(
    Object.create(
      (current.console ?? getBaseGlobalValue("console")) as object,
    ) as Console,
    overrides,
  );
  return executionContext.runWith({ console: scopedConsole }, fn);
}

function getExecutionContextBridge(): ExecutionContextBridge {
  const registry = globalThis as
    & typeof globalThis
    & Record<PropertyKey, unknown>;
  const existing = registry[EXECUTION_CONTEXT_KEY] as
    | ExecutionContextBridge
    | undefined;
  if (existing) {
    return existing;
  }

  const storage = new AsyncLocalStorage<HappyDomExecutionContext>();
  const bridge: ExecutionContextBridge = {
    getStore: () => storage.getStore(),
    runWith: (patch, fn) => {
      const current = storage.getStore();
      return storage.run(
        { ...current, ...patch } as HappyDomExecutionContext,
        fn,
      );
    },
  };
  registry[EXECUTION_CONTEXT_KEY] = bridge;
  return bridge;
}

function installGlobalDomAccessors(): void {
  const registry = globalThis as
    & typeof globalThis
    & Record<PropertyKey, unknown>;
  if (registry[GLOBAL_ACCESSORS_KEY] === true) {
    return;
  }

  const baseValues = new Map<GlobalDomKey, unknown>();
  const baseDescriptors = new Map<
    GlobalDomKey,
    PropertyDescriptor | undefined
  >();
  for (const key of GLOBAL_DOM_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    if (descriptor && !descriptor.configurable) {
      throw new Error(
        `Cannot enable concurrent SSR: globalThis.${key} is not configurable.`,
      );
    }
    baseDescriptors.set(key, descriptor);
    baseValues.set(key, readGlobalDescriptor(descriptor));
  }

  for (const key of GLOBAL_DOM_KEYS) {
    const descriptor = baseDescriptors.get(key);
    Object.defineProperty(globalThis, key, {
      configurable: true,
      enumerable: descriptor?.enumerable ?? (key !== "console"),
      get() {
        const context = executionContext.getStore();
        if (!context) {
          return baseValues.get(key);
        }
        if (key === "__MAINZ_RUNTIME_ENV__") {
          return context.runtimeEnv;
        }
        if (key === "console") {
          return context.console ?? baseValues.get(key);
        }
        return (context.window as unknown as Record<string, unknown>)[key];
      },
      set(value: unknown) {
        const context = executionContext.getStore();
        if (!context) {
          writeGlobalDescriptor(key, descriptor, value, baseValues);
          return;
        }
        if (key === "__MAINZ_RUNTIME_ENV__") {
          context.runtimeEnv = value as "build";
        } else if (key === "console") {
          context.console = value as Console;
        } else {
          (context.window as unknown as Record<string, unknown>)[key] = value;
        }
      },
    });
  }

  registry[GLOBAL_ACCESSORS_KEY] = true;
  registry[Symbol.for("mainz.ssr.execution-context-provider")] = {
    getStore: () => executionContext.getStore(),
    runWith: executionContext.runWith,
  } satisfies ExecutionContextBridge;
}

function readGlobalDescriptor(
  descriptor: PropertyDescriptor | undefined,
): unknown {
  if (!descriptor) {
    return undefined;
  }
  return descriptor.get ? descriptor.get.call(globalThis) : descriptor.value;
}

function writeGlobalDescriptor(
  key: GlobalDomKey,
  descriptor: PropertyDescriptor | undefined,
  value: unknown,
  baseValues: Map<GlobalDomKey, unknown>,
): void {
  if (descriptor?.set) {
    descriptor.set.call(globalThis, value);
  } else if (!descriptor || descriptor.writable) {
    baseValues.set(key, value);
  }
}

function getBaseGlobalValue(key: GlobalDomKey): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
  return readGlobalDescriptor(descriptor);
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
