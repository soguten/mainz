/// <reference lib="deno.ns" />

/**
 * [Feature] tests
 *
 * Verifies that [...]
 * and ensures [...]
 */

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

setupMainzDom();

// Replace `example` with the suite name.
const fixtures = await import("./_template.fixture.tsx") as typeof import("./_template.fixture.tsx");

Deno.test("[feature]: should ...", () => {
    const screen = renderMainzComponent(fixtures.ExampleComponent);

    // act
    screen.click("button");

    // assert
    assertEquals(screen.getBySelector("button").textContent, "1");

    screen.cleanup();
});