/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { nextTick } from "../../../../src/testing/async-testing.ts";
import { scenarioTest } from "../../scenario-harness.ts";

export const generatedTagStabilityCase = scenarioTest({
  name: "generated custom element tags stay stable in production output",
  run: async ({ app }) => {
    const html = await app.route("/").html();
    assertStringIncludes(html, "<x-stable-name-home-page");
    assertStringIncludes(html, "<x-stable-name-panel");

    const screen = await app.document("index.html").renderAt({
      url: "https://mainz.local/",
      navigationReady: {
        locale: "en",
        navigationType: "initial",
      },
    });

    try {
      await nextTick();

      assert(document.querySelector("x-stable-name-home-page"));
      assert(document.querySelector("x-stable-name-panel"));
      assertEquals(
        customElements.get("x-stable-name-home-page") !== undefined,
        true,
      );
      assertEquals(
        customElements.get("x-stable-name-panel") !== undefined,
        true,
      );
      assertStringIncludes(
        document.body.textContent ?? "",
        "Generated tag stability",
      );
    } finally {
      screen.cleanup();
    }
  },
});
