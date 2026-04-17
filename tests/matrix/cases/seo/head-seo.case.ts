/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { matrixTest } from "../../harness.ts";

export const headSeoCase = matrixTest({
    name: "csr document routes emit localized SEO links without siteUrl",
    fixture: "HeadSeoApp",
    exercise: [
        { render: "csr", navigation: "mpa" },
    ],
    run: async ({ artifact }) => {
        await assertLocalizedSeoOutput({
            outputDir: artifact.context.outputDir,
            expectedBaseUrl: "",
        });
    },
});

async function assertLocalizedSeoOutput(args: {
    outputDir: string;
    expectedBaseUrl: "" | "https://fixtures.mainz.dev" | "https://mainz.dev";
}): Promise<void> {
    const enHtml = await Deno.readTextFile(`${args.outputDir}/index.html`);
    const ptHtml = await Deno.readTextFile(`${args.outputDir}/pt/index.html`);
    const enHref = `${args.expectedBaseUrl}/`;
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
}

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
