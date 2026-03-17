/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { cliTestsRepoRoot as repoRoot, runMainzCliCommand } from "./test-helpers.ts";

Deno.test("e2e/csr seo: mpa build should emit relative locale seo links", async () => {
    await runMainzCliCommand(
        ["build", "--target", "site", "--mode", "csr", "--navigation", "mpa"],
        "Failed to build site for CSR SEO e2e test.",
    );

    const enHtml = await Deno.readTextFile(resolve(repoRoot, "dist/site/csr/en/index.html"));
    const ptHtml = await Deno.readTextFile(resolve(repoRoot, "dist/site/csr/pt/index.html"));
    const rootHtml = await Deno.readTextFile(resolve(repoRoot, "dist/site/csr/index.html"));

    assertEquals(extractCanonicalHrefs(enHtml), ["/en/"]);
    assertEquals(extractAlternateLinks(enHtml), [
        { href: "/en/", hreflang: "en" },
        { href: "/pt/", hreflang: "pt" },
        { href: "/en/", hreflang: "x-default" },
    ]);

    assertEquals(extractCanonicalHrefs(ptHtml), ["/pt/"]);
    assertEquals(extractAlternateLinks(ptHtml), [
        { href: "/en/", hreflang: "en" },
        { href: "/pt/", hreflang: "pt" },
        { href: "/en/", hreflang: "x-default" },
    ]);

    assertEquals(extractCanonicalHrefs(rootHtml), ["/en/"]);
    assertStringIncludes(rootHtml, 'http-equiv="refresh" content="0; url=/en/"');
});

Deno.test("e2e/csr seo: gh-pages profile should emit absolute locale seo links for document routes", async () => {
    await runMainzCliCommand(
        ["build", "--target", "site", "--mode", "csr", "--profile", "gh-pages"],
        "Failed to build site for CSR SEO e2e test.",
    );

    const enHtml = await Deno.readTextFile(resolve(repoRoot, "dist/site/csr/en/index.html"));
    const ptHtml = await Deno.readTextFile(resolve(repoRoot, "dist/site/csr/pt/index.html"));
    const rootHtml = await Deno.readTextFile(resolve(repoRoot, "dist/site/csr/index.html"));

    assertEquals(extractCanonicalHrefs(enHtml), ["https://mainz.dev/en/"]);
    assertEquals(extractAlternateLinks(enHtml), [
        { href: "https://mainz.dev/en/", hreflang: "en" },
        { href: "https://mainz.dev/pt/", hreflang: "pt" },
        { href: "https://mainz.dev/en/", hreflang: "x-default" },
    ]);

    assertEquals(extractCanonicalHrefs(ptHtml), ["https://mainz.dev/pt/"]);
    assertEquals(extractAlternateLinks(ptHtml), [
        { href: "https://mainz.dev/en/", hreflang: "en" },
        { href: "https://mainz.dev/pt/", hreflang: "pt" },
        { href: "https://mainz.dev/en/", hreflang: "x-default" },
    ]);

    assertEquals(extractCanonicalHrefs(rootHtml), ["https://mainz.dev/en/"]);
    assertStringIncludes(rootHtml, 'http-equiv="refresh" content="0; url=/en/"');
});

function extractCanonicalHrefs(html: string): string[] {
    return Array.from(
        html.matchAll(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi),
        (match) => match[1],
    );
}

function extractAlternateLinks(html: string): Array<{ href: string; hreflang: string }> {
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
