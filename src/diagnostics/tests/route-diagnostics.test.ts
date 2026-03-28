/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { join, resolve } from "node:path";
import { collectRouteDiagnostics } from "../index.ts";
import { discoverPagesFromFile } from "../../routing/server.ts";
import { setupMainzDom } from "../../testing/index.ts";

Deno.test("diagnostics/route: should report dynamic ssg, notFound, and routing-set warnings", async () => {
    await setupMainzDom();

    const file = resolve(join(Deno.cwd(), "src/diagnostics/tests/route-diagnostics.fixture.tsx"));
    const pages = await discoverPagesFromFile(file);
    const diagnostics = sortDiagnostics(await collectRouteDiagnostics(pages));

    assertEquals(diagnostics, sortDiagnostics([
        {
            code: "multiple-not-found-pages",
            severity: "error",
            message:
                'Only one notFound page may be declared per routing set. "InvalidNotFoundCsrPage" conflicts with other notFound pages.',
            file: file.replaceAll("\\", "/"),
            exportName: "InvalidNotFoundCsrPage",
            routePath: "/missing",
        },
        {
            code: "multiple-not-found-pages",
            severity: "error",
            message:
                'Only one notFound page may be declared per routing set. "FirstNotFoundPage" conflicts with other notFound pages.',
            file: file.replaceAll("\\", "/"),
            exportName: "FirstNotFoundPage",
            routePath: "/404",
        },
        {
            code: "not-found-must-use-ssg",
            severity: "error",
            message: 'notFound page "InvalidNotFoundCsrPage" must use @RenderMode("ssg").',
            file: file.replaceAll("\\", "/"),
            exportName: "InvalidNotFoundCsrPage",
            routePath: "/missing",
        },
        {
            code: "page-authorization-anonymous-conflict",
            severity: "error",
            message:
                'Page "AllowAnonymousConflictPage" combines @AllowAnonymous() with @Authorize(...). ' +
                "@AllowAnonymous() cannot relax page authorization declared on the same page.",
            file: file.replaceAll("\\", "/"),
            exportName: "AllowAnonymousConflictPage",
            routePath: "/signin",
        },
        {
            code: "dynamic-ssg-missing-entries",
            severity: "error",
            message: 'SSG route "/docs/:slug" must define entries() to expand dynamic params.',
            file: file.replaceAll("\\", "/"),
            exportName: "DynamicSsgWithoutEntriesPage",
            routePath: "/docs/:slug",
        },
        {
            code: "dynamic-ssg-invalid-entries",
            severity: "error",
            message:
                'entries() for dynamic SSG route "/news/:slug" returned a non-array result. Expected an array of entry definitions.',
            file: file.replaceAll("\\", "/"),
            exportName: "DynamicSsgInvalidEntriesShapePage",
            routePath: "/news/:slug",
        },
        {
            code: "dynamic-ssg-invalid-entries",
            severity: "error",
            message:
                'entries() for dynamic SSG route "/tips/:slug" returned an invalid entry at index 0: Dynamic route "/tips/:slug" requires "slug"; these params is missing from entries().',
            file: file.replaceAll("\\", "/"),
            exportName: "DynamicSsgInvalidEntriesHelperPage",
            routePath: "/tips/:slug",
        },
        {
            code: "dynamic-ssg-invalid-entries",
            severity: "error",
            message:
                'entries() for dynamic SSG route "/async/:slug" returned an invalid entry at index 0: Dynamic route "/async/:slug" requires "slug"; these params is missing from entries().',
            file: file.replaceAll("\\", "/"),
            exportName: "DynamicSsgInvalidEntriesFromAsyncHelperPage",
            routePath: "/async/:slug",
        },
        {
            code: "dynamic-ssg-invalid-entries",
            severity: "error",
            message:
                'entries() for dynamic SSG route "/shared/:slug" returned an invalid entry at index 0: Dynamic route "/shared/:slug" requires "slug"; these params is missing from entries().',
            file: file.replaceAll("\\", "/"),
            exportName: "DynamicSsgInvalidSharedParamsPage",
            routePath: "/shared/:slug",
        },
        {
            code: "dynamic-ssg-invalid-entries",
            severity: "error",
            message:
                'entries() for dynamic SSG route "/helper/:slug" returned an invalid entry at index 0: Dynamic route "/helper/:slug" requires "slug"; these params is missing from entries().',
            file: file.replaceAll("\\", "/"),
            exportName: "DynamicSsgInvalidParamsHelperPage",
            routePath: "/helper/:slug",
        },
        {
            code: "dynamic-ssg-invalid-entries",
            severity: "error",
            message:
                'entries() for dynamic SSG route "/nested/:slug" returned an invalid entry at index 0: Dynamic route "/nested/:slug" requires "slug"; these params is missing from entries().',
            file: file.replaceAll("\\", "/"),
            exportName: "DynamicSsgInvalidNestedParamsHelperPage",
            routePath: "/nested/:slug",
        },
        {
            code: "dynamic-ssg-invalid-entries",
            severity: "error",
            message:
                'entries() for dynamic SSG route "/entry-helper/:slug" returned an invalid entry at index 0: Dynamic route "/entry-helper/:slug" requires "slug"; these params is missing from entries().',
            file: file.replaceAll("\\", "/"),
            exportName: "DynamicSsgInvalidEntryHelperPage",
            routePath: "/entry-helper/:slug",
        },
        {
            code: "dynamic-ssg-invalid-entries",
            severity: "error",
            message:
                'entries() for dynamic SSG route "/spread/:slug" returned an invalid entry at index 0: Dynamic route "/spread/:slug" requires "slug"; these params is missing from entries().',
            file: file.replaceAll("\\", "/"),
            exportName: "DynamicSsgInvalidSpreadParamsPage",
            routePath: "/spread/:slug",
        },
        {
            code: "dynamic-ssg-invalid-entries",
            severity: "error",
            message:
                'entries() for dynamic SSG route "/shared-spread/:slug" returned an invalid entry at index 0: Dynamic route "/shared-spread/:slug" requires "slug"; these params is missing from entries().',
            file: file.replaceAll("\\", "/"),
            exportName: "DynamicSsgInvalidSharedSpreadParamsPage",
            routePath: "/shared-spread/:slug",
        },
        {
            code: "dynamic-ssg-invalid-entries",
            severity: "error",
            message:
                'entries() for dynamic SSG route "/local-spread/:slug" returned an invalid entry at index 0: Dynamic route "/local-spread/:slug" requires "slug"; these params is missing from entries().',
            file: file.replaceAll("\\", "/"),
            exportName: "DynamicSsgInvalidLocalSpreadAliasPage",
            routePath: "/local-spread/:slug",
        },
        {
            code: "dynamic-ssg-invalid-entries",
            severity: "error",
            message:
                'entries() for dynamic SSG route "/entries-ref/:slug" returned an invalid entry at index 0: Dynamic route "/entries-ref/:slug" requires "slug"; these params is missing from entries().',
            file: file.replaceAll("\\", "/"),
            exportName: "DynamicSsgInvalidReferencedEntriesPage",
            routePath: "/entries-ref/:slug",
        },
        {
            code: "dynamic-ssg-invalid-entries",
            severity: "error",
            message:
                'entries() for dynamic SSG route "/blog/:slug" returned an invalid entry at index 0: Dynamic route "/blog/:slug" requires "slug"; these params is missing from entries().',
            file: file.replaceAll("\\", "/"),
            exportName: "DynamicSsgInvalidEntriesPage",
            routePath: "/blog/:slug",
        },
        {
            code: "dynamic-ssg-missing-load",
            severity: "warning",
            message:
                'Dynamic SSG route "/guides/:slug" defines entries() but no load(). This is valid when route params are sufficient to render, but consider load.byParam(...) or load.byParams(...) if the page repeats route lookups.',
            file: file.replaceAll("\\", "/"),
            exportName: "DynamicSsgWithoutLoadPage",
            routePath: "/guides/:slug",
        },
        {
            code: "page-authorization-ssg-warning",
            severity: "warning",
            message:
                'Page "AuthorizedSsgPage" uses @Authorize(...) with @RenderMode("ssg"). ' +
                "Mainz treats this as declarative route metadata only; protected delivery must be enforced by the host, adapter, gateway, or proxy.",
            file: file.replaceAll("\\", "/"),
            exportName: "AuthorizedSsgPage",
            routePath: "/private-docs",
        },
    ]));
});

