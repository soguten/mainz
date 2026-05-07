/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { waitFor } from "../../../../src/testing/async-testing.ts";
import {
  waitForNextNavigationReady,
  waitForNextNavigationStart,
} from "../../../helpers/navigation.ts";
import { matrixTest } from "../../harness.ts";

export const singleLocaleHomeCase = matrixTest({
  name: "single-locale home routes stay unprefixed across navigation modes",
  fixture: "SingleLocaleRoutedApp",
  exercise: {
    render: ["csr", "ssg"],
    navigation: ["spa", "mpa", "enhanced-mpa"],
  },
  run: async ({ combo, artifact, fixture }) => {
    const screen = await fixture.render(artifact, "/");

    try {
      await waitFor(() => document.documentElement.lang === "en");

      assertEquals(window.location.pathname, "/");
      assertEquals(document.documentElement.lang, "en");
      assertEquals(
        document.documentElement.dataset.mainzNavigation,
        combo.navigation,
      );
      assertStringIncludes(
        document.body.textContent ?? "",
        "Single-locale fixture",
      );

      assertLinkHref("Overview", "/");
      assertLinkHref("Guides", "/quickstart");
      assertLinkHref("Reference", "/reference");

      if (combo.navigation !== "spa") {
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
