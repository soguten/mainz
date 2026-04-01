/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { collectDynamicSsgMissingLoadDiagnostics } from "../../rules/dynamic-ssg-missing-load.rule.ts";

Deno.test("routing/diagnostics/rules: dynamic SSG missing load should warn when entries exist without load", () => {
    const diagnostics = collectDynamicSsgMissingLoadDiagnostics(
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
                    kind: "array",
                    entries: [{
                        params: {
                            slug: "intro",
                        },
                    }],
                },
            },
        },
    );

    assertEquals(diagnostics, [{
        code: "dynamic-ssg-missing-load",
        severity: "warning",
        message:
            'Dynamic SSG route "/docs/:slug" defines entries() but no instance page load(). This is valid when route params are sufficient to render, but consider load.byParam(...) or load.byParams(...) if the page repeats route lookups.',
        file: "/repo/src/pages/Docs.page.tsx",
        exportName: "DocsPage",
        routePath: "/docs/:slug",
    }]);
});



