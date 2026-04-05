/// <reference lib="deno.ns" />

import { assertEquals, assertThrows } from "@std/assert";
import {
    buildDocsCatalogFromFiles,
    DocsService,
    parseDocsFrontmatter,
} from "../../services/DocsService.ts";
import { parseMarkdown } from "../markdown.ts";

const docs = new DocsService();

Deno.test("docs frontmatter parser extracts attributes and body", () => {
    const parsed = parseDocsFrontmatter(`---\ntitle: Quickstart\ngroupOrder: 2\n---\n## Intro\n`);

    assertEquals(parsed.attributes, {
        title: "Quickstart",
        groupOrder: 2,
    });
    assertEquals(parsed.body, "## Intro\n");
});

Deno.test("docs catalog builder ignores markdown files without docs frontmatter", () => {
    const catalog = buildDocsCatalogFromFiles([
        {
            sourcePath: "../../../docs/getting-started/quickstart.md",
            raw: `---\ntitle: Quickstart\nslug: quickstart\nsection: getting-started\nsectionTitle: Getting Started\nsectionOrder: 1\norder: 1\n---\n## Intro\n`,
        },
        {
            sourcePath: "../../../docs/concepts/core/app-definition.md",
            raw: "## Internal note\n",
        },
    ]);

    assertEquals(catalog.articles.map((article) => article.slug), ["quickstart"]);
    assertEquals(catalog.navSections.map((section) => section.title), ["Getting Started"]);
});

Deno.test("docs catalog builder inherits section and group metadata from _meta.json", () => {
    const catalog = buildDocsCatalogFromFiles(
        [
            {
                sourcePath: "../../../docs/concepts/core/routing.md",
                raw: `---\ntitle: Routing Modes\nslug: routing\norder: 1\n---\n## Intro\n`,
            },
        ],
        [
            {
                sourcePath: "../../../docs/concepts/_meta.json",
                attributes: {
                    section: "concepts",
                    sectionTitle: "Concepts",
                    sectionOrder: 2,
                },
            },
            {
                sourcePath: "../../../docs/concepts/core/_meta.json",
                attributes: {
                    group: "core",
                    groupTitle: "Core",
                    groupOrder: 1,
                },
            },
        ],
    );

    assertEquals(catalog.articles[0]?.sectionTitle, "Concepts");
    assertEquals(catalog.articles[0]?.groupTitle, "Core");
});

Deno.test("docs catalog builder inherits per-article slug and order from _meta.json", () => {
    const catalog = buildDocsCatalogFromFiles(
        [
            {
                sourcePath: "../../../docs/concepts/testing/overview.md",
                raw: `---\ntitle: Testing Overview\nsummary: Public testing surface.\n---\n## Intro\n`,
            },
        ],
        [
            {
                sourcePath: "../../../docs/concepts/_meta.json",
                attributes: {
                    section: "concepts",
                    sectionTitle: "Concepts",
                    sectionOrder: 2,
                },
            },
            {
                sourcePath: "../../../docs/concepts/testing/_meta.json",
                attributes: {
                    group: "testing",
                    groupTitle: "Testing",
                    groupOrder: 2,
                    articles: {
                        "overview.md": {
                            slug: "testing-overview",
                            order: 0,
                        },
                    },
                },
            },
        ],
    );

    assertEquals(catalog.articles[0]?.slug, "testing-overview");
    assertEquals(catalog.articles[0]?.order, 0);
});

Deno.test("docs catalog builder ignores article files not listed in _meta.json articles", () => {
    const catalog = buildDocsCatalogFromFiles(
        [
            {
                sourcePath: "../../../docs/concepts/testing/overview.md",
                raw: `---\ntitle: Testing Overview\nsummary: Public testing surface.\n---\n## Intro\n`,
            },
            {
                sourcePath: "../../../docs/concepts/testing/extra-note.md",
                raw: `---\ntitle: Extra Note\nsummary: Should not be listed.\n---\n## Intro\n`,
            },
        ],
        [
            {
                sourcePath: "../../../docs/concepts/_meta.json",
                attributes: {
                    section: "concepts",
                    sectionTitle: "Concepts",
                    sectionOrder: 2,
                },
            },
            {
                sourcePath: "../../../docs/concepts/testing/_meta.json",
                attributes: {
                    group: "testing",
                    groupTitle: "Testing",
                    groupOrder: 2,
                    articles: {
                        "overview.md": {
                            slug: "testing-overview",
                            order: 0,
                        },
                    },
                },
            },
        ],
    );

    assertEquals(catalog.articles.map((article) => article.slug), ["testing-overview"]);
});

