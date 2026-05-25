/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { attachServiceContainer } from "../../di/context.ts";
import { createServiceContainer, inject, singleton } from "../../di/index.ts";
import { Component, type NoProps, type NoState } from "../index.ts";
import { ensureMainzCustomElementDefined } from "../registry.ts";
import { Store } from "../store.ts";
import { setupMainzDom } from "../../testing/mainz-testing.ts";

await setupMainzDom();

class CounterStore extends Store<{ count: number }> {
  public initCalls = 0;

  protected override initState(): { count: number } {
    this.initCalls += 1;
    return { count: 0 };
  }

  increment(): void {
    this.state = {
      count: this.state.count + 1,
    };
  }
}

class MessageStore extends Store<{ text: string }> {
  protected override initState(): { text: string } {
    return { text: "init" };
  }

  setText(text: string): void {
    this.state = { text };
  }
}

class AsyncSessionStore extends Store<{ status: string }> {
  private version = 0;

  protected override initState(): { status: string } {
    return { status: "idle" };
  }

  async loadStatus(
    nextStatus: string,
    work: Promise<string>,
  ): Promise<void> {
    const version = ++this.version;
    const resolvedStatus = await work;

    if (version !== this.version) {
      return;
    }

    this.state = {
      status: `${nextStatus}:${resolvedStatus}`,
    };
  }

  forceStatus(status: string): void {
    this.version += 1;
    this.state = { status };
  }
}

class CounterViewComponent extends Component<NoProps, NoState> {
  private readonly counter = inject(CounterStore).bind(this);

  override render(): HTMLElement {
    const output = document.createElement("p");
    output.textContent = String(this.counter.state.count);
    return output;
  }
}

class PlainService {
  readonly label = "plain";
}

class StoreBoundLeafComponent extends Component<NoProps, NoState> {
  private readonly message = inject(MessageStore).bind(this);

  override render(): HTMLElement {
    const output = document.createElement("p");
    output.setAttribute("data-role", "child-value");
    output.textContent = this.message.state.text;
    return output;
  }
}

class StoreBindingBoundaryComponent
  extends Component<NoProps, { version: number; showChild: boolean }> {
  protected override initState() {
    return {
      version: 0,
      showChild: true,
    };
  }

  override render(): HTMLElement {
    const section = document.createElement("section");

    const version = document.createElement("p");
    version.setAttribute("data-role", "parent-version");
    version.textContent = String(this.state.version);

    const rerenderButton = document.createElement("button");
    rerenderButton.type = "button";
    rerenderButton.setAttribute("data-role", "parent-rerender");
    rerenderButton.textContent = "rerender";
    rerenderButton.onclick = () =>
      this.setState({ version: this.state.version + 1 });

    const hideChildButton = document.createElement("button");
    hideChildButton.type = "button";
    hideChildButton.setAttribute("data-role", "hide-child");
    hideChildButton.textContent = "hide child";
    hideChildButton.onclick = () => this.setState({ showChild: false });

    section.append(version, rerenderButton, hideChildButton);

    if (this.state.showChild) {
      const childTagName = ensureMainzCustomElementDefined(
        StoreBoundLeafComponent as unknown as CustomElementConstructor & {
          getTagName(): string;
        },
      );
      section.appendChild(document.createElement(childTagName));
    } else {
      const removed = document.createElement("p");
      removed.setAttribute("data-role", "child-removed");
      removed.textContent = "removed";
      section.appendChild(removed);
    }

    return section;
  }
}

class AsyncSessionViewComponent extends Component<NoProps, NoState> {
  private readonly session = inject(AsyncSessionStore).bind(this);

  override render(): HTMLElement {
    const output = document.createElement("p");
    output.textContent = this.session.state.status;
    return output;
  }
}

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

Deno.test("components/store: should initialize state lazily once", () => {
  const store = new CounterStore();

  assertEquals(store.state.count, 0);
  assertEquals(store.state.count, 0);
  assertEquals(store.initCalls, 1);
});

Deno.test("components/store: should rerender bound components and clean up on disconnect", () => {
  const container = createServiceContainer([
    singleton(CounterStore),
  ]);
  const host = document.createElement("div");
  document.body.appendChild(host);

  const tagName = ensureMainzCustomElementDefined(
    CounterViewComponent as unknown as CustomElementConstructor & {
      getTagName(): string;
    },
  );
  const component = attachServiceContainer(
    document.createElement(tagName) as CounterViewComponent,
    container,
  ) as CounterViewComponent;
  host.appendChild(component);

  const counter = container.get(CounterStore);

  try {
    assertEquals(component.textContent, "0");

    counter.increment();
    assertEquals(component.textContent, "1");

    host.removeChild(component);

    counter.increment();
    assertEquals(component.textContent, "1");
  } finally {
    host.remove();
  }
});

