/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { matrixTest } from "../../harness.ts";

export const routedDiClientCase = matrixTest({
  name: "di resolves route state and summaries on client-rendered routes",
  fixture: "RoutedDIClientApp",
  exercise: {
    render: ["csr"],
    navigation: ["spa"],
  },
  run: async ({ artifact, fixture }) => {
    const screen = await fixture.render(artifact, "/stories/signal-from-di/");

    try {
      assertEquals(document.title, "DI Dispatch");
      assertEquals(
        document.querySelector("[data-client-story-slug]")?.textContent?.trim(),
        "signal-from-di",
      );
      assertEquals(
        document.querySelector("[data-client-story-summary]")?.textContent
          ?.trim(),
        "DI composed the client route summary.",
      );
      assertStringIncludes(
        document.body.textContent ?? "",
        "Client dispatch board",
      );
    } finally {
      screen.cleanup();
    }
  },
});
