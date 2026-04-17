/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
    applyRouteHead,
    emitCsrSpaAppShellMetadata,
    formatSsgPrerenderError,
    formatSsgPrerenderWarning,
    injectAppHtml,
    injectRouteSnapshot,
    resolveTargetI18nConfig,
    rewriteAssetPaths,
    setHtmlLang,
} from "../artifacts.ts";
import { buildRouteHead, resolveLocaleRedirectPath } from "../../routing/index.ts";
import { ResourceAccessError } from "../../resources/index.ts";

Deno.test("build/artifacts: rewrites nested asset paths for SSG routes", () => {
    const input = '<script type="module" src="./assets/index.js"></script>';
    const output = rewriteAssetPaths(input, "..");

    assertStringIncludes(output, 'src="../assets/index.js"');
});

Deno.test("build/artifacts: keeps asset paths for root route", () => {
    const input = '<script type="module" src="./assets/index.js"></script>';
    const output = rewriteAssetPaths(input, ".");

    assertEquals(output, input);
});

Deno.test("build/artifacts: injects app html in #app", () => {
    const input = '<main id="app"></main>';
    const output = injectAppHtml(input, "<x-page></x-page>");

    assertEquals(output, '<main id="app"><x-page></x-page></main>');
});

Deno.test("build/artifacts: injects route snapshot into html", () => {
    const input = '<html><body><main id="app"></main></body></html>';
    const output = injectRouteSnapshot(input, {
        pageTagName: "x-page",
        path: "/docs/:slug",
        matchedPath: "/docs/intro",
        params: { slug: "intro" },
        locale: "en",
        data: { title: "Intro" },
        head: { title: "Intro | Docs" },
    });

    assertStringIncludes(output, 'id="mainz-route-snapshot"');
    assertStringIncludes(output, '"matchedPath":"/docs/intro"');
    assertStringIncludes(output, '"head":{"title":"Intro | Docs"}');
});

Deno.test("build/artifacts: formats route-aware prerender errors", () => {
    const message = formatSsgPrerenderError({
        routePath: "/docs/:slug",
        renderPath: "/docs/intro",
        locale: "en",
        error: new Error('Resource "current-user" is private and cannot be read during SSG.'),
    });

    assertEquals(
        message,
        'Failed to prerender SSG route "/docs/:slug" for output "/docs/intro" (locale "en"): Resource "current-user" is private and cannot be read during SSG.',
    );
});

Deno.test("build/artifacts: formats route-aware prerender warnings", () => {
    const message = formatSsgPrerenderWarning({
        routePath: "/docs/:slug",
        renderPath: "/docs/intro",
        locale: "en",
        warning:
            'Component "RelatedDocs" uses @RenderStrategy("defer") without a placeholder(). Add placeholder() to make the component\'s async placeholder explicit.',
    });

    assertEquals(
        message,
        'SSG prerender warning for route "/docs/:slug" and output "/docs/intro" (locale "en"): Component "RelatedDocs" uses @RenderStrategy("defer") without a placeholder(). Add placeholder() to make the component\'s async placeholder explicit.',
    );
});

Deno.test("build/artifacts: formats ownership-based prerender warnings", () => {
    const message = formatSsgPrerenderWarning({
        routePath: "/",
        renderPath: "/",
        locale: "en",
        warning:
            'Component "DeferredWithoutFallback" uses @RenderStrategy("defer") without a placeholder(). Add placeholder() to make the component\'s async placeholder explicit.',
    });

    assertEquals(
        message,
        'SSG prerender warning for route "/" and output "/" (locale "en"): Component "DeferredWithoutFallback" uses @RenderStrategy("defer") without a placeholder(). Add placeholder() to make the component\'s async placeholder explicit.',
    );
});

Deno.test("build/artifacts: formats private resource access errors with SSG guidance", () => {
    const message = formatSsgPrerenderError({
        routePath: "/docs/:slug",
        renderPath: "/docs/intro",
        locale: "en",
        error: new ResourceAccessError({
            code: "private-in-ssg",
            resourceName: "current-user",
            message: 'Resource "current-user" is private and cannot be read during SSG.',
        }),
    });

    assertEquals(
        message,
        'Failed to prerender SSG route "/docs/:slug" for output "/docs/intro" (locale "en"): Resource "current-user" is private and cannot be read during SSG. Move this resource behind a defer strategy or an SSG-safe render policy.',
    );
});

