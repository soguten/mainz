/// <reference lib="deno.ns" />

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
export async function withHappyDom<T>(
    fn: (window: Window) => Promise<T> | T,
    options?: { url?: string },
): Promise<T> {
    const window = new Window({
        url: options?.url ?? "https://mainz.local/",
    });

    const previousValues = new Map<GlobalDomKey, unknown>();

    for (const key of GLOBAL_DOM_KEYS) {
        previousValues.set(key, (globalThis as Record<string, unknown>)[key]);
        (globalThis as Record<string, unknown>)[key] = (window as unknown as Record<string, unknown>)[key];
    }

    const extendedWindow = window as unknown as Window & {
        requestIdleCallback?: (callback: IdleRequestCallback) => number;
        cancelIdleCallback?: (handle: number) => void;
    };

    if (!extendedWindow.requestIdleCallback) {
        extendedWindow.requestIdleCallback = ((callback: IdleRequestCallback) => {
            return setTimeout(() => {
                callback({
                    didTimeout: false,
                    timeRemaining: () => 0,
                });
            }, 0);
        });
    }

    if (!extendedWindow.cancelIdleCallback) {
        extendedWindow.cancelIdleCallback = ((handle: number) => {
            clearTimeout(handle);
        });
    }

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

        window.close();
    }
}
