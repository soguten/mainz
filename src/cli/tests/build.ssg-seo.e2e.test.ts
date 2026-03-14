/// <reference lib="deno.ns" />

import { assertEquals, assertMatch, assertStringIncludes } from "@std/assert";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const decoder = new TextDecoder();
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

Deno.test("e2e/ssg seo: production profile should fallback to relative locale SEO links when siteUrl is omitted", async () => {
    await buildSiteSsg();

    const enHtml = await Deno.readTextFile(resolve(repoRoot, "dist/site/ssg/en/index.html"));
    const ptHtml = await Deno.readTextFile(resolve(repoRoot, "dist/site/ssg/pt/index.html"));
    const rootHtml = await Deno.readTextFile(resolve(repoRoot, "dist/site/ssg/index.html"));

    assertEquals(extractCanonicalHrefs(enHtml), ["/en"]);
    assertEquals(extractAlternateLinks(enHtml), [
        { href: "/en", hreflang: "en" },
        { href: "/pt", hreflang: "pt" },
        { href: "/en", hreflang: "x-default" },
    ]);

    assertEquals(extractCanonicalHrefs(ptHtml), ["/pt"]);
    assertEquals(extractAlternateLinks(ptHtml), [
        { href: "/en", hreflang: "en" },
        { href: "/pt", hreflang: "pt" },
        { href: "/en", hreflang: "x-default" },
    ]);

    assertEquals(extractCanonicalHrefs(rootHtml), ["/en/"]);
    assertStringIncludes(rootHtml, 'http-equiv="refresh" content="0; url=/en/"');
    assertMatch(rootHtml, /location\.replace\(targetPath\)/);
});

Deno.test("e2e/ssg seo: gh-pages profile should emit absolute locale SEO links when siteUrl is configured", async () => {
    await buildSiteGhPages();

    const enHtml = await Deno.readTextFile(resolve(repoRoot, "dist/site/ssg/en/index.html"));
    const ptHtml = await Deno.readTextFile(resolve(repoRoot, "dist/site/ssg/pt/index.html"));
    const rootHtml = await Deno.readTextFile(resolve(repoRoot, "dist/site/ssg/index.html"));

    assertEquals(extractCanonicalHrefs(enHtml), ["https://mainz.soguten.com/en"]);
    assertEquals(extractAlternateLinks(enHtml), [
        { href: "https://mainz.soguten.com/en", hreflang: "en" },
        { href: "https://mainz.soguten.com/pt", hreflang: "pt" },
        { href: "https://mainz.soguten.com/en", hreflang: "x-default" },
    ]);

    assertEquals(extractCanonicalHrefs(ptHtml), ["https://mainz.soguten.com/pt"]);
    assertEquals(extractAlternateLinks(ptHtml), [
        { href: "https://mainz.soguten.com/en", hreflang: "en" },
        { href: "https://mainz.soguten.com/pt", hreflang: "pt" },
        { href: "https://mainz.soguten.com/en", hreflang: "x-default" },
    ]);

    assertEquals(extractCanonicalHrefs(rootHtml), ["https://mainz.soguten.com/en/"]);
    assertStringIncludes(rootHtml, 'http-equiv="refresh" content="0; url=/en/"');
});

async function buildSiteSsg(): Promise<void> {
    const command = new Deno.Command("deno", {
        args: [
            "run",
            "-A",
            "./src/cli/mainz.ts",
            "build",
            "--target",
            "site",
            "--mode",
            "ssg",
        ],
        cwd: repoRoot,
        stdout: "piped",
        stderr: "piped",
    });

    const result = await command.output();
    if (result.success) {
        return;
    }

    const stdout = decoder.decode(result.stdout);
    const stderr = decoder.decode(result.stderr);
    throw new Error(`Failed to build site for SEO e2e test.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
}

async function buildSiteGhPages(): Promise<void> {
    const command = new Deno.Command("deno", {
        args: [
            "run",
            "-A",
            "./src/cli/mainz.ts",
            "build",
            "--target",
            "site",
            "--profile",
            "gh-pages",
        ],
        cwd: repoRoot,
        stdout: "piped",
        stderr: "piped",
    });

    const result = await command.output();
    if (result.success) {
        return;
    }

    const stdout = decoder.decode(result.stdout);
    const stderr = decoder.decode(result.stderr);
    throw new Error(`Failed to build site for SEO e2e test.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
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
