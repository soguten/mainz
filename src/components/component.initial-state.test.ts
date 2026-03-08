/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "@testing";

setupMainzDom();

const { Component } = await import("./component.ts") as {
    Component: typeof import("./component.ts").Component;
};

Deno.test("initial state: should be available in the very first render", () => {
    class InitialStateComponent extends Component<{}, { count: number }> {
        renderCalls = 0;

        protected override initState() {
            return { count: 7 };
        }

        override render(): HTMLElement {
            this.renderCalls += 1;

            const p = document.createElement("p");
            p.textContent = String(this.state.count);
            return p;
        }
    }

    const screen = renderMainzComponent(InitialStateComponent);

    assertEquals(screen.getBySelector("p").textContent, "7");
    assertEquals(screen.component.renderCalls, 1);

    screen.cleanup();
});

Deno.test("initial state: initState should receive props before first render", () => {
    class PropsInitialStateComponent extends Component<{ initial?: number }, { count: number }> {
        renderCalls = 0;

        protected override initState() {
            return { count: this.props.initial ?? 0 };
        }

        override render(): HTMLElement {
            this.renderCalls += 1;

            const p = document.createElement("p");
            p.textContent = String(this.state.count);
            return p;
        }
    }

    const screen = renderMainzComponent(PropsInitialStateComponent, {
        props: { initial: 12 },
    });

    assertEquals(screen.getBySelector("p").textContent, "12");
    assertEquals(screen.component.renderCalls, 1);

    screen.cleanup();
});

Deno.test("initial state: should not require onMount + setState to bootstrap initial state", () => {
    class NoBootstrapRenderComponent extends Component<{}, { ready: boolean }> {
        renderCalls = 0;
        mountCalls = 0;

        protected override initState() {
            return { ready: true };
        }

        override onMount(): void {
            this.mountCalls += 1;
        }

        override render(): HTMLElement {
            this.renderCalls += 1;

            const p = document.createElement("p");
            p.textContent = this.state.ready ? "ready" : "not-ready";
            return p;
        }
    }

    const screen = renderMainzComponent(NoBootstrapRenderComponent);

    assertEquals(screen.getBySelector("p").textContent, "ready");
    assertEquals(screen.component.renderCalls, 1);
    assertEquals(screen.component.mountCalls, 1);

    screen.cleanup();
});

Deno.test("initial state: initState should run only once", () => {
    class InitOnceComponent extends Component<{}, { count: number }> {
        initCalls = 0;
        renderCalls = 0;

        protected override initState() {
            this.initCalls += 1;
            return { count: 1 };
        }

        override render(): HTMLElement {
            this.renderCalls += 1;

            const p = document.createElement("p");
            p.textContent = String(this.state.count);
            return p;
        }
    }

    const screen = renderMainzComponent(InitOnceComponent);

    screen.component.setState({ count: 2 });
    screen.component.setState({ count: 3 });

    assertEquals(screen.component.initCalls, 1);
    assertEquals(screen.component.renderCalls, 3);
    assertEquals(screen.getBySelector("p").textContent, "3");

    screen.cleanup();
});

Deno.test("initial state: setState should update from initialized state normally", () => {
    class StatefulComponent extends Component<{}, { count: number }> {
        protected override initState() {
            return { count: 10 };
        }

        override render(): HTMLElement {
            const p = document.createElement("p");
            p.textContent = String(this.state.count);
            return p;
        }
    }

    const screen = renderMainzComponent(StatefulComponent);

    assertEquals(screen.getBySelector("p").textContent, "10");

    screen.component.setState({ count: 11 });

    assertEquals(screen.getBySelector("p").textContent, "11");

    screen.cleanup();
});

Deno.test("initial state: stateOverride should bypass initState on first connect", () => {
    class StateOverrideComponent extends Component<{ initial?: number }, { count: number }> {
        initCalls = 0;

        protected override initState() {
            this.initCalls += 1;
            return { count: this.props.initial ?? 0 };
        }

        override render(): HTMLElement {
            const p = document.createElement("p");
            p.textContent = String(this.state.count);
            return p;
        }
    }

    const screen = renderMainzComponent(StateOverrideComponent, {
        props: { initial: 10 },
        stateOverride: { count: 99 },
    });

    assertEquals(screen.getBySelector("p").textContent, "99");
    assertEquals(screen.component.initCalls, 0);

    screen.cleanup();
});

Deno.test("initial state: attrs should be applied before connect", () => {
    class AttrAwareComponent extends Component<{}, { role: string | null }> {
        protected override initState() {
            return { role: this.getAttribute("data-role") };
        }

        override render(): HTMLElement {
            const p = document.createElement("p");
            p.textContent = this.state.role ?? "none";
            return p;
        }
    }

    const screen = renderMainzComponent(AttrAwareComponent, {
        attrs: {
            "data-role": "admin",
        },
    });

    assertEquals(screen.getBySelector("p").textContent, "admin");

    screen.cleanup();
});