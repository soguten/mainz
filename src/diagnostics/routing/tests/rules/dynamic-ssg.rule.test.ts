/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { collectDynamicSsgDiagnostics } from "../../rules/dynamic-ssg.rule.ts";

Deno.test("diagnostics/routing/rules: dynamic SSG should require entries before considering load", () => {
    const diagnostics = collectDynamicSsgDiagnostics(
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
                hasEntriesMember: false,
                hasStaticLoadMember: false,
                hasInstanceLoadMember: false,
            },
            entriesFact: {
                hasEntriesMember: false,
            },
            hasRenderDataParameter: false,
            renderDataParameterTypeIsUnknown: false,
            hasExplicitDataContract: false,
        },
    );

    assertEquals(diagnostics, [{
        code: "dynamic-ssg-missing-entries",
        severity: "error",
        message: 'SSG route "/docs/:slug" must define entries() to expand dynamic params.',
        file: "/repo/src/pages/Docs.page.tsx",
        exportName: "DocsPage",
        routePath: "/docs/:slug",
    }]);
});
