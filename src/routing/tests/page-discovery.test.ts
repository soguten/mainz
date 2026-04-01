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
                hasExplicitRenderMode: undefined,
                declaredRoutePath: "/",
                head: undefined,
                locales: undefined,
                authorization: undefined,
            },
        },
        {
            exportName: "SearchPage",
            file: file.replaceAll("\\", "/"),
            page: {
                path: "/search",
                mode: "ssg",
                hasExplicitRenderMode: true,
                declaredRoutePath: "/search",
                locales: ["pt-BR", "en-US"],
                head: undefined,
                authorization: undefined,
            },
        },
    ]);
});

Deno.test("routing/page-discovery: should discover route metadata declared with decorators", async () => {
    await setupMainzDom();

    const file = resolve(join(Deno.cwd(), "src/routing/tests/page-discovery.decorator.fixture.tsx"));
    const pages = await discoverPagesFromFile(file);

    assertEquals(pages, [
        {
            exportName: "DecoratedHomePage",
            file: file.replaceAll("\\", "/"),
            page: {
                path: "/",
                mode: "csr",
                hasExplicitRenderMode: undefined,
                declaredRoutePath: "/",
                locales: undefined,
                head: undefined,
                authorization: undefined,
            },
        },
        {
            exportName: "DecoratedSearchPage",
            file: file.replaceAll("\\", "/"),
            page: {
                path: "/search",
                mode: "ssg",
                hasExplicitRenderMode: true,
                declaredRoutePath: "/search",
                locales: ["pt-BR", "en-US"],
                head: undefined,
                authorization: undefined,
            },
        },
    ]);
});

Deno.test("routing/page-discovery: should discover authorization metadata declared on pages", async () => {
    await setupMainzDom();

    const file = resolve(join(Deno.cwd(), "src/routing/tests/page-discovery.authorization.fixture.tsx"));
    const pages = await discoverPagesFromFile(file);

    assertEquals(pages, [
        {
            exportName: "AdminPage",
            file: file.replaceAll("\\", "/"),
            page: {
                path: "/admin",
                mode: "csr",
                hasExplicitRenderMode: true,
                declaredRoutePath: "/admin",
                locales: undefined,
                head: undefined,
                authorization: {
                    allowAnonymous: undefined,
                    requirement: {
                        authenticated: true,
                        roles: ["admin"],
                        policy: "org-member",
                    },
                },
            },
        },
        {
            exportName: "SignInPage",
            file: file.replaceAll("\\", "/"),
            page: {
                path: "/signin",
                mode: "ssg",
                hasExplicitRenderMode: true,
                declaredRoutePath: "/signin",
                locales: undefined,
                head: undefined,
                authorization: {
                    allowAnonymous: true,
                    requirement: undefined,
                },
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

Deno.test("routing/page-discovery: should fail when a Page export omits a route annotation", async () => {
    await setupMainzDom();

    const file = resolve(join(Deno.cwd(), "src/routing/tests/page-discovery.missing-metadata.fixture.tsx"));

    await assertRejects(
        () => discoverPagesFromFile(file),
        Error,
        "must define a route with @Route(...)",
    );
});

Deno.test("routing/page-discovery: should fail when @Locales(...) declares an invalid locale tag", async () => {
    await setupMainzDom();

    const file = resolve(join(Deno.cwd(), "src/routing/tests/page-discovery.invalid-locale.fixture.tsx"));

    await assertRejects(
        () => discoverPagesFromFile(file),
        Error,
        '@Locales() received invalid locale "en--US" at index 0.',
    );
});

Deno.test("routing/page-discovery: should discover decorator-only render mode declarations", async () => {
    await setupMainzDom();

    const file = resolve(join(Deno.cwd(), "src/routing/tests/page-discovery.conflict.fixture.tsx"));
    const pages = await discoverPagesFromFile(file);

    assertEquals(pages, [
        {
            exportName: "ConflictingPage",
            file: file.replaceAll("\\", "/"),
            page: {
                path: "/conflict",
                mode: "csr",
                hasExplicitRenderMode: true,
                declaredRoutePath: "/conflict",
                locales: undefined,
                head: undefined,
                authorization: undefined,
            },
        },
    ]);
});
