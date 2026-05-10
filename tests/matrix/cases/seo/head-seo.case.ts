/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { scenarioTest } from "../../scenario-harness.ts";

export const headSeoCase = scenarioTest({
  name: "csr document routes emit localized SEO links without siteUrl",
  run: async ({ app }) => {
    await assertLocalizedSeoOutput({
      enHtml: await app.document("index.html").html(),
      ptHtml: await app.document("pt/index.html").html(),
      expectedBaseUrl: "",
    });
  },
});

async function assertLocalizedSeoOutput(args: {
  enHtml: string;
  ptHtml: string;
  expectedBaseUrl: "" | "https://fixtures.mainz.dev" | "https://mainz.dev";
}): Promise<void> {
  const enHref = `${args.expectedBaseUrl}/`;
  const ptHref = `${args.expectedBaseUrl}/pt/`;

  assertEquals(extractCanonicalHrefs(args.enHtml), [enHref]);
  assertEquals(extractAlternateLinks(args.enHtml), [
    { href: enHref, hreflang: "en" },
    { href: ptHref, hreflang: "pt" },
    { href: enHref, hreflang: "x-default" },
  ]);

  assertEquals(extractCanonicalHrefs(args.ptHtml), [ptHref]);
  assertEquals(extractAlternateLinks(args.ptHtml), [
    { href: enHref, hreflang: "en" },
    { href: ptHref, hreflang: "pt" },
    { href: enHref, hreflang: "x-default" },
  ]);
}

function extractCanonicalHrefs(html: string): string[] {
  return Array.from(
    html.matchAll(
      /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi,
    ),
    (match) => match[1],
  );
}

function extractAlternateLinks(
  html: string,
): Array<{ href: string; hreflang: string }> {
  return Array.from(
    html.matchAll(
      /<link\s+[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*hreflang=["']([^"']+)["'][^>]*\/?>/gi,
    ),
    (match) => ({
      href: match[1],
      hreflang: match[2],
    }),
  );
}
