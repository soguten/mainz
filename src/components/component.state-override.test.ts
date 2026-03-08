/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "@testing";

setupMainzDom();

const { Component } = await import("./component.ts") as {
    Component: typeof import("./component.ts").Component;
};

Deno.test("stateOverride: should merge with preloaded instance state before first render", () => {
    class PreloadedStateComponent extends Component<
        {},
        { count: number; label: string; ready: boolean }
    > {
        override state = {
            count: 1,
            label: "initial",
            ready: false,
        };

        override render(): HTMLElement {
            const p = document.createElement("p");
            p.textContent = JSON.stringify(this.state);
            return p;
        }
    }

    const screen = renderMainzComponent(PreloadedStateComponent, {
        stateOverride: {
            count: 5,
            ready: true,
        },
    });

    assertEquals(screen.component.state.count, 5);
    assertEquals(screen.component.state.label, "initial");
    assertEquals(screen.component.state.ready, true);
    assertEquals(
        screen.getBySelector("p").textContent,
        JSON.stringify({
            count: 5,
            label: "initial",
            ready: true,
        }),
    );

    screen.cleanup();
});

Deno.test("stateOverride: should preserve existing state keys not present in override", () => {
    class PreserveExistingKeysComponent extends Component<
        {},
        { a: number; b: number; c: number }
    > {
        override state = {
            a: 1,
            b: 2,
            c: 3,
        };

        override render(): HTMLElement {
            const p = document.createElement("p");
            p.textContent = `${this.state.a}-${this.state.b}-${this.state.c}`;
            return p;
        }
    }

    const screen = renderMainzComponent(PreserveExistingKeysComponent, {
        stateOverride: {
            b: 20,
        },
    });

    assertEquals(screen.component.state.a, 1);
    assertEquals(screen.component.state.b, 20);
    assertEquals(screen.component.state.c, 3);
    assertEquals(screen.getBySelector("p").textContent, "1-20-3");

    screen.cleanup();
});

Deno.test("stateOverride: should overwrite only the provided keys", () => {
    class PartialOverrideComponent extends Component<
        {},
        { status: string; count: number; selected: boolean }
    > {
        override state = {
            status: "idle",
            count: 0,
            selected: false,
        };

        override render(): HTMLElement {
            const p = document.createElement("p");
            p.textContent = `${this.state.status}|${this.state.count}|${this.state.selected}`;
            return p;
        }
    }

    const screen = renderMainzComponent(PartialOverrideComponent, {
        stateOverride: {
            status: "done",
            selected: true,
        },
    });

    assertEquals(screen.component.state.status, "done");
    assertEquals(screen.component.state.count, 0);
    assertEquals(screen.component.state.selected, true);
    assertEquals(screen.getBySelector("p").textContent, "done|0|true");

    screen.cleanup();
});

Deno.test("stateOverride: should bypass initState when merged state is already present", () => {
    class InitStateBypassedComponent extends Component<
        {},
        { count: number; label: string }
    > {
        initCalls = 0;

        override state = {
            count: 1,
            label: "preloaded",
        };

        protected override initState() {
            this.initCalls += 1;
            return {
                count: 999,
                label: "from-init",
            };
        }

        override render(): HTMLElement {
            const p = document.createElement("p");
            p.textContent = `${this.state.count}:${this.state.label}`;
            return p;
        }
    }

    const screen = renderMainzComponent(InitStateBypassedComponent, {
        stateOverride: {
            count: 5,
        },
    });

    assertEquals(screen.component.initCalls, 0);
    assertEquals(screen.component.state.count, 5);
    assertEquals(screen.component.state.label, "preloaded");
    assertEquals(screen.getBySelector("p").textContent, "5:preloaded");

    screen.cleanup();
});

Deno.test("stateOverride: should be reflected in the very first render after merge", () => {
    class FirstRenderMergedStateComponent extends Component<
        {},
        { title: string; visible: boolean }
    > {
        renderCalls = 0;

        override state = {
            title: "draft",
            visible: false,
        };

        override render(): HTMLElement {
            this.renderCalls += 1;

            const p = document.createElement("p");
            p.textContent = `${this.state.title}:${this.state.visible}`;
            return p;
        }
    }

    const screen = renderMainzComponent(FirstRenderMergedStateComponent, {
        stateOverride: {
            visible: true,
        },
    });

    assertEquals(screen.component.renderCalls, 1);
    assertEquals(screen.getBySelector("p").textContent, "draft:true");

    screen.cleanup();
});

Deno.test("stateOverride: should support overriding all preloaded state keys", () => {
    class FullOverrideComponent extends Component<
        {},
        { mode: string; count: number }
    > {
        override state = {
            mode: "view",
            count: 1,
        };

        override render(): HTMLElement {
            const p = document.createElement("p");
            p.textContent = `${this.state.mode}:${this.state.count}`;
            return p;
        }
    }

    const screen = renderMainzComponent(FullOverrideComponent, {
        stateOverride: {
            mode: "edit",
            count: 10,
        },
    });

    assertEquals(screen.component.state.mode, "edit");
    assertEquals(screen.component.state.count, 10);
    assertEquals(screen.getBySelector("p").textContent, "edit:10");

    screen.cleanup();
});