Deno.test("docs catalog builder fails when _meta.json declares a missing article file", () => {
    assertThrows(() =>
        buildDocsCatalogFromFiles(
            [
                {
                    sourcePath: "../../../docs/concepts/testing/overview.md",
                    raw: `---\ntitle: Testing Overview\nsummary: Public testing surface.\n---\n## Intro\n`,
                },
            ],
            [
                {
                    sourcePath: "../../../docs/concepts/_meta.json",
                    attributes: {
                        section: "concepts",
                        sectionTitle: "Concepts",
                        sectionOrder: 2,
                    },
                },
                {
                    sourcePath: "../../../docs/concepts/testing/_meta.json",
                    attributes: {
                        group: "testing",
                        groupTitle: "Testing",
                        groupOrder: 2,
                        articles: {
                            "overview.md": {
                                slug: "testing-overview",
                                order: 0,
                            },
                            "missing.md": {
                                slug: "missing-article",
                                order: 1,
                            },
                        },
                    },
                },
            ],
        ), Error, 'Docs metadata declares article "missing.md"');
});

Deno.test("docs service exposes frontmatter lookups by slug", () => {
    const docs = new DocsService();
    const frontmatter = docs.getFrontmatterBySlug("quickstart");

    assertEquals(frontmatter?.title, "Quickstart");
    assertEquals(frontmatter?.order, 1);
});

Deno.test("docs helpers group navigation into sections and nested groups", () => {
    const sections = docs.listNavSections();

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
        "testing-overview",
        "http-testing",
        "component-testing",
        "runtime-testing",
        "e2e-and-smoke",
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
    assertEquals(docs.getPagerBySlug("data-loading"), {
        previous: { slug: "route-metadata", title: "Route Metadata" },
        next: { slug: "navigation-runtime", title: "Navigation Runtime" },
    });

    assertEquals(docs.getPagerBySlug("custom-elements"), {
        previous: { slug: "functional-components", title: "Functional Components" },
        next: { slug: "state-and-events", title: "State and Events" },
    });

    assertEquals(docs.getPagerBySlug("render-owner"), {
        previous: { slug: "state-and-events", title: "State and Events" },
        next: { slug: "page-model", title: "Page Model" },
    });

    assertEquals(docs.getPagerBySlug("authorization"), {
        previous: { slug: "navigation-runtime", title: "Navigation Runtime" },
        next: { slug: "dependency-injection", title: "Dependency Injection" },
    });

    assertEquals(docs.getPagerBySlug("dependency-injection"), {
        previous: { slug: "authorization", title: "Authorization" },
        next: { slug: "testing-overview", title: "Testing Overview" },
    });

    assertEquals(docs.getPagerBySlug("testing-overview"), {
        previous: { slug: "dependency-injection", title: "Dependency Injection" },
        next: { slug: "http-testing", title: "HTTP Testing" },
    });

    assertEquals(docs.getPagerBySlug("http-testing"), {
        previous: { slug: "testing-overview", title: "Testing Overview" },
        next: { slug: "component-testing", title: "Component Testing" },
    });

    assertEquals(docs.getPagerBySlug("e2e-and-smoke"), {
        previous: { slug: "runtime-testing", title: "Runtime Testing" },
        next: { slug: "component-model", title: "Component Model" },
    });

    assertEquals(docs.getPagerBySlug("page-model"), {
        previous: { slug: "render-owner", title: "Render Owner" },
        next: { slug: "head-and-seo", title: "Head and SEO" },
    });

    assertEquals(docs.getPagerBySlug(), {
        next: { slug: "quickstart", title: "Quickstart" },
    });
});

Deno.test("docs helpers resolve markdown links into docs routes", () => {
    assertEquals(
        docs.resolveMarkdownHref("data-loading", "./render-mode-and-strategy.md"),
        "/render-mode-and-strategy",
    );
    assertEquals(
        docs.resolveMarkdownHref("page-model", "../core/render-mode-and-strategy.md#blocking"),
        "/render-mode-and-strategy#blocking",
    );
    assertEquals(
        docs.resolveMarkdownHref("data-loading", "https://mainz.dev"),
        "https://mainz.dev",
    );
    assertEquals(docs.resolveMarkdownHref("data-loading", "#intro"), "#intro");
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
