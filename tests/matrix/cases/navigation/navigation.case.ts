/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { nextTick, waitFor } from "../../../../src/testing/async-testing.ts";
import {
  waitForNextNavigationReady,
  waitForNextNavigationStart,
} from "../../../helpers/navigation.ts";
import { matrixTest } from "../../harness.ts";

export const navigationCase = matrixTest({
  name: "navigation preserves locale switching semantics",
  fixture: "RoutedApp",
  exercise: {
    render: ["csr", "ssg"],
    navigation: ["spa", "mpa"],
  },
  run: async ({ combo, artifact, fixture }) => {
    const screen = await fixture.render(artifact, "/");

    try {
      await waitFor(() =>
        document.querySelector<HTMLAnchorElement>(
            '.locale-chip[data-locale="pt"]',
          ) !== null &&
        document.documentElement.lang === "en"
      );

      assertEquals(
        document.documentElement.dataset.mainzNavigation,
        combo.navigation,
      );
      assertStringIncludes(
        document.body.textContent ?? "",
        "Start guided journey",
      );

      const localeLink = document.querySelector<HTMLAnchorElement>(
        '.locale-chip[data-locale="pt"]',
      );
      assert(
        localeLink,
        "Expected the PT locale switcher link to be rendered.",
      );
      assertEquals(localeLink.getAttribute("href"), "/pt/");

      const initialText = document.body.textContent ?? "";

      localeLink.dispatchEvent(new Event("focusin", { bubbles: true }));
      await nextTick();

      const prefetchHref =
        document.head.querySelector('link[rel="prefetch"][as="document"]')
          ?.getAttribute(
            "href",
          ) ?? null;
      const clickEvent = new window.MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        button: 0,
      });
      const started = combo.navigation === "spa"
        ? waitForNextNavigationStart({
          mode: "spa",
          path: "/",
          matchedPath: "/",
          locale: "pt",
          navigationType: "push",
        })
        : undefined;
      const clickResult = localeLink.dispatchEvent(clickEvent);
      await waitForPostClick(combo.navigation, started);

      if (combo.navigation === "spa") {
        assertEquals(clickResult, false);
        assertEquals(clickEvent.defaultPrevented, true);
        assertEquals(window.location.pathname, "/pt/");
        assertEquals(document.documentElement.lang, "pt");
        assertStringIncludes(
          document.body.textContent ?? "",
          "Iniciar trilha guiada",
        );
        assertEquals(
          document.documentElement.dataset.mainzTransitionPhase,
          undefined,
        );
        assertEquals(prefetchHref, null);
        return;
      }

      assertEquals(clickResult, true);
      assertEquals(clickEvent.defaultPrevented, false);
      assertEquals(document.documentElement.lang, "en");
      assertStringIncludes(
        document.body.textContent ?? "",
        "Start guided journey",
      );
      assertEquals(document.body.textContent ?? "", initialText);

  if (combo.navigation === "mpa") {
        assertEquals(prefetchHref, "https://mainz.local/pt/");
        assertEquals(
          document.documentElement.dataset.mainzTransitionPhase,
          "leaving",
        );
        return;
      }

      assertEquals(prefetchHref, null);
      assertEquals(
        document.documentElement.dataset.mainzTransitionPhase,
        undefined,
      );
    } finally {
      screen.cleanup();
    }
  },
});

async function waitForPostClick(
  navigationMode: "spa" | "mpa",
  started?: Promise<unknown>,
): Promise<void> {
  if (navigationMode === "spa") {
    await Promise.all([
      started,
      waitForNextNavigationReady({
        mode: "spa",
        path: "/",
        matchedPath: "/",
        locale: "pt",
        navigationType: "push",
      }),
    ]);
    return;
  }

  await nextTick();
}
