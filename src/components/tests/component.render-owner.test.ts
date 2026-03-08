/// <reference lib="deno.ns" />

/**
 * Render owner tests
 *
 * Ensures that DOM events created during render are
 * associated with the current Mainz component.
 */

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

setupMainzDom();

const fixtures = await import("./component.render-owner.fixture.tsx") as typeof import("./component.render-owner.fixture.tsx");

Deno.test("render owner: should register DOM events under the rendering Mainz component", () => {
    
    const screen = renderMainzComponent(fixtures.OwnerBoundClickComponent);

    screen.click("button");
    screen.click("button");

    assertEquals(screen.getBySelector("button").textContent, "2");
    screen.cleanup();
});

Deno.test("render owner: should tear down DOM listeners when the Mainz component unmounts", () => {
    
    const screen = renderMainzComponent(fixtures.TeardownOwnerComponent);
    const button = screen.getBySelector<HTMLButtonElement>("button");

    button.click();
    assertEquals(screen.component.state.clicks, 1);

    screen.cleanup();

    button.click();

    assertEquals(screen.component.state.clicks, 1);
});

Deno.test("render owner: should keep owner context for DOM events created inside functional children", () => {
    const screen = renderMainzComponent(fixtures.FunctionalChildOwnerComponent);

    screen.click("button");
    screen.click("button");

    assertEquals(screen.getBySelector("button").textContent, "2");
    screen.cleanup();
});

Deno.test("render owner: should tear down listeners created inside functional children on unmount", () => {
    
    const screen = renderMainzComponent(fixtures.FunctionalTeardownComponent);
    const button = screen.getBySelector<HTMLButtonElement>("button");

    button.click();
    assertEquals(screen.component.state.count, 1);

    screen.cleanup();

    button.click();

    assertEquals(screen.component.state.count, 1);
});