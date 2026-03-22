/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "../../../../src/testing/mainz-testing.ts";

await setupMainzDom();

const { DocsArticleContent } = await import(
    "../DocsArticleContent.tsx"
) as typeof import("../DocsArticleContent.tsx");

Deno.test("DocsArticleContent resolves blocking article content from Component.load()", () => {
    const view = renderMainzComponent(DocsArticleContent, {
        props: { slug: "quickstart" },
    });

    try {
        assertEquals(view.getBySelector(".docs-title").textContent, "Quickstart");
        assertEquals(view.getBySelector(".docs-kicker").textContent, "Getting Started");
    } finally {
        view.cleanup();
    }
});

Deno.test("DocsArticleContent keeps the docs shell for unknown slugs", () => {
    const view = renderMainzComponent(DocsArticleContent, {
        props: { slug: "missing-doc" },
    });

    try {
        assertEquals(view.getBySelector(".docs-title").textContent, "Document not found");
        assertEquals(view.getBySelector(".docs-kicker").textContent, "Collection miss");
    } finally {
        view.cleanup();
    }
});
