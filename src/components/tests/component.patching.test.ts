/// <reference lib="deno.ns" />

/**
 * DOM patching tests
 *
 * Verifies that the DOM patching algorithm preserves node identity and
 * correctly updates attributes, properties, and listeners across renders.
 */

import { assert, assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

await setupMainzDom();

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

Deno.test("patchChildren: unkeyed reordering should reuse nodes by position", () => {
    const screen = renderMainzComponent(fixtures.UnkeyedListPatchComponent);

    const list = screen.getBySelector<HTMLUListElement>("ul");
    const firstBefore = list.firstElementChild;
    const beforeA = screen.getBySelector("li[data-item='a']");

    screen.component.setState({ items: ["c", "b", "a"] });

    const firstAfter = list.firstElementChild;
    const afterA = screen.getBySelector("li[data-item='a']");

    assert(firstAfter === firstBefore, "Expected first position node to be reused");
    assertEquals(firstAfter?.getAttribute("data-item"), "c");
    assert(afterA !== beforeA, "Expected item 'a' identity to change without keys");

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

Deno.test("listeners: registerEvent + setState should update UI immediately after click", () => {
    const screen = renderMainzComponent(fixtures.ReRegisterListenerStateComponent);

    assertEquals(screen.getBySelector("p[data-role='info']").textContent, "renders=0 clicks=0");

    screen.click("button[data-role='target']");

    assertEquals(screen.getBySelector("p[data-role='info']").textContent, "renders=0 clicks=1");
    screen.cleanup();
});

Deno.test("listeners: stateful handlers re-registered in afterRender should not duplicate", () => {
    const screen = renderMainzComponent(fixtures.ReRegisterListenerStateComponent);

    screen.click("button[data-role='rerender']");
    screen.click("button[data-role='rerender']");

    screen.click("button[data-role='target']");
    assertEquals(screen.getBySelector("p[data-role='info']").textContent, "renders=2 clicks=1");

    screen.click("button[data-role='target']");
    assertEquals(screen.getBySelector("p[data-role='info']").textContent, "renders=2 clicks=2");

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

Deno.test("property sync: controlled input should allow typing multiple characters", () => {
    const screen = renderMainzComponent(fixtures.ControlledInputTypingComponent);

    screen.input("input", "m");
    assertEquals(screen.getBySelector<HTMLInputElement>("input").value, "m");
    assertEquals(screen.getBySelector("p[data-role='info']").textContent, "text=m observed=m");

    screen.input("input", "mainz");
    assertEquals(screen.getBySelector<HTMLInputElement>("input").value, "mainz");
    assertEquals(screen.getBySelector("p[data-role='info']").textContent, "text=mainz observed=mainz");

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

Deno.test("property sync: input.checked should support true -> false transitions", () => {
    const screen = renderMainzComponent(fixtures.ControlledCheckedComponent);
    const checkbox = screen.getBySelector<HTMLInputElement>("input[type='checkbox']");

    screen.component.setState({ checked: true });
    assertEquals(checkbox.checked, true);

    screen.component.setState({ checked: false });
    assertEquals(checkbox.checked, false);

    screen.cleanup();
});
Deno.test("patchChildren: counter-like update should preserve static sibling nodes", () => {
    const screen = renderMainzComponent(fixtures.CounterPatchComponent);

    const root = screen.getBySelector("div[data-role='counter-root']");
    const titleBefore = screen.getBySelector("h1");
    const paragraphBefore = screen.getBySelector("p[data-role='count']");
    const buttonBefore = screen.getBySelector("button");
    const textBefore = paragraphBefore.firstChild;

    screen.component.setState({ count: 1 });

    const titleAfter = screen.getBySelector("h1");
    const paragraphAfter = screen.getBySelector("p[data-role='count']");
    const buttonAfter = screen.getBySelector("button");

    assert(titleAfter === titleBefore, "Expected title node to preserve identity");
    assert(paragraphAfter === paragraphBefore, "Expected label node to preserve identity");
    assert(buttonAfter === buttonBefore, "Expected button node to preserve identity");
    assert(paragraphAfter.firstChild === textBefore, "Expected label text node to preserve identity");
    assertEquals(root.textContent, "Mainz CounterCount: 1Increment");

    screen.cleanup();
});

Deno.test("patchChildren: counter-like text update should avoid replaceChildren churn", () => {
    const screen = renderMainzComponent(fixtures.CounterPatchComponent);

    const root = screen.getBySelector<HTMLElement>("div[data-role='counter-root']");
    const paragraph = screen.getBySelector<HTMLElement>("p[data-role='count']");

    const rootAny = root as unknown as {
        replaceChildren: (...nodes: Array<Node | string>) => void;
    };
    const paragraphAny = paragraph as unknown as {
        replaceChildren: (...nodes: Array<Node | string>) => void;
    };

    const originalRootReplace = rootAny.replaceChildren.bind(root);
    const originalParagraphReplace = paragraphAny.replaceChildren.bind(paragraph);

    let rootReplaceCalls = 0;
    let paragraphReplaceCalls = 0;

    rootAny.replaceChildren = (...nodes: Array<Node | string>) => {
        rootReplaceCalls += 1;
        originalRootReplace(...nodes);
    };

    paragraphAny.replaceChildren = (...nodes: Array<Node | string>) => {
        paragraphReplaceCalls += 1;
        originalParagraphReplace(...nodes);
    };

    try {
        screen.component.setState({ count: 1 });
        assertEquals(rootReplaceCalls, 0);
        assertEquals(paragraphReplaceCalls, 0);
    } finally {
        rootAny.replaceChildren = originalRootReplace;
        paragraphAny.replaceChildren = originalParagraphReplace;
        screen.cleanup();
    }
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



Deno.test("fragment root: should not duplicate DOM tree", () => {
    const screen = renderMainzComponent(fixtures.FragmentRootComponent);

    screen.component.setState({ count: 1 });
    screen.component.setState({ count: 2 });

    const titles = screen.component.querySelectorAll("h1");

    assertEquals(titles.length, 1);

    screen.cleanup();
});
