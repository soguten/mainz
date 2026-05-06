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

    if (!extendedWindow.requestIdleCallback) {
        extendedWindow.requestIdleCallback = (callback: IdleRequestCallback) => {
            return setTimeout(() => {
                callback({
                    didTimeout: false,
                    timeRemaining: () => 0,
                });
            }, 0);
        };
    }

    if (!extendedWindow.cancelIdleCallback) {
        extendedWindow.cancelIdleCallback = (handle: number) => {
            clearTimeout(handle);
        };
    }

    installSafeDocumentWrite(window);

    const previousRuntime = (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__;
    (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__ = "build";

    try {
        return await fn(window);
    } finally {
        if (previousRuntime === undefined) {
            delete (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__;
        } else {
            (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__ = previousRuntime;
        }

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
        .replace(/<script\b[^>]*\bsrc=["']https?:\/\/[^"']+["'][^>]*>\s*<\/script>/gi, "");
}

export async function cleanupHappyDomWindow(window: Window): Promise<void> {
    const happyDOM = (window as unknown as { happyDOM?: HappyDOMController }).happyDOM;

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
        happyDOM?.close?.();
        window.close();
    }
}
