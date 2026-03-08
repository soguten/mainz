/// <reference lib="deno.ns" />

/**
 * DOM patching tests
 *
 * Verifies that the DOM patching algorithm preserves node identity and
 * correctly updates attributes, properties, and listeners across renders.
 */

import { assert, assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

setupMainzDom();

const fixtures = await import("./component.patching.fixture.tsx") as typeof import("./component.patching.fixture.tsx");

Deno.test("patchChildren: inserting in the middle should preserve existing keyed node (c)", () => {
    const screen = renderMainzComponent(fixtures.ListPatchComponent);

    const beforeC = screen.getBySelector("li[data-id='c']");
    screen.component.setState({ items: ["a", "b", "c"] });
    const afterC = screen.getBySelector("li[data-id='c']");

    assert(afterC === beforeC, "Expected li[data-id='c'] to preserve identity");
    screen.cleanup();
});

Deno.test("patchChildren: reordering items should move existing nodes without reusing them by position", () => {
    const screen = renderMainzComponent(fixtures.ListPatchComponent);
    screen.component.setState({ items: ["a", "b", "c"] });

    const beforeA = screen.getBySelector("li[data-id='a']");
    const beforeC = screen.getBySelector("li[data-id='c']");

    screen.component.setState({ items: ["c", "b", "a"] });

    const afterA = screen.getBySelector("li[data-id='a']");
    const afterC = screen.getBySelector("li[data-id='c']");

    assert(afterA === beforeA, "Expected li[data-id='a'] to preserve identity");
    assert(afterC === beforeC, "Expected li[data-id='c'] to preserve identity");
    screen.cleanup();
});

Deno.test("patchChildren: removing an item in the middle should preserve identity of remaining nodes", () => {
    const screen = renderMainzComponent(fixtures.ListPatchComponent);
    screen.component.setState({ items: ["a", "b", "c"] });

    const beforeC = screen.getBySelector("li[data-id='c']");

    screen.component.setState({ items: ["a", "c"] });

    const afterC = screen.getBySelector("li[data-id='c']");
    assert(afterC === beforeC, "Expected li[data-id='c'] to preserve identity");
    screen.cleanup();
});

Deno.test("listeners: re-registering in afterRender should not accumulate duplicate handlers", () => {
    const screen = renderMainzComponent(fixtures.ReRegisterListenerComponent);

    screen.component.setState({ count: 1 });
    screen.component.setState({ count: 2 });
    screen.component.setState({ count: 3 });

    screen.click("button");

    assertEquals(screen.component.clicks, 1);
    screen.cleanup();
});

Deno.test("property sync: input.value should follow state even after user edits", () => {
    const screen = renderMainzComponent(fixtures.ControlledInputComponent);
    const input = screen.getBySelector<HTMLInputElement>("input");

    input.value = "user-edit";
    screen.component.setState({ text: "server-next" });

    assertEquals(input.value, "server-next");
    screen.cleanup();
});

Deno.test("property sync: input.checked should follow state when toggled", () => {
    const screen = renderMainzComponent(fixtures.ControlledCheckedComponent);
    const checkbox = screen.getBySelector<HTMLInputElement>("input[type='checkbox']");

    checkbox.checked = false;
    screen.component.setState({ checked: true });

    assertEquals(checkbox.checked, true);
    screen.cleanup();
});

Deno.test("sanity: simple text patch should keep the same text node", () => {

    const screen = renderMainzComponent(fixtures.TextNodeComponent);
    const paragraph = screen.getBySelector("p");
    const textBefore = paragraph.firstChild;

    screen.component.setState({ value: "2" });

    const textAfter = paragraph.firstChild;
    assert(textAfter === textBefore, "Expected text node to preserve identity");
    assertEquals(textAfter?.textContent, "2");
    screen.cleanup();
});