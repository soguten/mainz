/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import { cleanupHappyDomWindow } from "../../ssg/happy-dom.ts";

Deno.test("components/component: should hydrate deferred HTMLElement base before custom element registration", async () => {
    const globalScope = globalThis as Record<string, unknown>;
    const preservedGlobals = new Map<string, unknown>();
    let windowInstance: Window | undefined;
    const managedGlobals = [
        "window",
        "document",
        "customElements",
        "HTMLElement",
        "HTMLInputElement",
        "HTMLButtonElement",
        "HTMLTextAreaElement",
        "HTMLSelectElement",
        "Node",
        "Element",
        "Text",
        "DocumentFragment",
        "EventTarget",
        "Event",
        "MouseEvent",
        "KeyboardEvent",
        "CustomEvent",
    ] as const;

    for (const key of managedGlobals) {
        preservedGlobals.set(key, globalScope[key]);
        delete globalScope[key];
    }

    try {
        const componentModuleUrl =
            `${pathToFileURL(join(Deno.cwd(), "src", "components", "component.ts")).href}?fresh=${
                crypto.randomUUID()
            }`;
        const componentModule = await import(componentModuleUrl) as typeof import("../component.ts");

        class DeferredComponent extends componentModule.Component {
            override render(): HTMLElement {
                return document.createElement("section");
            }
        }

        windowInstance = new Window({
            url: "http://localhost/",
        });

        globalScope.window = windowInstance;
        globalScope.document = windowInstance.document;
        globalScope.customElements = windowInstance.customElements;
        globalScope.HTMLElement = windowInstance.HTMLElement;
        globalScope.HTMLInputElement = windowInstance.HTMLInputElement;
        globalScope.HTMLButtonElement = windowInstance.HTMLButtonElement;
        globalScope.HTMLTextAreaElement = windowInstance.HTMLTextAreaElement;
        globalScope.HTMLSelectElement = windowInstance.HTMLSelectElement;
        globalScope.Node = windowInstance.Node;
        globalScope.Element = windowInstance.Element;
        globalScope.Text = windowInstance.Text;
        globalScope.DocumentFragment = windowInstance.DocumentFragment;
        globalScope.EventTarget = windowInstance.EventTarget;
        globalScope.Event = windowInstance.Event;
        globalScope.MouseEvent = windowInstance.MouseEvent;
        globalScope.KeyboardEvent = windowInstance.KeyboardEvent;
        globalScope.CustomEvent = windowInstance.CustomEvent;

        componentModule.ensureComponentElementBaseHydrated();

        assertEquals(
            Object.getPrototypeOf(componentModule.ComponentElementBase.prototype),
            windowInstance.HTMLElement.prototype,
        );

        windowInstance.customElements.define(
            "x-deferred-component",
            DeferredComponent as never,
        );

        const element = windowInstance.document.createElement("x-deferred-component");

        assertEquals(element instanceof windowInstance.HTMLElement, true);
        assertEquals(element instanceof DeferredComponent, true);
    } finally {
        if (windowInstance) {
            await cleanupHappyDomWindow(windowInstance);
        }

        for (const key of managedGlobals) {
            const previousValue = preservedGlobals.get(key);
            if (typeof previousValue === "undefined") {
                delete globalScope[key];
                continue;
            }

            globalScope[key] = previousValue;
        }
    }
});
