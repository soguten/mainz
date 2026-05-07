import { Window } from "happy-dom";
import { ensureMainzCustomElementDefined } from "../components/registry.ts";
import { disposeHappyDomWindow } from "../ssg/happy-dom.ts";
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

let domInitialized = false;
let domWindow: Window | undefined;
let unloadCleanupRegistered = false;

type HappyDOMLike = {
  whenAsyncComplete?: () => Promise<void>;
  waitUntilComplete?: () => Promise<void>;
};

/** Sets up the Happy DOM globals used by Mainz component tests. */
export async function setupMainzDom(): Promise<void> {
  if (!domInitialized) {
    initializeMainzDom();
  }

  const happyDOM = (window as unknown as { happyDOM?: HappyDOMLike }).happyDOM;

  if (typeof happyDOM?.whenAsyncComplete === "function") {
    await happyDOM.whenAsyncComplete();
    return;
  }

  if (typeof happyDOM?.waitUntilComplete === "function") {
    await happyDOM.waitUntilComplete();
  }
}

function initializeMainzDom(): void {
  if (domWindow) {
    disposeMainzDom();
  }

  const windowInstance = new Window({
    url: "http://localhost/",
  });
  domWindow = windowInstance;

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

  if (!unloadCleanupRegistered) {
    globalThis.addEventListener("unload", disposeMainzDom, { once: true });
    unloadCleanupRegistered = true;
  }

  domInitialized = true;
}

export function disposeMainzDom(): void {
  if (!domWindow) {
    domInitialized = false;
    return;
  }

  const globalScope = globalThis as Record<string, unknown>;
  for (
    const key of [
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
    ] as const
  ) {
    delete globalScope[key];
  }

  disposeHappyDomWindow(domWindow);
  domWindow = undefined;
  domInitialized = false;
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

function ensureDefined<T extends HTMLElement>(
  Ctor: MainzComponentCtor<T>,
): string {
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
  if (!domInitialized) {
    initializeMainzDom();
  }

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
    (component as T & { props: T extends { props: infer P } ? P : never })
      .props = options.props;
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
