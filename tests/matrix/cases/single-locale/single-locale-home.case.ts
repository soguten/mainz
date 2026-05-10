/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { waitFor } from "../../../../src/testing/async-testing.ts";
import {
  waitForNextNavigationReady,
  waitForNextNavigationStart,
} from "../../../helpers/navigation.ts";
import { scenarioTest } from "../../scenario-harness.ts";

export const singleLocaleHomeCase = scenarioTest({
  name: "single-locale home routes stay unprefixed across navigation modes",
  run: async ({ navigation, app }) => {
    const screen = await app.route("/").render();

    try {
      await waitFor(() => document.documentElement.lang === "en");

      assertEquals(window.location.pathname, "/");
      assertEquals(document.documentElement.lang, "en");
      assertEquals(
        document.documentElement.dataset.mainzNavigation,
        navigation,
      );
      assertStringIncludes(
        document.body.textContent ?? "",
        "Single-locale fixture",
      );

      assertLinkHref("Overview", "/");
      assertLinkHref("Guides", "/quickstart");
      assertLinkHref("Reference", "/reference");

      if (navigation !== "spa") {
        return;
      }

      const started = waitForNextNavigationStart({
        mode: "spa",
        path: "/quickstart",
        matchedPath: "/quickstart",
        locale: "en",
        navigationType: "push",
      });
      const ready = waitForNextNavigationReady({
        mode: "spa",
        path: "/quickstart",
        matchedPath: "/quickstart",
        locale: "en",
        navigationType: "push",
      });

      screen.click('a[href="/quickstart"]');

      await started;
      await ready;

      await waitFor(() =>
        window.location.pathname === "/quickstart" &&
        (document.body.textContent ?? "").includes("Why Mainz")
      );
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
