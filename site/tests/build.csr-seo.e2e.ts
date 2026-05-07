/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { buildTargetWithEngine } from "../../tests/helpers/build.ts";
import { cliTestsRepoRoot as repoRoot } from "../../tests/helpers/types.ts";

Deno.test("site/csr seo: siteUrl from profile config should emit absolute locale seo links for document routes", async () => {
  await buildTargetWithEngine({
    targetName: "site",
    mode: "csr",
    profile: "gh-pages",
  });

  await assertLocalizedSeoOutput({
    outputDir: resolve(repoRoot, "dist/site/csr"),
    expectedBaseUrl: "https://mainz.dev",
  });
});

async function assertLocalizedSeoOutput(args: {
  outputDir: string;
  expectedBaseUrl: "" | "https://fixtures.mainz.dev" | "https://mainz.dev";
}): Promise<void> {
  const enHtml = await Deno.readTextFile(`${args.outputDir}/en/index.html`);
  const ptHtml = await Deno.readTextFile(`${args.outputDir}/pt/index.html`);
  const rootHtml = await Deno.readTextFile(`${args.outputDir}/index.html`);
  const enHref = `${args.expectedBaseUrl}/en/`;
  const ptHref = `${args.expectedBaseUrl}/pt/`;

  assertEquals(extractCanonicalHrefs(enHtml), [enHref]);
  assertEquals(extractAlternateLinks(enHtml), [
    { href: enHref, hreflang: "en" },
    { href: ptHref, hreflang: "pt" },
    { href: enHref, hreflang: "x-default" },
  ]);

  assertEquals(extractCanonicalHrefs(ptHtml), [ptHref]);
  assertEquals(extractAlternateLinks(ptHtml), [
    { href: enHref, hreflang: "en" },
    { href: ptHref, hreflang: "pt" },
    { href: enHref, hreflang: "x-default" },
  ]);

  assertEquals(extractCanonicalHrefs(rootHtml), [enHref]);
  assertStringIncludes(rootHtml, 'http-equiv="refresh" content="0; url=/en/"');
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
