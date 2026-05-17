/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { waitFor } from "mainz/testing";
import {
  waitForNextNavigationReady,
  waitForNextNavigationStart,
} from "../../../helpers/navigation.ts";
import { scenarioTest } from "../../scenario-harness.ts";

export const unlocalizedRoutingHomeCase = scenarioTest({
  name: "routes stay unprefixed when locale routing is absent",
  run: async ({ navigation, app }) => {
    const html = await app.route("/").html();
    assertStringIncludes(html, "<html>");

    const screen = await app.route("/").render();

    try {
      await waitFor(() => document.documentElement.lang === "");

      assertEquals(window.location.pathname, "/");
      assertEquals(document.documentElement.lang, "");
      assertEquals(
        document.documentElement.dataset.mainzNavigation,
        navigation,
      );
      assertStringIncludes(
        document.body.textContent ?? "",
        "Unlocalized routing fixture",
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
        locale: undefined,
        navigationType: "push",
      });
      const ready = waitForNextNavigationReady({
        mode: "spa",
        path: "/quickstart",
        matchedPath: "/quickstart",
        locale: undefined,
        navigationType: "push",
      });

      screen.click('a[href="/quickstart"]');

      await started;
      await ready;

      await waitFor(() =>
        window.location.pathname === "/quickstart" &&
        (document.body.textContent ?? "").includes("Unlocalized routing")
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
