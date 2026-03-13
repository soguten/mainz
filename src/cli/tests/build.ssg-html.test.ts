/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { injectAppHtml, resolveLocaleRedirectPath, rewriteAssetPaths, setHtmlLang } from "../build.ts";

Deno.test("build html helpers: rewrites nested asset paths for SSG routes", () => {
    const input = '<script type="module" src="./assets/index.js"></script>';
    const output = rewriteAssetPaths(input, "..");

    assertStringIncludes(output, 'src="../assets/index.js"');
});

Deno.test("build html helpers: keeps asset paths for root route", () => {
    const input = '<script type="module" src="./assets/index.js"></script>';
    const output = rewriteAssetPaths(input, ".");

    assertEquals(output, input);
});

Deno.test("build html helpers: injects app html in #app", () => {
    const input = '<main id="app"></main>';
    const output = injectAppHtml(input, "<x-page></x-page>");

    assertEquals(output, '<main id="app"><x-page></x-page></main>');
});

Deno.test("build html helpers: sets lang for rendered locale", () => {
    const input = '<html lang="en"><body></body></html>';
    const output = setHtmlLang(input, "pt");

    assertStringIncludes(output, '<html lang="pt">');
});

Deno.test("build html helpers: locale redirect should use navigator preferred locale when supported", () => {
    const output = resolveLocaleRedirectPath({
        supportedLocales: ["en", "pt"],
        defaultLocale: "en",
        preferredLocales: ["pt-BR", "en-US"],
    });

    assertEquals(output, "/pt/");
});

Deno.test("build html helpers: locale redirect should fallback to default locale when navigator locale is unsupported", () => {
    const output = resolveLocaleRedirectPath({
        supportedLocales: ["pt", "fr"],
        defaultLocale: "fr",
        preferredLocales: ["de-DE"],
    });

    assertEquals(output, "/fr/");
});

Deno.test("build html helpers: locale redirect should fallback to english when default is unavailable", () => {
    const output = resolveLocaleRedirectPath({
        supportedLocales: ["en", "pt"],
        defaultLocale: "it",
        preferredLocales: ["de-DE"],
    });

    assertEquals(output, "/en/");
});
