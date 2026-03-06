import { Window } from "happy-dom";

export type MainzComponentCtor<T extends HTMLElement> = {
    getTagName(): string;
    new(): T;
};

export type RenderResult<T extends HTMLElement> = {
    component: T;
    host: HTMLElement;
    container: HTMLElement;
    getBySelector<E extends Element = Element>(selector: string): E;
    queryBySelector<E extends Element = Element>(selector: string): E | null;
    click(selector: string): void;
    cleanup(): void;
};

let domReady = false;

export function setupMainzDom(): void {
    if (domReady) return;

    const windowInstance = new Window({
        url: "http://localhost/",
    });

    const globalScope = globalThis as Record<string, unknown>;

    globalScope.window = windowInstance;
    globalScope.document = windowInstance.document;
    globalScope.customElements = windowInstance.customElements;
    globalScope.HTMLElement = windowInstance.HTMLElement;
    globalScope.HTMLInputElement = windowInstance.HTMLInputElement;
    globalScope.Node = windowInstance.Node;

    globalScope.Element = windowInstance.Element;
    globalScope.Text = windowInstance.Text;
    globalScope.DocumentFragment = windowInstance.DocumentFragment;
    globalScope.EventTarget = windowInstance.EventTarget;
    globalScope.HTMLButtonElement = windowInstance.HTMLButtonElement;
    globalScope.HTMLTextAreaElement = windowInstance.HTMLTextAreaElement;
    globalScope.HTMLSelectElement = windowInstance.HTMLSelectElement;
    // (globalThis as unknown as Record<string, unknown>).Event = windowInstance.Event;
    // Keep Deno's native Event implementation to avoid runtime dispatch conflicts.

    domReady = true;
}

export function renderMainzComponent<T extends HTMLElement>(
    Ctor: MainzComponentCtor<T>
): RenderResult<T> {
    setupMainzDom();

    const host = document.createElement("div");
    host.setAttribute("data-testid", "mainz-host");

    let testRoot = document.getElementById("test-root");

    if (!testRoot) {
        testRoot = document.createElement("div");
        testRoot.id = "test-root";
        document.body.appendChild(testRoot);
    }

    testRoot.replaceChildren(host);

    const tag = Ctor.getTagName();

    if (!customElements.get(tag)) {
        customElements.define(tag, Ctor);
    }

    const component = document.createElement(tag) as T;
    host.appendChild(component);

    const queryBySelector = <E extends Element = Element>(
        selector: string
    ): E | null => {
        return component.querySelector(selector) as E | null;
    };

    const getBySelector = <E extends Element = Element>(selector: string): E => {
        const node = queryBySelector<E>(selector);
        if (!node) {
            throw new Error(`Expected element for selector: ${selector}`);
        }
        return node;
    };

    const click = (selector: string): void => {
        const node = getBySelector<HTMLElement>(selector);
        node.click();
    };

    const cleanup = (): void => {
        host.remove();
    };

    return {
        component,
        host,
        container: host,
        getBySelector,
        queryBySelector,
        click,
        cleanup,
    };
}