Deno.test("build/artifacts: formats client-only resource access errors with SSG guidance", () => {
    const message = formatSsgPrerenderError({
        routePath: "/docs/:slug",
        renderPath: "/docs/intro",
        locale: "en",
        error: new ResourceAccessError({
            code: "client-in-ssg",
            resourceName: "current-user",
            message: 'Resource "current-user" is client-only and cannot execute during SSG.',
        }),
    });

    assertEquals(
        message,
        'Failed to prerender SSG route "/docs/:slug" for output "/docs/intro" (locale "en"): Resource "current-user" is client-only and cannot execute during SSG. Read it on the client or replace it with a build-compatible resource.',
    );
});

Deno.test("build/artifacts: formats forbidden-in-ssg strategy errors with SSG guidance", () => {
    const message = formatSsgPrerenderError({
        routePath: "/docs/:slug",
        renderPath: "/docs/intro",
        locale: "en",
        error: new ResourceAccessError({
            code: "forbidden-in-ssg",
            resourceName: "live-preview",
            message:
                'Resource "live-preview" is being read by a component marked forbidden-in-ssg and cannot be used during SSG.',
        }),
    });

    assertEquals(
        message,
        'Failed to prerender SSG route "/docs/:slug" for output "/docs/intro" (locale "en"): Resource "live-preview" is being read by a component marked forbidden-in-ssg and cannot be used during SSG. Remove it from the SSG path or render this route in a non-SSG mode.',
    );
});

Deno.test("build/artifacts: formats forbidden-in-ssg render policy errors with SSG guidance", () => {
    const message = formatSsgPrerenderError({
        routePath: "/docs/:slug",
        renderPath: "/docs/intro",
        locale: "en",
        error: new Error(
            'Component "LivePreview" uses @RenderPolicy("forbidden-in-ssg") and cannot be rendered during SSG.',
        ),
    });

    assertEquals(
        message,
        'Failed to prerender SSG route "/docs/:slug" for output "/docs/intro" (locale "en"): Component "LivePreview" uses @RenderPolicy("forbidden-in-ssg") and cannot be rendered during SSG. Remove it from the SSG path or render this route in a non-SSG mode.',
    );
});

Deno.test("build/artifacts: rejects non-plain route snapshot data", () => {
    assertThrows(
        () => {
            injectRouteSnapshot("<html><body></body></html>", {
                pageTagName: "x-page",
                path: "/docs/:slug",
                matchedPath: "/docs/intro",
                params: { slug: "intro" },
                locale: "en",
                data: {
                    generatedAt: new Date("2026-03-19T12:00:00.000Z"),
                },
            });
        },
        Error,
        "$.data.generatedAt must contain plain objects only.",
    );
});

Deno.test("build/artifacts: omits undefined object values inside route snapshot data", () => {
    const output = injectRouteSnapshot("<html><body></body></html>", {
        pageTagName: "x-page",
        path: "/docs/:slug",
        matchedPath: "/docs/intro",
        params: { slug: "intro" },
        locale: "en",
        data: {
            title: undefined,
            slug: "intro",
        },
    });

    assertStringIncludes(output, '"slug":"intro"');
    assertEquals(output.includes('"title"'), false);
});

Deno.test("build/artifacts: omits nested undefined object values inside route snapshot data", () => {
    const output = injectRouteSnapshot("<html><body></body></html>", {
        pageTagName: "x-page",
        path: "/docs/:slug",
        matchedPath: "/docs/intro",
        params: { slug: "intro" },
        locale: "en",
        data: {
            article: {
                slug: "intro",
                description: undefined,
            },
        },
    });

    assertStringIncludes(output, '"article":{"slug":"intro"}');
    assertEquals(output.includes('"description"'), false);
});

