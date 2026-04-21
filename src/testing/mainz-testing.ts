import { Window } from "happy-dom";
import { ensureMainzCustomElementDefined } from "../components/registry.ts";
import { createTestScreen, type TestScreen } from "./test-screen.ts";

/** Constructor contract accepted by the Mainz component render helpers. */
export type MainzComponentCtor<T extends HTMLElement> = {
    /** Returns the custom element tag name associated with the component class. */
    getTagName(): string;
    /** Creates a new component instance. */
    new (): T;
};

/** Result returned by `renderMainzComponent`, including DOM query helpers. */
export type RenderResult<T extends HTMLElement> = TestScreen<T>;

/** Options used to render a Mainz component into the Happy DOM test environment. */
export type RenderMainzOptions<T extends HTMLElement> = {
    /** Props assigned to the component before it is connected. */
    props?: T extends { props: infer P } ? P : never;
    /** Attributes applied to the component element before mounting. */
    attrs?: Record<string, string>;
    /** Partial state merged into the component before mounting. */
    stateOverride?: Partial<
        Extract<T extends { state: infer S } ? S : never, Record<string, unknown>>
    >;
};

type HappyDOMLike = {
    waitUntilComplete?: () => Promise<void>;
};

let domInitialized = false;
let domSettled = false;
let domSetupPromise: Promise<void> | null = null;

/** Sets up the Happy DOM globals used by Mainz component tests. */
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

/** Renders a Mainz component into the shared Happy DOM environment. */
export function renderMainzComponent<T extends HTMLElement>(
    Ctor: MainzComponentCtor<T>,
): RenderResult<T>;

/** Renders a Mainz component into the shared Happy DOM environment with overrides. */
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
        (component as T & { props: T extends { props: infer P } ? P : never }).props = options.props;
    }

    if (options.stateOverride !== undefined && "state" in component) {
        type ObjectState = Extract<
            T extends { state: infer S } ? S : never,
            Record<string, unknown>
        >;
        const currentState = (component as T & { state: ObjectState }).state ??
            {} as ObjectState;

        (component as T & { state: ObjectState }).state = {
            ...currentState,
            ...options.stateOverride,
        };
    }

    host.appendChild(component);

    return createTestScreen(component, host);
}
