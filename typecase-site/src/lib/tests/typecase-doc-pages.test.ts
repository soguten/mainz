/// <reference lib="deno.ns" />

import { assert, assertEquals } from "@std/assert";

const docsSource = await Deno.readTextFile(new URL("../typecase-docs.tsx", import.meta.url));
const mainSource = await Deno.readTextFile(new URL("../../main.tsx", import.meta.url));
const pagesDir = new URL("../../pages/components/", import.meta.url);

Deno.test("typecase-site/docs: component docs should be registered as app pages", async () => {
    const slugs = Array.from(docsSource.matchAll(/slug: "([^"]+)"/g)).map((match) => match[1]);
    const pageEntries: Array<{ className: string; slug: string }> = [];

    for await (const entry of Deno.readDir(pagesDir)) {
        if (!entry.isFile || !entry.name.endsWith(".page.tsx")) {
            continue;
        }

        const source = await Deno.readTextFile(new URL(entry.name, pagesDir));
        const className = source.match(/export class (\w+)/)?.[1];
        const slug = source.match(/readonly slug = "([^"]+)"/)?.[1];

        if (className && slug) {
            pageEntries.push({ className, slug });
        }
    }

    const pageClassesBySlug = new Map(pageEntries.map((entry) => [entry.slug, entry.className]));

    for (const slug of slugs) {
        const className = pageClassesBySlug.get(slug);

        assert(className, `Missing page file for Typecase doc slug "${slug}".`);
        assert(
            mainSource.includes(`${className},`),
            `Missing ${className} in typecase-site defineApp pages.`,
        );
    }

    assertEquals(slugs.length, pageEntries.length);
});