Deno.test("build/artifacts: normalizes undefined array entries inside route snapshot data", () => {
    const output = injectRouteSnapshot("<html><body></body></html>", {
        pageTagName: "x-page",
        path: "/docs/:slug",
        matchedPath: "/docs/intro",
        params: { slug: "intro" },
        locale: "en",
        data: {
            items: ["intro", undefined, "routing"],
        },
    });

    assertStringIncludes(output, '"items":["intro",null,"routing"]');
});

Deno.test("build/artifacts: rejects non-finite numbers inside route snapshot data", () => {
    assertThrows(
        () => {
            injectRouteSnapshot("<html><body></body></html>", {
                pageTagName: "x-page",
                path: "/docs/:slug",
                matchedPath: "/docs/intro",
                params: { slug: "intro" },
                locale: "en",
                data: {
                    score: Number.NaN,
                },
            });
        },
        Error,
        "$.data.score must not contain non-finite numbers.",
    );
});

Deno.test("build/artifacts: rejects maps inside route snapshot data", () => {
    assertThrows(
        () => {
            injectRouteSnapshot("<html><body></body></html>", {
                pageTagName: "x-page",
                path: "/docs/:slug",
                matchedPath: "/docs/intro",
                params: { slug: "intro" },
                locale: "en",
                data: {
                    entries: new Map([["slug", "intro"]]),
                },
            });
        },
        Error,
        "$.data.entries must contain plain objects only.",
    );
});

Deno.test("build/artifacts: rejects functions inside route snapshot data", () => {
    assertThrows(
        () => {
            injectRouteSnapshot("<html><body></body></html>", {
                pageTagName: "x-page",
                path: "/docs/:slug",
                matchedPath: "/docs/intro",
                params: { slug: "intro" },
                locale: "en",
                data: {
                    resolve() {
                        return "intro";
                    },
                },
            });
        },
        Error,
        "$.data.resolve must contain JSON-serializable plain data only.",
    );
});

Deno.test("build/artifacts: sets lang for rendered locale", () => {
    const input = '<html lang="en"><body></body></html>';
    const output = setHtmlLang(input, "pt");

    assertStringIncludes(output, '<html lang="pt">');
});

Deno.test("build/artifacts: sets document language on CSR SPA app shell", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
        await Deno.writeTextFile(
            `${tempDir}/index.html`,
            "<html><head></head><body></body></html>",
        );

        await emitCsrSpaAppShellMetadata({
            cwd: tempDir,
            modeOutDir: ".",
            documentLanguage: "pt-BR",
        });

        const output = await Deno.readTextFile(`${tempDir}/index.html`);
        assertStringIncludes(output, '<html lang="pt-BR">');
    } finally {
        await Deno.remove(tempDir, { recursive: true });
    }
});

Deno.test("build/artifacts: locale redirect should use navigator preferred locale when supported", () => {
    const output = resolveLocaleRedirectPath({
        supportedLocales: ["en", "pt"],
        defaultLocale: "en",
        preferredLocales: ["pt-BR", "en-US"],
    });

    assertEquals(output, "/pt/");
});

Deno.test("build/artifacts: locale redirect should fallback to default locale when navigator locale is unsupported", () => {
    const output = resolveLocaleRedirectPath({
        supportedLocales: ["pt", "fr"],
        defaultLocale: "fr",
        preferredLocales: ["de-DE"],
    });

    assertEquals(output, "/fr/");
});

Deno.test("build/artifacts: locale redirect should fallback to english when default is unavailable", () => {
    const output = resolveLocaleRedirectPath({
        supportedLocales: ["en", "pt"],
        defaultLocale: "it",
        preferredLocales: ["de-DE"],
    });

    assertEquals(output, "/en/");
});

Deno.test("build/artifacts: applies route head metadata to prerendered html", () => {
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
    assertStringIncludes(
        output,
        '<meta name="description" content="Docs page" data-mainz-head-managed="true" />',
    );
    assertStringIncludes(
        output,
        '<link rel="canonical" href="/docs" data-mainz-head-managed="true" />',
    );
});

