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
    dispatch(selector: string, event: Event): void;
    input(selector: string, value: string): void;
    change(selector: string, value: string): void;
    cleanup(): void;
};

type PropsOf<T> = T extends { props: infer P } ? P : never;
type StateOf<T> = T extends { state: infer S } ? S : never;
type ObjectStateOf<T> = Extract<StateOf<T>, Record<string, unknown>>;

export type RenderMainzOptions<T extends HTMLElement> = {
    props?: PropsOf<T>;
    attrs?: Record<string, string>;
    stateOverride?: Partial<ObjectStateOf<T>>;
};

type HappyDOMLike = {
    waitUntilComplete?: () => Promise<void>;
};

let domInitialized = false;
let domSettled = false;
let domSetupPromise: Promise<void> | null = null;

export function setupMainzDom(): Promise<void> {
    if (domSettled) {
        return Promise.resolve();
    }

    if (domSetupPromise) {
        return domSetupPromise;
    }

    if (!domInitialized) {
        const windowInstance = new Window({
            url: "http://localhost/",
        });

        const globalScope = globalThis as Record<string, unknown>;

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

        domInitialized = true;

        const happyDOM = (windowInstance as unknown as { happyDOM?: HappyDOMLike }).happyDOM;

        domSetupPromise = (async () => {
            if (happyDOM?.waitUntilComplete) {
                await happyDOM.waitUntilComplete();
            }
            domSettled = true;
        })()
            .catch((error) => {
                domInitialized = false;
                throw error;
            })
            .finally(() => {
                domSetupPromise = null;
            });

        return domSetupPromise;
    }

    return Promise.resolve();
}

function ensureTestRoot(): HTMLElement {
    let testRoot = document.getElementById("test-root");

    if (!testRoot) {
        testRoot = document.createElement("div");
        testRoot.id = "test-root";
        document.body.appendChild(testRoot);
    }

    return testRoot;
}

function ensureDefined<T extends HTMLElement>(Ctor: MainzComponentCtor<T>): string {
    const tag = Ctor.getTagName();

    if (!customElements.get(tag)) {
        customElements.define(tag, Ctor);
    }

    return tag;
}

function createRenderResult<T extends HTMLElement>(
    component: T,
    host: HTMLElement,
): RenderResult<T> {
    const queryBySelector = <E extends Element = Element>(
        selector: string,
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

    const dispatch = (selector: string, event: Event): void => {
        const node = getBySelector<HTMLElement>(selector);
        node.dispatchEvent(event);
    };

    const input = (selector: string, value: string): void => {
        const node = getBySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
        node.value = value;
        node.dispatchEvent(new Event("input", { bubbles: true }));
    };

    const change = (selector: string, value: string): void => {
        const node = getBySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
            selector,
        );
        node.value = value;
        node.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const cleanup = (): void => {
        const parent = host.parentElement;
        host.remove();

        if (parent?.id === "test-root" && parent.childElementCount === 0) {
            parent.remove();
        }
    };

    return {
        component,
        host,
        container: host,
        getBySelector,
        queryBySelector,
        click,
        dispatch,
        input,
        change,
        cleanup,
    };
}

export function renderMainzComponent<T extends HTMLElement>(
    Ctor: MainzComponentCtor<T>,
): RenderResult<T>;

export function renderMainzComponent<T extends HTMLElement>(
    Ctor: MainzComponentCtor<T>,
    options: RenderMainzOptions<T>,
): RenderResult<T>;

export function renderMainzComponent<T extends HTMLElement>(
    Ctor: MainzComponentCtor<T>,
    options: RenderMainzOptions<T> = {},
): RenderResult<T> {
    void setupMainzDom();

    const host = document.createElement("div");
    host.setAttribute("data-testid", "mainz-host");

    const testRoot = ensureTestRoot();
    testRoot.appendChild(host);

    const tag = ensureDefined(Ctor);
    const component = document.createElement(tag) as T;

    if (options.attrs) {
        for (const [name, value] of Object.entries(options.attrs)) {
            component.setAttribute(name, value);
        }
    }

    if (options.props !== undefined && "props" in component) {
        (component as T & { props: PropsOf<T> }).props = options.props;
    }

    if (options.stateOverride !== undefined && "state" in component) {
        const currentState = (component as T & { state: ObjectStateOf<T> }).state ?? {} as ObjectStateOf<T>;

        (component as T & { state: ObjectStateOf<T> }).state = {
            ...currentState,
            ...options.stateOverride,
        };
    }

    host.appendChild(component);

    return createRenderResult(component, host);
}
