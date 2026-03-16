/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { getDocsNavSections, getDocsPager } from "../docs.ts";
import { parseMarkdown } from "../markdown.ts";

Deno.test("docs helpers group navigation into sections and nested groups", () => {
    const sections = getDocsNavSections();

    assertEquals(sections.map((section) => section.title), ["Getting Started", "Concepts", "Advanced"]);
    assertEquals(sections[1].groups?.[0].title, "Core");
    assertEquals(sections[1].groups?.[0].items.map((item) => item.slug), ["routing", "data-loading", "navigation-runtime"]);
    assertEquals(sections[1].groups?.[1].title, "Pages");
});

Deno.test("docs helpers compute previous and next article links", () => {
    assertEquals(getDocsPager("data-loading"), {
        previous: { slug: "routing", title: "Routing Modes" },
        next: { slug: "navigation-runtime", title: "Navigation Runtime" },
    });

    assertEquals(getDocsPager(), {
        next: { slug: "quickstart", title: "Quickstart" },
    });
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

    assertEquals(blocks[0], { type: "heading", level: 2, text: "Intro", id: "intro" });
    assertEquals(blocks[1], { type: "paragraph", text: "Hello `world`." });
    assertEquals(blocks[2], { type: "blockquote", text: "Useful note." });
    assertEquals(blocks[3], {
        type: "code",
        language: "tsx",
        label: "demo.tsx",
        content: 'console.log("hi");',
    });
});