Deno.test("diagnostics/route: should report missing named authorization policies when diagnostics know the target policy names", async () => {
    await setupMainzDom();

    const file = resolve(join(Deno.cwd(), "src/diagnostics/tests/route-diagnostics.fixture.tsx"));
    const pages = await discoverPagesFromFile(file);
    const diagnostics = await collectRouteDiagnostics(pages, {
        registeredPolicyNames: ["billing-admin"],
    });

    assertEquals(
        diagnostics.find((diagnostic) =>
            diagnostic.code === "authorization-policy-not-registered" &&
            diagnostic.exportName === "PolicyProtectedPage"
        ),
        {
            code: "authorization-policy-not-registered",
            severity: "error",
            message:
                'Page "PolicyProtectedPage" references @Authorize({ policy: "org-member" }), ' +
                "but that policy name is not declared in target.authorization.policyNames for diagnostics.",
            file: file.replaceAll("\\", "/"),
            exportName: "PolicyProtectedPage",
            routePath: "/org",
        },
    );
});

function sortDiagnostics<T extends { code: string; exportName: string; routePath?: string }>(
    diagnostics: readonly T[],
): T[] {
    return [...diagnostics].sort((a, b) => {
        if (a.code !== b.code) {
            return a.code.localeCompare(b.code);
        }

        if (a.exportName !== b.exportName) {
            return a.exportName.localeCompare(b.exportName);
        }

        return (a.routePath ?? "").localeCompare(b.routePath ?? "");
    });
}
