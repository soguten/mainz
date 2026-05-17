/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { waitFor } from "mainz/testing";
import { scenarioTest } from "../../scenario-harness.ts";

export const unlocalizedRoutingQuickstartCase = scenarioTest({
  name: "child routes stay unprefixed when locale routing is absent",
  run: async ({ navigation, app }) => {
    const response = await app.route("/quickstart").load();
    if (typeof response.status === "number") {
      assertEquals(response.status, 200);
    }

    const screen = await app.route("/quickstart").render();

    try {
      await waitFor(() =>
        document.documentElement.lang === "" &&
        (document.body.textContent ?? "").includes("Unlocalized routing")
      );

      assertEquals(window.location.pathname, "/quickstart");
      assertEquals(document.documentElement.lang, "");
      assertEquals(
        document.documentElement.dataset.mainzNavigation,
        navigation,
      );
      assertStringIncludes(
        document.body.textContent ?? "",
        "The app omits i18n and keeps locale routing inactive.",
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
