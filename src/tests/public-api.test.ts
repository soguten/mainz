/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";

Deno.test("public-api/root: should expose the ownership-based surface without legacy resource exports", async () => {
    const mainz = await import("mainz");

    assertEquals(typeof mainz.Component, "function");
    assertEquals(typeof mainz.Page, "function");
    assertEquals(typeof mainz.RenderStrategy, "function");
    assertEquals(typeof mainz.Authorize, "function");
    assertEquals(typeof mainz.AllowAnonymous, "function");
    assertEquals(typeof mainz.startPagesApp, "function");
    assertEquals(typeof mainz.isRouteVisible, "function");
    assertEquals(typeof mainz.filterVisibleRoutes, "function");
    assertEquals(typeof mainz.findMissingAuthorizationPolicies, "function");
    assertEquals(mainz.MAINZ_NAVIGATION_ABORT_EVENT, "mainz:navigationabort");
    assertEquals(mainz.MAINZ_LOCALE_CHANGE_EVENT, "mainz:localechange");
    assertEquals(mainz.MAINZ_NAVIGATION_START_EVENT, "mainz:navigationstart");
    assertEquals(mainz.MAINZ_NAVIGATION_ERROR_EVENT, "mainz:navigationerror");
    assertEquals(mainz.MAINZ_NAVIGATION_READY_EVENT, "mainz:navigationready");

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
    assertEquals(typeof components.Authorize, "function");
    assertEquals(typeof components.AllowAnonymous, "function");
    assertEquals(typeof components.ensureMainzCustomElementDefined, "function");

    assertEquals("ComponentResource" in components, false);
    assertEquals("ResourceBoundary" in components, false);
    assertEquals("ResourceComponent" in components, false);
});

Deno.test("public-api/testing: should expose lifecycle helpers through mainz/testing", async () => {
    const testing = await import("mainz/testing");

    assertEquals(typeof testing.prepareNavigationTest, "function");
    assertEquals(typeof testing.waitForNavigationAbort, "function");
    assertEquals(typeof testing.waitForNavigationStart, "function");
    assertEquals(typeof testing.waitForNavigationError, "function");
    assertEquals(typeof testing.waitForNavigationReady, "function");
});
