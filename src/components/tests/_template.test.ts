/// <reference lib="deno.ns" />

/**
 * [Group] tests
 *
 * Verifies that [...]
 * and ensures [...]
 */

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

await setupMainzDom();

// Replace `[group]` and rename this file for the suite.
const fixtures = await import(
  "./_template.fixture.tsx"
) as typeof import("./_template.fixture.tsx");

Deno.test.ignore("[group]: should ...", () => {
  const screen = renderMainzComponent(fixtures.ExampleComponent);

  // act
  screen.click("button");

  // assert
  assertEquals(screen.getBySelector("button").textContent, "1");

  screen.cleanup();
});
