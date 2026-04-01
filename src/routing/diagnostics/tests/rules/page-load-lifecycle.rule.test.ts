/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { collectPageLoadLifecycleDiagnostics } from "../../rules/page-load-lifecycle.rule.ts";

Deno.test("routing/diagnostics/rules: page load lifecycle should error on static load()", () => {
    const diagnostics = collectPageLoadLifecycleDiagnostics(
        {
            file: "/repo/src/pages/Legacy.page.tsx",
            exportName: "LegacyPage",
            page: {
                path: "/legacy",
                mode: "csr",
            },
        },
        {
            staticMembers: {
                hasEntriesMember: false,
                hasStaticLoadMember: true,
                hasInstanceLoadMember: false,
            },
            entriesFact: {
                hasEntriesMember: false,
            },
        },
    );

    assertEquals(diagnostics, [{
        code: "page-static-load-unsupported",
        severity: "error",
        message:
            'Page "LegacyPage" declares static load(), which is no longer supported. Move that logic into the page instance load() lifecycle.',
        file: "/repo/src/pages/Legacy.page.tsx",
        exportName: "LegacyPage",
        routePath: "/legacy",
    }]);
});

Deno.test("routing/diagnostics/rules: page load lifecycle should error when static and instance load() coexist", () => {
    const diagnostics = collectPageLoadLifecycleDiagnostics(
        {
            file: "/repo/src/pages/Mixed.page.tsx",
            exportName: "MixedPage",
            page: {
                path: "/mixed",
                mode: "csr",
            },
        },
        {
            staticMembers: {
                hasEntriesMember: false,
                hasStaticLoadMember: true,
                hasInstanceLoadMember: true,
            },
            entriesFact: {
                hasEntriesMember: false,
            },
        },
    );

    assertEquals(diagnostics, [{
        code: "page-static-load-unsupported",
        severity: "error",
        message:
            'Page "MixedPage" declares static load(), which is no longer supported. Move that logic into the page instance load() lifecycle.',
        file: "/repo/src/pages/Mixed.page.tsx",
        exportName: "MixedPage",
        routePath: "/mixed",
    }]);
});