Deno.test("components/store: should rerender multiple bound components from the same store", () => {
  const container = createServiceContainer([
    singleton(CounterStore),
  ]);
  const host = document.createElement("div");
  document.body.appendChild(host);

  const tagName = ensureMainzCustomElementDefined(
    CounterViewComponent as unknown as CustomElementConstructor & {
      getTagName(): string;
    },
  );
  const first = attachServiceContainer(
    document.createElement(tagName) as CounterViewComponent,
    container,
  ) as CounterViewComponent;
  const second = attachServiceContainer(
    document.createElement(tagName) as CounterViewComponent,
    container,
  ) as CounterViewComponent;
  host.append(first, second);

  const counter = container.get(CounterStore);

  try {
    assertEquals(first.textContent, "0");
    assertEquals(second.textContent, "0");

    counter.increment();

    assertEquals(first.textContent, "1");
    assertEquals(second.textContent, "1");
  } finally {
    host.remove();
  }
});

Deno.test("components/store: should keep non-store services out of the binding API", () => {
  const service = inject(PlainService);

  void service;

  // @ts-expect-error non-store services do not expose .bind(...)
  inject(PlainService).bind({} as Component<NoProps, NoState>);
});

Deno.test("components/store: child binding should survive parent rerender and clean up on subtree removal", () => {
  const container = createServiceContainer([
    singleton(MessageStore),
  ]);
  const host = document.createElement("div");
  document.body.appendChild(host);

  const tagName = ensureMainzCustomElementDefined(
    StoreBindingBoundaryComponent as unknown as CustomElementConstructor & {
      getTagName(): string;
    },
  );
  const component = attachServiceContainer(
    document.createElement(tagName) as StoreBindingBoundaryComponent,
    container,
  ) as StoreBindingBoundaryComponent;
  host.appendChild(component);

  const store = container.get(MessageStore);

  try {
    assertEquals(
      component.querySelector("[data-role='child-value']")?.textContent,
      "init",
    );

    store.setText("before-parent-rerender");
    assertEquals(
      component.querySelector("[data-role='child-value']")?.textContent,
      "before-parent-rerender",
    );

    component.querySelector<HTMLButtonElement>("[data-role='parent-rerender']")!
      .click();
    assertEquals(
      component.querySelector("[data-role='parent-version']")?.textContent,
      "1",
    );

    store.setText("after-parent-rerender");
    assertEquals(
      component.querySelector("[data-role='child-value']")?.textContent,
      "after-parent-rerender",
    );

    component.querySelector<HTMLButtonElement>("[data-role='hide-child']")!
      .click();
    assertEquals(component.querySelector("[data-role='child-value']"), null);
    assertEquals(
      component.querySelector("[data-role='child-removed']")?.textContent,
      "removed",
    );

    store.setText("after-child-removal");
    assertEquals(component.querySelector("[data-role='child-value']"), null);
  } finally {
    host.remove();
  }
});

Deno.test("components/store: async store actions can protect against stale async commits", async () => {
  const container = createServiceContainer([
    singleton(AsyncSessionStore),
  ]);
  const host = document.createElement("div");
  document.body.appendChild(host);

  const tagName = ensureMainzCustomElementDefined(
    AsyncSessionViewComponent as unknown as CustomElementConstructor & {
      getTagName(): string;
    },
  );
  const component = attachServiceContainer(
    document.createElement(tagName) as AsyncSessionViewComponent,
    container,
  ) as AsyncSessionViewComponent;
  host.appendChild(component);

  const session = container.get(AsyncSessionStore);
  const first = createDeferred<string>();
  const second = createDeferred<string>();

  try {
    const firstLoad = session.loadStatus("load", first.promise);
    const secondLoad = session.loadStatus("refresh", second.promise);

    second.resolve("new");
    await secondLoad;
    assertEquals(component.textContent, "refresh:new");

    session.forceStatus("signed-out");
    assertEquals(component.textContent, "signed-out");

    first.resolve("old");
    await firstLoad;
    assertEquals(component.textContent, "signed-out");
  } finally {
    host.remove();
  }
});
