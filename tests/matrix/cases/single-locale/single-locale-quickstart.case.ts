/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { waitFor } from "../../../../src/testing/async-testing.ts";
import { scenarioTest } from "../../scenario-harness.ts";

export const singleLocaleQuickstartCase = scenarioTest({
  name: "single-locale child routes stay unprefixed across navigation modes",
  run: async ({ navigation, app }) => {
    const response = await app.route("/quickstart").load();
    if (typeof response.status === "number") {
      assertEquals(response.status, 200);
    }

    const screen = await app.route("/quickstart").render();

    try {
      await waitFor(() =>
        document.documentElement.lang === "en" &&
        (document.body.textContent ?? "").includes("Why Mainz")
      );

      assertEquals(window.location.pathname, "/quickstart");
      assertEquals(document.documentElement.lang, "en");
      assertEquals(
        document.documentElement.dataset.mainzNavigation,
        navigation,
      );
      assertStringIncludes(
        document.body.textContent ?? "",
        "Create your first page",
      );

      assertLinkHref("Overview", "/");
      assertLinkHref("Guides", "/quickstart");
      assertLinkHref("Reference", "/reference");
    } finally {
      screen.cleanup();
    }
  },
});

function assertLinkHref(label: string, expectedHref: string): void {
  const link = Array.from(document.querySelectorAll("a"))
    .find((candidate) => candidate.textContent?.trim() === label);
  assertEquals(link?.getAttribute("href") ?? null, expectedHref);
}
