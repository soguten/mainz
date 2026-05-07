/// <reference lib="deno.ns" />

/**
 * [Group] testing helper tests
 *
 * Verifies that [...]
 * and ensures [...]
 */

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

await setupMainzDom();

const fixtures = await import(
  "./_template.fixture.tsx"
) as typeof import("./_template.fixture.tsx");

Deno.test.ignore("testing helper/[group]: should ...", () => {
  const screen = renderMainzComponent(fixtures.ExampleTestingHarnessComponent);

  screen.click("button");

  assertEquals(screen.getBySelector("button").textContent, "1");
  screen.cleanup();
});
