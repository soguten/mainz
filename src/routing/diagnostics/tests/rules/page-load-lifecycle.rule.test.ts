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
            hasRenderDataParameter: false,
            renderDataParameterTypeIsUnknown: false,
            hasExplicitDataContract: false,
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
            hasRenderDataParameter: false,
            renderDataParameterTypeIsUnknown: false,
            hasExplicitDataContract: false,
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

Deno.test("routing/diagnostics/rules: page load lifecycle should error on render(data) without load()", () => {
    const diagnostics = collectPageLoadLifecycleDiagnostics(
        {
            file: "/repo/src/pages/RenderData.page.tsx",
            exportName: "RenderDataPage",
            page: {
                path: "/render-data",
                mode: "csr",
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
            hasRenderDataParameter: true,
            renderDataParameterTypeIsUnknown: true,
            hasExplicitDataContract: false,
        },
    );

    assertEquals(diagnostics, [{
        code: "page-render-data-without-load",
        severity: "error",
        message: 'Page "RenderDataPage" declares render(data) but does not declare load(). ' +
            "render(data) is only valid when page lifecycle data is owned by load().",
        file: "/repo/src/pages/RenderData.page.tsx",
        exportName: "RenderDataPage",
        routePath: "/render-data",
    }]);
});

Deno.test("routing/diagnostics/rules: page load lifecycle should allow render(data: unknown) without explicit Data", () => {
    const diagnostics = collectPageLoadLifecycleDiagnostics(
        {
            file: "/repo/src/pages/RenderData.page.tsx",
            exportName: "RenderDataPage",
            page: {
                path: "/render-data",
                mode: "csr",
            },
        },
        {
            staticMembers: {
                hasEntriesMember: false,
                hasStaticLoadMember: false,
                hasInstanceLoadMember: true,
            },
            entriesFact: {
                hasEntriesMember: false,
            },
            hasRenderDataParameter: true,
            renderDataParameterTypeIsUnknown: true,
            hasExplicitDataContract: false,
        },
    );

    assertEquals(diagnostics, []);
});

Deno.test("routing/diagnostics/rules: page load lifecycle should error on typed render(data) without explicit Data", () => {
    const diagnostics = collectPageLoadLifecycleDiagnostics(
        {
            file: "/repo/src/pages/RenderData.page.tsx",
            exportName: "RenderDataPage",
            page: {
                path: "/render-data",
                mode: "csr",
            },
        },
        {
            staticMembers: {
                hasEntriesMember: false,
                hasStaticLoadMember: false,
                hasInstanceLoadMember: true,
            },
            entriesFact: {
                hasEntriesMember: false,
            },
            hasRenderDataParameter: true,
            renderDataParameterTypeIsUnknown: false,
            hasExplicitDataContract: false,
        },
    );

    assertEquals(diagnostics, [{
        code: "page-render-data-without-explicit-data",
        severity: "error",
        message:
            'Page "RenderDataPage" declares render(data) without an explicit Data generic on Page<Props, State, Data>. ' +
            "When Data is omitted, render(data) must accept unknown. Declare Data explicitly or change the parameter type to unknown.",
        file: "/repo/src/pages/RenderData.page.tsx",
        exportName: "RenderDataPage",
        routePath: "/render-data",
    }]);
});
