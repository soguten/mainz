/// <reference lib="deno.ns" />

/**
 * Attribute tests
 *
 * Verifies that component attributes are accessible during lifecycle
 * and correctly applied, updated, and removed during rendering.
 */

import { assertEquals, assertStrictEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

setupMainzDom();

const fixtures = await import("./component.attributes.fixture.tsx") as typeof import("./component.attributes.fixture.tsx");

Deno.test("attrs: should be available inside initState before first render", () => {

    const screen = renderMainzComponent(fixtures.InitStateReadsAttrComponent, {
        attrs: {
            "data-role": "admin",
        },
    });

    assertEquals(screen.getBySelector("p").textContent, "admin");
    screen.cleanup();
});

Deno.test("attrs: should be queryable inside onMount", () => {

    const screen = renderMainzComponent(fixtures.OnMountReadsAttrComponent, {
        attrs: {
            "data-role": "editor",
        },
    });

    assertEquals(screen.component.capturedRole, "editor");
    screen.cleanup();
});

Deno.test("attrs: should expose initial attributes on the host element", () => {

    const screen = renderMainzComponent(fixtures.HostAttrsComponent, {
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

    const screen = renderMainzComponent(fixtures.AddAttrOnRenderComponent);

    const buttonBefore = screen.getBySelector<HTMLButtonElement>("button");
    assertEquals(buttonBefore.hasAttribute("data-active"), false);

    screen.component.setState({ active: true });

    const buttonAfter = screen.getBySelector<HTMLButtonElement>("button");
    assertStrictEquals(buttonAfter, buttonBefore);
    assertEquals(buttonAfter.getAttribute("data-active"), "true");

    screen.cleanup();
});

Deno.test("attrs: render should remove attribute when state no longer requires it", () => {

    const screen = renderMainzComponent(fixtures.RemoveAttrOnRenderComponent);

    const buttonBefore = screen.getBySelector<HTMLButtonElement>("button");
    assertEquals(buttonBefore.getAttribute("data-active"), "true");

    screen.component.setState({ active: false });

    const buttonAfter = screen.getBySelector<HTMLButtonElement>("button");
    assertStrictEquals(buttonAfter, buttonBefore);
    assertEquals(buttonAfter.hasAttribute("data-active"), false);

    screen.cleanup();
});

Deno.test("attrs: render should update attribute value without replacing the element", () => {

    const screen = renderMainzComponent(fixtures.UpdateAttrValueComponent);

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

    const screen = renderMainzComponent(fixtures.ToggleExclusiveAttrsComponent);

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

    const screen = renderMainzComponent(fixtures.MissingAttrComponent);

    assertEquals(screen.getBySelector("p").textContent, "none");
    assertEquals(screen.component.hasAttribute("data-role"), false);

    screen.cleanup();
});