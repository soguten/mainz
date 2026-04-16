import { Window } from "happy-dom";
import { ensureMainzCustomElementDefined } from "../components/registry.ts";
import { createTestScreen, type TestScreen } from "./test-screen.ts";

export type MainzComponentCtor<T extends HTMLElement> = {
    getTagName(): string;
    new (): T;
};

export type RenderResult<T extends HTMLElement> = TestScreen<T>;

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
    return ensureMainzCustomElementDefined(
        Ctor as unknown as CustomElementConstructor & { getTagName(): string },
    );
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
    host.setAttribute("data-mainz-app-root", "");
    host.setAttribute("data-mainz-app-id", "test-app");

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
        const currentState = (component as T & { state: ObjectStateOf<T> }).state ??
            {} as ObjectStateOf<T>;

        (component as T & { state: ObjectStateOf<T> }).state = {
            ...currentState,
            ...options.stateOverride,
        };
    }

    host.appendChild(component);

    return createTestScreen(component, host);
}
