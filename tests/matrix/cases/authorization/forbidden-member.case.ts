/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { scenarioTest } from "../../scenario-harness.ts";

export const forbiddenMemberCase = scenarioTest({
  name:
    "authorization renders forbidden output for blocked authenticated members",
  run: async ({ app }) => {
    const screen = await app.route("/admin").render();

    try {
      assertEquals(window.location.pathname, "/admin");
      assertEquals(document.documentElement.lang, "en");
      assertEquals(
        document.querySelector("[data-mainz-authorization='forbidden']")
          ?.textContent
          ?.trim(),
        "403 Forbidden",
      );
      assertStringIncludes(document.body.textContent ?? "", "403 Forbidden");
      assertEquals(
        document.querySelector("[data-page='admin']"),
        null,
      );
    } finally {
      screen.cleanup();
    }
  },
});
