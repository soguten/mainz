/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { createPageLoadContext, entries, load } from "../index.ts";

Deno.test("components/page helpers: entries.from should wrap mapped params into entry definitions", () => {
    const resolveEntries = entries.from(
        [{ slug: "intro" }, { slug: "routing" }] as const,
        (item) => ({ slug: item.slug }),
    );

    assertEquals(resolveEntries({ locale: "en" }), [
        { params: { slug: "intro" } },
        { params: { slug: "routing" } },
    ]);
});

Deno.test("components/page helpers: entries.fromAsync should support async item loading and explicit entries", async () => {
    const resolveEntries = entries.fromAsync(
        async (context) => [{ slug: `${context.locale}-intro` }],
        (item) => ({
            params: {
                slug: item.slug,
            },
        }),
    );

    assertEquals(await resolveEntries({ locale: "en" }), [
        { params: { slug: "en-intro" } },
    ]);
});

Deno.test("components/page helpers: load.byParam should resolve a single route param", async () => {
    const context = createPageLoadContext({
        params: { slug: "intro" },
        locale: "en",
        url: new URL("https://example.com/docs/intro"),
        renderMode: "ssg",
        navigationMode: "spa",
    });

    const resolveLoad = load.byParam("slug", async (slug, currentContext) => {
        return `${slug}:${currentContext.locale}`;
    });

    assertEquals(await resolveLoad(context), "intro:en");
});

Deno.test("components/page helpers: load.byParams should resolve a param subset object", async () => {
    const context = createPageLoadContext({
        params: { locale: "pt-br", slug: "intro" },
        locale: "pt-BR",
        url: new URL("https://example.com/pt-br/docs/intro"),
        renderMode: "csr",
        navigationMode: "enhanced-mpa",
    });

    const resolveLoad = load.byParams(["locale", "slug"] as const, async (params, currentContext) => {
        return `${params.locale}:${params.slug}:${currentContext.navigationMode}`;
    });

    assertEquals(await resolveLoad(context), "pt-br:intro:enhanced-mpa");
});
