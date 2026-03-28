/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { getDocsNavSections, getDocsPager, resolveDocsMarkdownHref } from "../docs.ts";
import { parseMarkdown } from "../markdown.ts";

Deno.test("docs helpers group navigation into sections and nested groups", () => {
    const sections = getDocsNavSections();

    assertEquals(sections.map((section) => section.title), [
        "Getting Started",
        "Concepts",
        "Advanced",
    ]);
    assertEquals(sections[1].groups?.[0].title, "Core");
    assertEquals(sections[1].groups?.[0].items.map((item) => item.slug), [
        "routing",
        "diagnostics-cli",
        "render-mode-and-strategy",
        "resource-model",
        "public-shell-private-island",
        "route-metadata",
        "data-loading",
        "navigation-runtime",
        "authorization",
        "dependency-injection",
    ]);
    assertEquals(sections[1].groups?.[1].title, "Testing");
    assertEquals(sections[1].groups?.[1].items.map((item) => item.slug), [
        "http-testing",
    ]);
    assertEquals(sections[1].groups?.[2].title, "Components");
    assertEquals(sections[1].groups?.[2].items.map((item) => item.slug), [
        "component-model",
        "functional-components",
        "custom-elements",
        "state-and-events",
        "render-owner",
    ]);
    assertEquals(sections[1].groups?.[3].title, "Pages");
    assertEquals(sections[1].groups?.[3].items.map((item) => item.slug), [
        "page-model",
        "head-and-seo",
        "not-found",
    ]);
});

Deno.test("docs helpers compute previous and next article links", () => {
    assertEquals(getDocsPager("data-loading"), {
        previous: { slug: "route-metadata", title: "Route Metadata" },
        next: { slug: "navigation-runtime", title: "Navigation Runtime" },
    });

    assertEquals(getDocsPager("custom-elements"), {
        previous: { slug: "functional-components", title: "Functional Components" },
        next: { slug: "state-and-events", title: "State and Events" },
    });

    assertEquals(getDocsPager("render-owner"), {
        previous: { slug: "state-and-events", title: "State and Events" },
        next: { slug: "page-model", title: "Page Model" },
    });

    assertEquals(getDocsPager("authorization"), {
        previous: { slug: "navigation-runtime", title: "Navigation Runtime" },
        next: { slug: "dependency-injection", title: "Dependency Injection" },
    });

    assertEquals(getDocsPager("dependency-injection"), {
        previous: { slug: "authorization", title: "Authorization" },
        next: { slug: "http-testing", title: "HTTP Testing" },
    });

    assertEquals(getDocsPager("http-testing"), {
        previous: { slug: "dependency-injection", title: "Dependency Injection" },
        next: { slug: "component-model", title: "Component Model" },
    });

    assertEquals(getDocsPager("page-model"), {
        previous: { slug: "render-owner", title: "Render Owner" },
        next: { slug: "head-and-seo", title: "Head and SEO" },
    });

    assertEquals(getDocsPager(), {
        next: { slug: "quickstart", title: "Quickstart" },
    });
});

Deno.test("docs helpers resolve markdown links into docs routes", () => {
    assertEquals(
        resolveDocsMarkdownHref("data-loading", "./render-mode-and-strategy.md"),
        "/render-mode-and-strategy",
    );
    assertEquals(
        resolveDocsMarkdownHref("page-model", "../core/render-mode-and-strategy.md#blocking"),
        "/render-mode-and-strategy#blocking",
    );
    assertEquals(
        resolveDocsMarkdownHref("data-loading", "https://mainz.dev"),
        "https://mainz.dev",
    );
    assertEquals(resolveDocsMarkdownHref("data-loading", "#intro"), "#intro");
});

Deno.test("markdown parser extracts headings, paragraphs, notes, and code fences", () => {
    const blocks = parseMarkdown(`
## Intro

Hello \`world\`.

> Useful note.

\`\`\`tsx title="demo.tsx"
console.log("hi");
\`\`\`
`);

    assertEquals(blocks[0], {
        type: "heading",
        level: 2,
        text: "Intro",
        id: "intro",
    });
    assertEquals(blocks[1], { type: "paragraph", text: "Hello `world`." });
    assertEquals(blocks[2], { type: "blockquote", text: "Useful note." });
    assertEquals(blocks[3], {
        type: "code",
        language: "tsx",
        label: "demo.tsx",
        content: 'console.log("hi");',
    });
});
