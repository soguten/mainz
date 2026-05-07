/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { assertSeoState } from "../../../helpers/document.ts";
import { matrixTest } from "../../harness.ts";

export const headCase = matrixTest({
  name: "head preserves canonical and alternate links",
  fixture: "RoutedApp",
  exercise: {
    render: ["csr", "ssg"],
    navigation: ["spa", "mpa", "enhanced-mpa"],
  },
  run: async ({ artifact, fixture }) => {
    const screen = await fixture.render(artifact, "/pt/");

    try {
      assertEquals(
        document.head.querySelectorAll('link[rel="canonical"]').length,
        1,
      );
      assertEquals(
        document.head.querySelectorAll('link[rel="alternate"][hreflang]')
          .length,
        3,
      );
      assertEquals(
        document.head.querySelectorAll(
          'link[rel="canonical"][data-mainz-head-managed="true"]',
        ).length,
        1,
      );
      assertEquals(
        document.head.querySelectorAll(
          'link[rel="alternate"][hreflang][data-mainz-head-managed="true"]',
        ).length,
        3,
      );
      assertSeoState({
        canonical: "/pt/",
        alternates: {
          en: "/",
          pt: "/pt/",
          "x-default": "/",
        },
      });
    } finally {
      screen.cleanup();
    }
  },
});
