/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import {
  assertDocumentState,
  assertSeoState,
} from "../../../helpers/document.ts";
import { scenarioTest } from "../../scenario-harness.ts";

const matrixBasePath = "/docs/mainz/";
const matrixSiteUrl = "https://example.com/docs/mainz";
const localBaseUrl = "https://mainz.local/docs/mainz";

export const basePathQuickstartCase = scenarioTest({
  name: "basePath keeps localized CSR routes consistent",
  profile: "gh-pages",
  run: async ({ navigation, app }) => {
    const screen = await app.document("index.html").renderAt({
      url: `${localBaseUrl}/pt/quickstart`,
      basePath: matrixBasePath,
      navigationReady: {
        locale: "pt",
        path: "/quickstart",
        matchedPath: "/quickstart",
        navigationType: "initial",
      },
    });

    try {
      assertDocumentState({
        navigation,
        locale: "pt",
        bodyIncludes: "Passo rapido da fixture",
      });
      assertEquals(window.location.pathname, `${matrixBasePath}pt/quickstart`);
      assertEquals(
        document.querySelector<HTMLAnchorElement>(
          '.locale-chip[data-locale="en"]',
        )?.getAttribute("href"),
        `${matrixBasePath}quickstart`,
      );
      assertEquals(
        document.querySelector<HTMLAnchorElement>(
          '.locale-chip[data-locale="pt"]',
        )?.getAttribute("href"),
        `${matrixBasePath}pt/quickstart`,
      );
      assertSeoState({
        canonical: `${matrixSiteUrl}/pt/quickstart`,
        alternates: {
          en: `${matrixSiteUrl}/quickstart`,
          pt: `${matrixSiteUrl}/pt/quickstart`,
        },
      });
    } finally {
      screen.cleanup();
    }
  },
});
