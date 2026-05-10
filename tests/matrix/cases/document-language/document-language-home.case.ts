/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { waitFor } from "../../../../src/testing/async-testing.ts";
import {
  waitForNextNavigationReady,
  waitForNextNavigationStart,
} from "../../../helpers/navigation.ts";
import { scenarioTest } from "../../scenario-harness.ts";

export const documentLanguageHomeCase = scenarioTest({
  name: "documentLanguage routes stay unprefixed and set html lang",
  run: async ({ navigation, app }) => {
    const html = await app.route("/").html();
    assertStringIncludes(html, '<html lang="pt-BR">');

    const screen = await app.route("/").render();

    try {
      await waitFor(() => document.documentElement.lang === "pt-BR");

      assertEquals(window.location.pathname, "/");
      assertEquals(document.documentElement.lang, "pt-BR");
      assertEquals(
        document.documentElement.dataset.mainzNavigation,
        navigation,
      );
      assertStringIncludes(
        document.body.textContent ?? "",
        "Document-language fixture",
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
        locale: "pt-BR",
        navigationType: "push",
      });
      const ready = waitForNextNavigationReady({
        mode: "spa",
        path: "/quickstart",
        matchedPath: "/quickstart",
        locale: "pt-BR",
        navigationType: "push",
      });

      screen.click('a[href="/quickstart"]');

      await started;
      await ready;

      await waitFor(() =>
        window.location.pathname === "/quickstart" &&
        (document.body.textContent ?? "").includes("Document language")
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