Deno.test("build/artifacts: generates canonical and alternate locale links for routes", () => {
    const head = buildRouteHead(
        {
            path: "/docs",
            locales: ["en", "pt-BR"],
            head: {
                title: "Docs",
            },
            locale: "pt-BR",
            localePrefix: "except-default",
            defaultLocale: "en",
        },
    );

    assertEquals(head?.links, [
        { rel: "canonical", href: "/pt-br/docs" },
        { rel: "alternate", href: "/docs", hreflang: "en" },
        { rel: "alternate", href: "/pt-br/docs", hreflang: "pt-BR" },
        { rel: "alternate", href: "/docs", hreflang: "x-default" },
    ]);
});

Deno.test("build/artifacts: should keep a single canonical when manual head also provides one", () => {
    const head = buildRouteHead(
        {
            path: "/docs",
            locales: ["en", "pt"],
            head: {
                links: [
                    { rel: "canonical", href: "/" },
                ],
            },
            locale: "en",
            localePrefix: "except-default",
            defaultLocale: "en",
        },
    );

    assertEquals(head?.links, [
        { rel: "canonical", href: "/docs" },
        { rel: "alternate", href: "/docs", hreflang: "en" },
        { rel: "alternate", href: "/pt/docs", hreflang: "pt" },
        { rel: "alternate", href: "/docs", hreflang: "x-default" },
    ]);
});

Deno.test("build/artifacts: should keep generated alternates canonical per hreflang", () => {
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
            locale: "pt",
            localePrefix: "except-default",
            defaultLocale: "en",
        },
    );

    assertEquals(head?.links, [
        { rel: "canonical", href: "/pt/docs" },
        { rel: "alternate", href: "/docs", hreflang: "en" },
        { rel: "alternate", href: "/pt/docs", hreflang: "pt" },
        { rel: "alternate", href: "/docs", hreflang: "x-default" },
        { rel: "alternate", href: "/feed.xml" },
    ]);
});

Deno.test("build/artifacts: should fallback x-default to first route locale when default locale is unavailable", () => {
    const head = buildRouteHead(
        {
            path: "/docs",
            locales: ["pt", "ja"],
            locale: "pt",
            localePrefix: "except-default",
            defaultLocale: "en",
        },
    );

    assertEquals(head?.links, [
        { rel: "canonical", href: "/pt/docs" },
        { rel: "alternate", href: "/pt/docs", hreflang: "pt" },
        { rel: "alternate", href: "/ja/docs", hreflang: "ja" },
        { rel: "alternate", href: "/pt/docs", hreflang: "x-default" },
    ]);
});

Deno.test("build/artifacts: should emit absolute locale SEO links when siteUrl is configured", () => {
    const head = buildRouteHead(
        {
            path: "/docs",
            locales: ["en", "pt"],
            locale: "pt",
            localePrefix: "except-default",
            defaultLocale: "en",
            siteUrl: "https://mainz.dev",
        },
    );

    assertEquals(head?.links, [
        { rel: "canonical", href: "https://mainz.dev/pt/docs" },
        { rel: "alternate", href: "https://mainz.dev/docs", hreflang: "en" },
        { rel: "alternate", href: "https://mainz.dev/pt/docs", hreflang: "pt" },
        { rel: "alternate", href: "https://mainz.dev/docs", hreflang: "x-default" },
    ]);
});

Deno.test("build/artifacts: should resolve build i18n from app-owned i18n", () => {
    const targetI18n = resolveTargetI18nConfig({
        i18n: {
            locales: ["en", "pt-BR"],
            defaultLocale: "en",
            localePrefix: "except-default",
        },
    });

    assertEquals(targetI18n, {
        defaultLocale: "en",
        localePrefix: "except-default",
        fallbackLocale: "en",
    });
});

Deno.test("build/artifacts: should resolve build language from documentLanguage when app i18n is absent", () => {
    const targetI18n = resolveTargetI18nConfig({
        documentLanguage: "pt-BR",
    });

    assertEquals(targetI18n, {
        defaultLocale: "pt-BR",
        localePrefix: "except-default",
        fallbackLocale: "pt-BR",
    });
});
