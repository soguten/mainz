/// <reference lib="deno.ns" />

/**
 * Inline event tests
 *
 * Ensures that inline event handlers observe the latest component state
 * across re-renders.
 */

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

setupMainzDom();

const fixtures = await import("./component.inline-events.fixture.tsx") as typeof import("./component.inline-events.fixture.tsx");

Deno.test("inline events: stale closure should be observable across re-renders", () => {
    const screen = renderMainzComponent(fixtures.InlineClosureComponent);

    screen.click("button");
    assertEquals(screen.getBySelector("button").textContent, "1");

    screen.click("button");
    assertEquals(screen.getBySelector("button").textContent, "2");

    screen.cleanup();
});

Deno.test("inline events: handler should observe the latest state-dependent label", () => {
    const screen = renderMainzComponent(fixtures.InlineLabelComponent);

    screen.component.setState({ label: "B" });
    screen.click("button");

    assertEquals(screen.getBySelector("p").textContent, "B");
    screen.cleanup();
});

Deno.test("inline events: stable instance handler should continue working across re-renders", () => {
    const screen = renderMainzComponent(fixtures.StableHandlerComponent);

    screen.click("button");
    screen.click("button");

    assertEquals(screen.getBySelector("button").textContent, "2");
    screen.cleanup();
});