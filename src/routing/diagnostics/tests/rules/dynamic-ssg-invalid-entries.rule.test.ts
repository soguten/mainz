/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { collectDynamicSsgInvalidEntriesDiagnostics } from "../../rules/dynamic-ssg-invalid-entries.rule.ts";

Deno.test("routing/diagnostics/rules: dynamic SSG invalid entries should report non-array entries results", () => {
    const diagnostics = collectDynamicSsgInvalidEntriesDiagnostics(
        {
            file: "/repo/src/pages/Docs.page.tsx",
            exportName: "DocsPage",
            page: {
                path: "/docs/:slug",
                mode: "ssg",
            },
        },
        {
            staticMembers: {
                hasEntriesMember: true,
                hasStaticLoadMember: false,
                hasInstanceLoadMember: false,
            },
            entriesFact: {
                hasEntriesMember: true,
                evaluation: {
                    kind: "non-array",
                },
            },
        },
    );

    assertEquals(diagnostics, {
        diagnostics: [{
            code: "dynamic-ssg-invalid-entries",
            severity: "error",
            message:
                'entries() for dynamic SSG route "/docs/:slug" returned a non-array result. Expected an array of entry definitions.',
            file: "/repo/src/pages/Docs.page.tsx",
            exportName: "DocsPage",
            routePath: "/docs/:slug",
        }],
        hasInvalidEntries: true,
    });
});



