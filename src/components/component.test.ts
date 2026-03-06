/// <reference lib="deno.ns" />

import { assertEquals, assertStrictEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "../testing/mainz-testing.ts";

setupMainzDom();

const { Component } = await import("./component.ts") as {
    Component: typeof import("./component.ts").Component;
};

class ListPatchComponent extends Component<{}, { items: string[] }> {
    override onMount(): void {
        this.state = { items: ["a", "c"] };
        this.setState({});
    }

    override render(): HTMLElement {
        const wrap = document.createElement("ul");
        for (const id of this.state.items ?? []) {
            const li = document.createElement("li");
            li.setAttribute("data-id", id);
            li.textContent = id;
            wrap.appendChild(li);
        }
        return wrap;
    }
}

Deno.test("patchChildren: inserting in the middle should preserve existing keyed node (c)", () => {
    const screen = renderMainzComponent(ListPatchComponent);

    const beforeC = screen.getBySelector("li[data-id='c']");
    screen.component.setState({ items: ["a", "b", "c"] });
    const afterC = screen.getBySelector("li[data-id='c']");

    assertStrictEquals(afterC, beforeC);
    screen.cleanup();
});

Deno.test("patchChildren: reordering items should move existing nodes without reusing them by position", () => {
    const screen = renderMainzComponent(ListPatchComponent);
    screen.component.setState({ items: ["a", "b", "c"] });

    const beforeA = screen.getBySelector("li[data-id='a']");
    const beforeC = screen.getBySelector("li[data-id='c']");

    screen.component.setState({ items: ["c", "b", "a"] });

    const afterA = screen.getBySelector("li[data-id='a']");
    const afterC = screen.getBySelector("li[data-id='c']");

    assertStrictEquals(afterA, beforeA);
    assertStrictEquals(afterC, beforeC);
    screen.cleanup();
});

Deno.test("patchChildren: removing an item in the middle should preserve identity of remaining nodes", () => {
    const screen = renderMainzComponent(ListPatchComponent);
    screen.component.setState({ items: ["a", "b", "c"] });

    const beforeC = screen.getBySelector("li[data-id='c']");

    screen.component.setState({ items: ["a", "c"] });

    const afterC = screen.getBySelector("li[data-id='c']");
    assertStrictEquals(afterC, beforeC);
    screen.cleanup();
});

class ReRegisterListenerComponent extends Component<{}, { count: number }> {
    clicks = 0;

    override onMount(): void {
        this.state = { count: 0 };
        this.setState({});
    }

    override afterRender(): void {
        const button = this.querySelector("button");
        if (!button) return;
        this.registerEvent(button, "click", () => {
            this.clicks += 1;
        });
    }

    override render(): HTMLElement {
        const wrap = document.createElement("div");
        const button = document.createElement("button");
        button.textContent = String(this.state.count ?? 0);
        wrap.appendChild(button);
        return wrap;
    }
}

Deno.test("listeners: re-registering in afterRender should not accumulate duplicate handlers", () => {
    const screen = renderMainzComponent(ReRegisterListenerComponent);

    screen.component.setState({ count: 1 });
    screen.component.setState({ count: 2 });
    screen.component.setState({ count: 3 });

    screen.click("button");

    assertEquals(screen.component.clicks, 1);
    screen.cleanup();
});

class ControlledInputComponent extends Component<{}, { text: string }> {
    override onMount(): void {
        this.state = { text: "a" };
        this.setState({});
    }

    override render(): HTMLElement {
        const wrap = document.createElement("div");
        const input = document.createElement("input");
        input.setAttribute("value", this.state.text ?? "");
        wrap.appendChild(input);
        return wrap;
    }
}

Deno.test("property sync: input.value should follow state even after user edits", () => {
    const screen = renderMainzComponent(ControlledInputComponent);
    const input = screen.getBySelector<HTMLInputElement>("input");

    input.value = "user-edit";
    screen.component.setState({ text: "server-next" });

    assertEquals(input.value, "server-next");
    screen.cleanup();
});

class ControlledCheckedComponent extends Component<{}, { checked: boolean }> {
    override onMount(): void {
        this.state = { checked: false };
        this.setState({});
    }

    override render(): HTMLElement {
        const wrap = document.createElement("div");
        const input = document.createElement("input");
        input.type = "checkbox";
        if (this.state.checked) {
            input.setAttribute("checked", "");
        }
        wrap.appendChild(input);
        return wrap;
    }
}

Deno.test("property sync: input.checked should follow state when toggled", () => {
    const screen = renderMainzComponent(ControlledCheckedComponent);
    const checkbox = screen.getBySelector<HTMLInputElement>("input[type='checkbox']");

    checkbox.checked = false;
    screen.component.setState({ checked: true });

    assertEquals(checkbox.checked, true);
    screen.cleanup();
});

Deno.test("sanity: simple text patch should keep the same text node", () => {
    class TextNodeComponent extends Component<{}, { value: string }> {
        override onMount(): void {
            this.state = { value: "1" };
            this.setState({});
        }

        override render(): HTMLElement {
            const p = document.createElement("p");
            p.textContent = this.state.value;
            return p;
        }
    }

    const screen = renderMainzComponent(TextNodeComponent);
    const paragraph = screen.getBySelector("p");
    const textBefore = paragraph.firstChild;

    screen.component.setState({ value: "2" });

    const textAfter = paragraph.firstChild;
    assertStrictEquals(textBefore, textAfter);
    assertEquals(textAfter?.textContent, "2");
    screen.cleanup();
});