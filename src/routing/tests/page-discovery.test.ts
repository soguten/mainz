/// <reference lib="deno.ns" />

import { assertEquals, assertRejects } from "@std/assert";
import { join, resolve } from "node:path";
import { discoverPagesFromFile, discoverPagesFromFiles } from "../server.ts";
import { setupMainzDom } from "../../testing/index.ts";

Deno.test("routing/page-discovery: should discover exported Page subclasses and default mode to csr", async () => {
    await setupMainzDom();

    const file = resolve(join(Deno.cwd(), "src/routing/tests/page-discovery.fixture.tsx"));
    const pages = await discoverPagesFromFile(file);

    assertEquals(pages, [
        {
            exportName: "HomePage",
            file: file.replaceAll("\\", "/"),
            page: {
                path: "/",
                mode: "csr",
                head: {
                    title: "Home",
                    meta: [
                        { name: "description", content: "Home page" },
                    ],
                    links: undefined,
                },
                locales: undefined,
            },
        },
        {
            exportName: "SearchPage",
            file: file.replaceAll("\\", "/"),
            page: {
                path: "/search",
                mode: "ssg",
                locales: ["pt-BR", "en-US"],
                head: undefined,
            },
        },
    ]);
});

Deno.test("routing/page-discovery: should ignore non-page exports across multiple files", async () => {
    await setupMainzDom();

    const files = [
        resolve(join(Deno.cwd(), "src/routing/tests/page-discovery.page.tsx")),
        resolve(join(Deno.cwd(), "src/routing/tests/filesystem-routing.test.ts")),
    ];

    const pages = await discoverPagesFromFiles(files);

    assertEquals(pages.map((page) => page.exportName), ["HomePage", "SearchPage"]);
});

Deno.test("routing/page-discovery: should fail when a Page export omits static metadata", async () => {
    await setupMainzDom();

    const file = resolve(join(Deno.cwd(), "src/routing/tests/page-discovery.missing-metadata.fixture.tsx"));

    await assertRejects(
        () => discoverPagesFromFile(file),
        Error,
        "must define static page metadata",
    );
});
