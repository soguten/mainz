/// <reference lib="deno.ns" />

import { assert, assertEquals } from "@std/assert";
import {
  assertDocumentState,
  assertSeoState,
} from "../../../helpers/document.ts";
import { scenarioTest } from "../../scenario-harness.ts";

const matrixBasePath = "/docs/mainz/";
const matrixSiteUrl = "https://example.com/docs/mainz";
const localBaseUrl = "https://mainz.local/docs/mainz";

export const basePathNotFoundCase = scenarioTest({
  name: "basePath keeps localized notFound routes and SEO consistent",
  profile: "gh-pages",
  run: async ({ navigation, app }) => {
    const screen = await app.document("404.html").renderAt({
      url: `${localBaseUrl}/pt/nao-existe`,
      basePath: matrixBasePath,
      navigationReady: {
        locale: "pt",
        navigationType: "initial",
      },
    });

    try {
      assertDocumentState({
        navigation,
        locale: "pt",
        bodyIncludes: "Essa rota nao existe na fixture.",
      });

      const localeLink = document.querySelector<HTMLAnchorElement>(
        '.locale-chip[data-locale="en"]',
      );
      assert(
        localeLink,
        "Expected the EN locale switcher link to exist on the localized 404 page.",
      );
      assertEquals(
        localeLink.getAttribute("href"),
        `${matrixBasePath}nao-existe`,
      );
      assertSeoState({
        canonical: `${matrixSiteUrl}/pt/nao-existe`,
        alternates: {
          en: `${matrixSiteUrl}/nao-existe`,
          pt: `${matrixSiteUrl}/pt/nao-existe`,
        },
      });
    } finally {
      screen.cleanup();
    }
  },
});
