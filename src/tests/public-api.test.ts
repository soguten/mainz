/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";

Deno.test("public-api/root: should expose the ownership-based surface without legacy resource exports", async () => {
    const mainz = await import("mainz");

    assertEquals(typeof mainz.Component, "function");
    assertEquals(typeof mainz.Page, "function");
    assertEquals(typeof mainz.RenderStrategy, "function");
    assertEquals(typeof mainz.startPagesApp, "function");

    assertEquals("defineResource" in mainz, false);
    assertEquals("readResource" in mainz, false);
    assertEquals("ResourceAccessError" in mainz, false);
    assertEquals("ComponentResource" in mainz, false);
    assertEquals("ResourceBoundary" in mainz, false);
    assertEquals("ResourceComponent" in mainz, false);
});

Deno.test("public-api/components: should keep the main components barrel ownership-first", async () => {
    const components = await import("../components/index.ts");

    assertEquals(typeof components.Component, "function");
    assertEquals(typeof components.Page, "function");
    assertEquals(typeof components.RenderStrategy, "function");
    assertEquals(typeof components.ensureMainzCustomElementDefined, "function");

    assertEquals("ComponentResource" in components, false);
    assertEquals("ResourceBoundary" in components, false);
    assertEquals("ResourceComponent" in components, false);
});
