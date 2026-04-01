/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "../../../../src/testing/mainz-testing.ts";

await setupMainzDom();

const fixtures = await import("./DocsArticleContent.fixture.tsx") as typeof import(
    "./DocsArticleContent.fixture.tsx"
);

Deno.test("DocsArticleContent resolves blocking article content from Component.load()", () => {
    const view = renderMainzComponent(fixtures.DocsArticleContentRouteHost, {
        props: { route: fixtures.createDocsRoute("quickstart") },
    });

    try {
        assertEquals(view.getBySelector(".docs-title").textContent, "Quickstart");
        assertEquals(view.getBySelector(".docs-kicker").textContent, "Getting Started");
    } finally {
        view.cleanup();
    }
});

Deno.test("DocsArticleContent keeps the docs shell for unknown slugs", () => {
    const view = renderMainzComponent(fixtures.DocsArticleContentRouteHost, {
        props: { route: fixtures.createDocsRoute("missing-doc") },
    });

    try {
        assertEquals(view.getBySelector(".docs-title").textContent, "Document not found");
        assertEquals(view.getBySelector(".docs-kicker").textContent, "Collection miss");
    } finally {
        view.cleanup();
    }
});

Deno.test("DocsArticleContent resolves relative markdown links into docs routes", () => {
    const view = renderMainzComponent(fixtures.DocsArticleContentRouteHost, {
        props: { route: fixtures.createDocsRoute("page-model") },
    });

    try {
        const link = view.container.querySelector(
            '.docs-inline-link[href="/render-mode-and-strategy"]',
        );
        assertEquals(link?.textContent, "Render Mode and Render Strategy");
    } finally {
        view.cleanup();
    }
});
