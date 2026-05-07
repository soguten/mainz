/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import {
  renderMainzComponent,
  setupMainzDom,
} from "../../../../src/testing/mainz-testing.ts";

await setupMainzDom();

const fixtures = await import(
  "./DocsHomeContent.fixture.tsx"
) as typeof import("./DocsHomeContent.fixture.tsx");

Deno.test("DocsHomeContent resolves overview cards from the docs service", () => {
  const view = renderMainzComponent(fixtures.DocsHomeContentRouteHost);

  try {
    assertEquals(
      view.getBySelector(".docs-title").textContent,
      "Build documentation that feels like a product",
    );

    const cards = view.container.querySelectorAll(".docs-card");
    assertEquals(cards.length > 0, true);
    assertEquals(cards[0]?.textContent?.includes("Quickstart"), true);
  } finally {
    view.cleanup();
  }
});
