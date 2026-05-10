/// <reference lib="deno.ns" />

import { assert, assertEquals } from "@std/assert";
import { nextTick } from "../../../../src/testing/async-testing.ts";
import {
  assertDocumentState,
  assertSeoState,
  readAlternateHref,
  readCanonicalHref,
} from "../../../helpers/document.ts";
import {
  waitForNextNavigationReady,
  waitForNextNavigationStart,
} from "../../../helpers/navigation.ts";
import { scenarioTest } from "../../scenario-harness.ts";

const matrixBasePath = "/docs/mainz/";
const matrixSiteUrl = "https://example.com/docs/mainz";
const localBaseUrl = "https://mainz.local/docs/mainz";

export const basePathHomeCase = scenarioTest({
  name: "basePath keeps localized home routes and navigation consistent",
  profile: "gh-pages",
  run: async ({ navigation, app }) => {
    const screen = await app.document("index.html").renderAt({
      url: `${localBaseUrl}/`,
      basePath: matrixBasePath,
      navigationReady: {
        locale: "en",
        navigationType: "initial",
      },
    });

    try {
      assertDocumentState({
        navigation,
        locale: "en",
        bodyIncludes: "Fixture home",
      });
      assertEquals(window.location.pathname, matrixBasePath);
      assertEquals(
        document.querySelector<HTMLAnchorElement>(
          '.locale-chip[data-locale="pt"]',
        )
          ?.getAttribute("href"),
        `${matrixBasePath}pt/`,
      );
      assertEquals(readCanonicalHref(), `${matrixSiteUrl}/`);
      assertEquals(readAlternateHref("pt"), `${matrixSiteUrl}/pt/`);
      assertSeoState({
        canonical: `${matrixSiteUrl}/`,
        alternates: {
          pt: `${matrixSiteUrl}/pt/`,
        },
      });

      const localeLink = document.querySelector<HTMLAnchorElement>(
        '.locale-chip[data-locale="pt"]',
      );
      assert(
        localeLink,
        "Expected the PT locale switcher link to exist under a basePath.",
      );
      assertEquals(localeLink.getAttribute("href"), `${matrixBasePath}pt/`);

      localeLink.dispatchEvent(new Event("focusin", { bubbles: true }));
      await nextTick();

      const prefetchHref =
        document.head.querySelector('link[rel="prefetch"][as="document"]')
          ?.getAttribute(
            "href",
          ) ?? null;

      if (navigation === "spa") {
        const started = waitForNextNavigationStart({
          mode: "spa",
          path: "/",
          matchedPath: "/",
          locale: "pt",
          navigationType: "push",
        });
        const ready = waitForNextNavigationReady({
          mode: "spa",
          path: "/",
          matchedPath: "/",
          locale: "pt",
          navigationType: "push",
        });

        localeLink.click();
        await started;
        await ready;

        assertEquals(window.location.pathname, `${matrixBasePath}pt/`);
        assertDocumentState({
          locale: "pt",
          bodyIncludes: "Inicio da fixture",
        });
        assertSeoState({
          canonical: `${matrixSiteUrl}/pt/`,
        });
        assertEquals(prefetchHref, null);
        assertEquals(
          document.documentElement.dataset.mainzTransitionPhase,
          undefined,
        );
        return;
      }

      const clickEvent = new window.MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        button: 0,
      });
      const clickResult = localeLink.dispatchEvent(clickEvent);

      assertEquals(clickResult, true);
      assertEquals(clickEvent.defaultPrevented, false);
      assertEquals(window.location.pathname, `${matrixBasePath}pt/`);
      assertDocumentState({
        locale: "en",
        bodyIncludes: "Fixture home",
      });

      if (navigation === "mpa") {
        assertEquals(prefetchHref, `https://mainz.local${matrixBasePath}pt/`);
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
