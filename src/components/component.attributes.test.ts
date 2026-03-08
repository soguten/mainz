/// <reference lib="deno.ns" />

import { assertEquals, assertStrictEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "@testing";

setupMainzDom();

const { Component } = await import("./component.ts") as {
    Component: typeof import("./component.ts").Component;
};

Deno.test("attrs: should be available inside initState before first render", () => {
    class InitStateReadsAttrComponent extends Component<{}, { role: string | null }> {
        protected override initState() {
            return {
                role: this.getAttribute("data-role"),
            };
        }

        override render(): HTMLElement {
            const p = document.createElement("p");
            p.textContent = this.state.role ?? "none";
            return p;
        }
    }

    const screen = renderMainzComponent(InitStateReadsAttrComponent, {
        attrs: {
            "data-role": "admin",
        },
    });

    assertEquals(screen.getBySelector("p").textContent, "admin");
    screen.cleanup();
});

Deno.test("attrs: should be queryable inside onMount", () => {
    class OnMountReadsAttrComponent extends Component {
        capturedRole: string | null = null;

        override onMount(): void {
            this.capturedRole = this.getAttribute("data-role");
        }

        override render(): HTMLElement {
            const div = document.createElement("div");
            div.textContent = "ok";
            return div;
        }
    }

    const screen = renderMainzComponent(OnMountReadsAttrComponent, {
        attrs: {
            "data-role": "editor",
        },
    });

    assertEquals(screen.component.capturedRole, "editor");
    screen.cleanup();
});

Deno.test("attrs: should expose initial attributes on the host element", () => {
    class HostAttrsComponent extends Component {
        override render(): HTMLElement {
            const div = document.createElement("div");
            div.textContent = "host";
            return div;
        }
    }

    const screen = renderMainzComponent(HostAttrsComponent, {
        attrs: {
            id: "x-host",
            "data-mode": "test",
            title: "Mainz host",
        },
    });

    assertEquals(screen.component.getAttribute("id"), "x-host");
    assertEquals(screen.component.getAttribute("data-mode"), "test");
    assertEquals(screen.component.getAttribute("title"), "Mainz host");

    screen.cleanup();
});

Deno.test("attrs: render should add attribute when state requires it", () => {
    class AddAttrOnRenderComponent extends Component<{}, { active: boolean }> {
        protected override initState() {
            return { active: false };
        }

        override render(): HTMLElement {
            const button = document.createElement("button");
            button.textContent = "action";

            if (this.state.active) {
                button.setAttribute("data-active", "true");
            }

            return button;
        }
    }

    const screen = renderMainzComponent(AddAttrOnRenderComponent);

    const buttonBefore = screen.getBySelector<HTMLButtonElement>("button");
    assertEquals(buttonBefore.hasAttribute("data-active"), false);

    screen.component.setState({ active: true });

    const buttonAfter = screen.getBySelector<HTMLButtonElement>("button");
    assertStrictEquals(buttonAfter, buttonBefore);
    assertEquals(buttonAfter.getAttribute("data-active"), "true");

    screen.cleanup();
});

Deno.test("attrs: render should remove attribute when state no longer requires it", () => {
    class RemoveAttrOnRenderComponent extends Component<{}, { active: boolean }> {
        protected override initState() {
            return { active: true };
        }

        override render(): HTMLElement {
            const button = document.createElement("button");
            button.textContent = "action";

            if (this.state.active) {
                button.setAttribute("data-active", "true");
            }

            return button;
        }
    }

    const screen = renderMainzComponent(RemoveAttrOnRenderComponent);

    const buttonBefore = screen.getBySelector<HTMLButtonElement>("button");
    assertEquals(buttonBefore.getAttribute("data-active"), "true");

    screen.component.setState({ active: false });

    const buttonAfter = screen.getBySelector<HTMLButtonElement>("button");
    assertStrictEquals(buttonAfter, buttonBefore);
    assertEquals(buttonAfter.hasAttribute("data-active"), false);

    screen.cleanup();
});

Deno.test("attrs: render should update attribute value without replacing the element", () => {
    class UpdateAttrValueComponent extends Component<{}, { status: string }> {
        protected override initState() {
            return { status: "idle" };
        }

        override render(): HTMLElement {
            const div = document.createElement("div");
            div.setAttribute("data-status", this.state.status);
            div.textContent = this.state.status;
            return div;
        }
    }

    const screen = renderMainzComponent(UpdateAttrValueComponent);

    const nodeBefore = screen.getBySelector<HTMLDivElement>("div");
    assertEquals(nodeBefore.getAttribute("data-status"), "idle");

    screen.component.setState({ status: "busy" });

    const nodeAfter = screen.getBySelector<HTMLDivElement>("div");
    assertStrictEquals(nodeAfter, nodeBefore);
    assertEquals(nodeAfter.getAttribute("data-status"), "busy");
    assertEquals(nodeAfter.textContent, "busy");

    screen.cleanup();
});

Deno.test("attrs: render should remove old attributes that are not present anymore", () => {
    class ToggleExclusiveAttrsComponent extends Component<{}, { kind: "a" | "b" }> {

        protected override initState() {
            // NOTE: `as const` is required here due to TypeScript literal type widening.
            // Without it, `{ kind: "a" }` would be inferred as `{ kind: string }`,
            // which is incompatible with `{ kind: "a" | "b" }`.
            return { kind: "a" as const };
        }

        override render(): HTMLElement {
            const div = document.createElement("div");

            if (this.state.kind === "a") {
                div.setAttribute("data-kind-a", "true");
            } else {
                div.setAttribute("data-kind-b", "true");
            }

            return div;
        }
    }

    const screen = renderMainzComponent(ToggleExclusiveAttrsComponent);

    const node = screen.getBySelector<HTMLDivElement>("div");
    assertEquals(node.getAttribute("data-kind-a"), "true");
    assertEquals(node.hasAttribute("data-kind-b"), false);

    screen.component.setState({ kind: "b" });

    assertStrictEquals(screen.getBySelector("div"), node);
    assertEquals(node.hasAttribute("data-kind-a"), false);
    assertEquals(node.getAttribute("data-kind-b"), "true");

    screen.cleanup();
});

Deno.test("attrs: host attribute removal should be observable in onMount when attribute is absent", () => {
    class MissingAttrComponent extends Component<{}, { role: string | null }> {
        protected override initState() {
            return {
                role: this.getAttribute("data-role"),
            };
        }

        override render(): HTMLElement {
            const p = document.createElement("p");
            p.textContent = this.state.role ?? "none";
            return p;
        }
    }

    const screen = renderMainzComponent(MissingAttrComponent);

    assertEquals(screen.getBySelector("p").textContent, "none");
    assertEquals(screen.component.hasAttribute("data-role"), false);

    screen.cleanup();
});