/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "@testing";

setupMainzDom();

const { Component } = await import("./component.ts") as {
    Component: typeof import("./component.ts").Component;
};

Deno.test("events: dispatch should trigger a generic custom event", () => {
    class CustomDispatchComponent extends Component<{}, { received: string }> {
        protected override initState() {
            return { received: "none" };
        }

        override afterRender(): void {
            const target = this.querySelector("button[data-role='target']");
            if (!target || target.hasAttribute("data-bound")) return;

            target.setAttribute("data-bound", "true");

            this.registerEvent(target, "x-ready", (event) => {
                const customEvent = event as CustomEvent<string>;
                this.setState({ received: customEvent.detail });
            });
        }

        override render(): HTMLElement {
            const wrap = document.createElement("div");

            const button = document.createElement("button");
            button.setAttribute("data-role", "target");
            button.textContent = "dispatch";

            const output = document.createElement("p");
            output.textContent = this.state.received;

            wrap.append(button, output);
            return wrap;
        }
    }

    const screen = renderMainzComponent(CustomDispatchComponent);

    screen.dispatch(
        "button[data-role='target']",
        new CustomEvent("x-ready", {
            bubbles: true,
            detail: "ok",
        }),
    );

    assertEquals(screen.getBySelector("p").textContent, "ok");
    screen.cleanup();
});

Deno.test("events: dispatch should trigger input listeners with the current element value", () => {
    class InputDispatchComponent extends Component<{}, { text: string }> {
        protected override initState() {
            return { text: "" };
        }

        override afterRender(): void {
            const input = this.querySelector("input");
            if (!input || input.hasAttribute("data-bound")) return;

            input.setAttribute("data-bound", "true");

            this.registerEvent(input, "input", () => {
                this.setState({ text: input.value });
            });
        }

        override render(): HTMLElement {
            const wrap = document.createElement("div");

            const input = document.createElement("input");
            input.value = this.state.text;

            const output = document.createElement("p");
            output.textContent = this.state.text;

            wrap.append(input, output);
            return wrap;
        }
    }

    const screen = renderMainzComponent(InputDispatchComponent);

    const input = screen.getBySelector<HTMLInputElement>("input");
    input.value = "hello";

    screen.dispatch(
        "input",
        new Event("input", { bubbles: true }),
    );

    assertEquals(screen.getBySelector("p").textContent, "hello");
    screen.cleanup();
});

Deno.test("events: dispatch should trigger change listeners with the current input value", () => {
    class ChangeDispatchComponent extends Component<{}, { value: string }> {
        protected override initState() {
            return { value: "" };
        }

        override afterRender(): void {
            const input = this.querySelector("input");
            if (!input || input.hasAttribute("data-bound")) return;

            input.setAttribute("data-bound", "true");

            this.registerEvent(input, "change", () => {
                this.setState({ value: input.value });
            });
        }

        override render(): HTMLElement {
            const wrap = document.createElement("div");

            const input = document.createElement("input");
            input.value = this.state.value;

            const output = document.createElement("p");
            output.textContent = this.state.value;

            wrap.append(input, output);
            return wrap;
        }
    }

    const screen = renderMainzComponent(ChangeDispatchComponent);

    const input = screen.getBySelector<HTMLInputElement>("input");
    input.value = "changed";

    screen.dispatch(
        "input",
        new Event("change", { bubbles: true }),
    );

    assertEquals(screen.getBySelector("p").textContent, "changed");
    screen.cleanup();
});

Deno.test("events: dispatch should trigger change listeners on select elements", () => {
    class SelectChangeComponent extends Component<{}, { value: string }> {
        protected override initState() {
            return { value: "a" };
        }

        override afterRender(): void {
            const select = this.querySelector("select");
            if (!select || select.hasAttribute("data-bound")) return;

            select.setAttribute("data-bound", "true");

            this.registerEvent(select, "change", () => {
                this.setState({ value: select.value });
            });
        }

        override render(): HTMLElement {
            const wrap = document.createElement("div");

            const select = document.createElement("select");

            const optionA = document.createElement("option");
            optionA.value = "a";
            optionA.textContent = "A";

            const optionB = document.createElement("option");
            optionB.value = "b";
            optionB.textContent = "B";

            select.append(optionA, optionB);
            select.value = this.state.value;

            const output = document.createElement("p");
            output.textContent = this.state.value;

            wrap.append(select, output);
            return wrap;
        }
    }

    const screen = renderMainzComponent(SelectChangeComponent);

    const select = screen.getBySelector<HTMLSelectElement>("select");
    select.value = "b";

    screen.dispatch(
        "select",
        new Event("change", { bubbles: true }),
    );

    assertEquals(screen.getBySelector("p").textContent, "b");
    screen.cleanup();
});

Deno.test("events: dispatch should support keyboard events", () => {
    class KeyboardDispatchComponent extends Component<{}, { lastKey: string }> {
        protected override initState() {
            return { lastKey: "none" };
        }

        override afterRender(): void {
            const input = this.querySelector("input");
            if (!input || input.hasAttribute("data-bound")) return;

            input.setAttribute("data-bound", "true");

            this.registerEvent(input, "keydown", (event) => {
                const keyboardEvent = event as KeyboardEvent;
                this.setState({ lastKey: keyboardEvent.key });
            });
        }

        override render(): HTMLElement {
            const wrap = document.createElement("div");

            const input = document.createElement("input");

            const output = document.createElement("p");
            output.textContent = this.state.lastKey;

            wrap.append(input, output);
            return wrap;
        }
    }

    const screen = renderMainzComponent(KeyboardDispatchComponent);

    screen.dispatch(
        "input",
        new KeyboardEvent("keydown", {
            bubbles: true,
            key: "Enter",
        }),
    );

    assertEquals(screen.getBySelector("p").textContent, "Enter");
    screen.cleanup();
});