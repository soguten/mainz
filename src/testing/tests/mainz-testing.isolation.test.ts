/// <reference lib="deno.ns" />

/**
 * Testing helper isolation tests
 *
 * Verifies that multiple render screens do not interfere with each other and
 * that `cleanup()` behaves safely across repeated calls and final teardown.
 */

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

await setupMainzDom();

const fixtures = await import("./mainz-testing.isolation.fixture.tsx") as typeof import("./mainz-testing.isolation.fixture.tsx");

Deno.test("testing helper/isolation: multiple render screens should stay isolated", () => {
    const screenA = renderMainzComponent(fixtures.IsolationCounterA);
    const screenB = renderMainzComponent(fixtures.IsolationCounterB);

    screenA.click("button[data-role='a']");
    screenB.click("button[data-role='b']");

    assertEquals(screenA.getBySelector("button[data-role='a']").textContent, "1");
    assertEquals(screenB.getBySelector("button[data-role='b']").textContent, "1");

    screenA.cleanup();
    screenB.cleanup();
});

Deno.test("testing helper/isolation: cleanup should be idempotent and remove test root when empty", () => {
    const screenA = renderMainzComponent(fixtures.IsolationCounterA);
    const screenB = renderMainzComponent(fixtures.IsolationCounterB);

    const testRoot = document.getElementById("test-root");
    assertEquals(testRoot?.childElementCount, 2);

    screenA.cleanup();
    assertEquals(testRoot?.childElementCount, 1);

    screenA.cleanup();
    assertEquals(testRoot?.childElementCount, 1);

    screenB.cleanup();
    assertEquals(document.getElementById("test-root"), null);
});

Deno.test("testing helper/isolation: multiple interactive surfaces should coexist in the same test root without cross-talk", () => {
    const selectionScreen = renderMainzComponent(fixtures.IsolationSelectionSurface);
    const draftScreen = renderMainzComponent(fixtures.IsolationDraftSurface);

    try {
        selectionScreen.click("button[data-role='select-1']");
        assertEquals(selectionScreen.getBySelector("p[data-role='selection-summary']").textContent, "1");
        assertEquals(draftScreen.getBySelector("p[data-role='draft-summary']").textContent, "idle");

        draftScreen.input("textarea[data-role='draft-input']", 'import { Component } from "mainz";');
        draftScreen.click("button[data-role='validate']");

        assertEquals(draftScreen.getBySelector("p[data-role='draft-summary']").textContent, "ok");
        assertEquals(selectionScreen.getBySelector("p[data-role='selection-summary']").textContent, "1");
    } finally {
        selectionScreen.cleanup();
        draftScreen.cleanup();
    }
});
