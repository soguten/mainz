/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { scenarioTest } from "../../scenario-harness.ts";

export const routedDiClientCase = scenarioTest({
  name: "di resolves route state and summaries on client-rendered routes",
  run: async ({ app }) => {
    const screen = await app.route("/stories/signal-from-di/").render();

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
