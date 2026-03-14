/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import {
    applyRouteHead,
    buildRouteHead,
    injectAppHtml,
    resolveLocaleRedirectPath,
    rewriteAssetPaths,
    setHtmlLang,
} from "../build.ts";

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

Deno.test("build html helpers: applies route head metadata to prerendered html", () => {
    const input = "<html><head><title>Old</title></head><body></body></html>";
    const output = applyRouteHead(input, {
        head: {
            title: "Docs",
            meta: [
                { name: "description", content: "Docs page" },
            ],
            links: [
                { rel: "canonical", href: "/docs" },
            ],
        },
    });

    assertStringIncludes(output, "<title>Docs</title>");
    assertStringIncludes(output, '<meta name="description" content="Docs page" />');
    assertStringIncludes(output, '<link rel="canonical" href="/docs" />');
});

Deno.test("build html helpers: generates canonical and alternate locale links for routes", () => {
    const head = buildRouteHead(
        {
            path: "/docs",
            locales: ["en", "pt-BR"],
            head: {
                title: "Docs",
            },
        },
        {
            routes: [],
        },
        "pt-BR",
        "auto",
        "en",
        undefined,
    );

    assertEquals(head?.links, [
        { rel: "canonical", href: "/pt-br/docs" },
        { rel: "alternate", href: "/en/docs", hreflang: "en" },
        { rel: "alternate", href: "/pt-br/docs", hreflang: "pt-BR" },
        { rel: "alternate", href: "/en/docs", hreflang: "x-default" },
    ]);
});

Deno.test("build html helpers: should keep a single canonical when manual head also provides one", () => {
    const head = buildRouteHead(
        {
            path: "/docs",
            locales: ["en", "pt"],
            head: {
                links: [
                    { rel: "canonical", href: "/" },
                ],
            },
        },
        {
            routes: [],
        },
        "en",
        "auto",
        "en",
        undefined,
    );

    assertEquals(head?.links, [
        { rel: "canonical", href: "/en/docs" },
        { rel: "alternate", href: "/en/docs", hreflang: "en" },
        { rel: "alternate", href: "/pt/docs", hreflang: "pt" },
        { rel: "alternate", href: "/en/docs", hreflang: "x-default" },
    ]);
});

Deno.test("build html helpers: should keep generated alternates canonical per hreflang", () => {
    const head = buildRouteHead(
        {
            path: "/docs",
            locales: ["en", "pt"],
            head: {
                links: [
                    { rel: "alternate", href: "/custom-en", hreflang: "en" },
                    { rel: "alternate", href: "/custom-pt", hreflang: "pt" },
                    { rel: "alternate", href: "/feed.xml" },
                ],
            },
        },
        {
            routes: [],
        },
        "pt",
        "auto",
        "en",
        undefined,
    );

    assertEquals(head?.links, [
        { rel: "canonical", href: "/pt/docs" },
        { rel: "alternate", href: "/en/docs", hreflang: "en" },
        { rel: "alternate", href: "/pt/docs", hreflang: "pt" },
        { rel: "alternate", href: "/en/docs", hreflang: "x-default" },
        { rel: "alternate", href: "/feed.xml" },
    ]);
});

Deno.test("build html helpers: should fallback x-default to first route locale when default locale is unavailable", () => {
    const head = buildRouteHead(
        {
            path: "/docs",
            locales: ["pt", "ja"],
        },
        {
            routes: [],
        },
        "pt",
        "auto",
        "en",
        undefined,
    );

    assertEquals(head?.links, [
        { rel: "canonical", href: "/pt/docs" },
        { rel: "alternate", href: "/pt/docs", hreflang: "pt" },
        { rel: "alternate", href: "/ja/docs", hreflang: "ja" },
        { rel: "alternate", href: "/pt/docs", hreflang: "x-default" },
    ]);
});

Deno.test("build html helpers: should emit absolute locale SEO links when siteUrl is configured", () => {
    const head = buildRouteHead(
        {
            path: "/docs",
            locales: ["en", "pt"],
        },
        {
            routes: [],
        },
        "pt",
        "auto",
        "en",
        "https://mainz.dev",
    );

    assertEquals(head?.links, [
        { rel: "canonical", href: "https://mainz.dev/pt/docs" },
        { rel: "alternate", href: "https://mainz.dev/en/docs", hreflang: "en" },
        { rel: "alternate", href: "https://mainz.dev/pt/docs", hreflang: "pt" },
        { rel: "alternate", href: "https://mainz.dev/en/docs", hreflang: "x-default" },
    ]);
});
