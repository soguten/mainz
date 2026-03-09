/// <reference lib="deno.ns" />

/**
 * Testing helper event and query tests
 *
 * Verifies helper actions (`click`, `dispatch`, `input`, `change`) and selector APIs,
 * including expected behavior when queried elements do not exist.
 */

import { assertEquals, assertThrows } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

await setupMainzDom();

const fixtures = await import("./mainz-testing.events.fixture.tsx") as typeof import("./mainz-testing.events.fixture.tsx");

Deno.test("testing helper/events: click should trigger click handlers", () => {
    const screen = renderMainzComponent(fixtures.ClickHarnessComponent);

    screen.click("button");
    screen.click("button");

    assertEquals(screen.getBySelector("button").textContent, "2");
    screen.cleanup();
});

Deno.test("testing helper/events: dispatch should deliver custom events", () => {
    const screen = renderMainzComponent(fixtures.DispatchHarnessComponent);

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

Deno.test("testing helper/events: input/change helpers should dispatch the corresponding events", () => {
    const screen = renderMainzComponent(fixtures.FormHarnessComponent);

    screen.input("textarea", "hello");
    assertEquals(screen.getBySelector("p[data-role='summary']").textContent, "hello|a");

    screen.change("select", "b");
    assertEquals(screen.getBySelector("p[data-role='summary']").textContent, "hello|b");

    screen.cleanup();
});

Deno.test("testing helper/query: queryBySelector/getBySelector should handle missing elements", () => {
    const screen = renderMainzComponent(fixtures.ClickHarnessComponent);

    assertEquals(screen.queryBySelector(".missing"), null);
    assertThrows(
        () => screen.getBySelector(".missing"),
        Error,
        "Expected element for selector: .missing",
    );

    screen.cleanup();
});


