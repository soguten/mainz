/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { componentLoadMissingFallbackRule } from "../../index.ts";

Deno.test("components/diagnostics/rules: load without fallback should warn for client-only owners", () => {
    const diagnostics = componentLoadMissingFallbackRule.run(
        {
            file: "/repo/src/components/Preview.tsx",
            exportName: "PreviewComponent",
            isAbstract: false,
            extendsComponent: true,
            extendsPage: false,
            hasLoad: true,
            renderStrategy: "client-only",
            hasFallback: false,
            hasAuthorize: false,
            authorizationPolicy: undefined,
            hasAllowAnonymous: false,
        },
        {},
    );

    assertEquals(diagnostics, [
        {
            code: "component-load-missing-fallback",
            severity: "warning",
            message:
                'Component "PreviewComponent" declares load() with @RenderStrategy("client-only") without a fallback. ' +
                "Add a fallback to make the component's async placeholder explicit.",
            file: "/repo/src/components/Preview.tsx",
            exportName: "PreviewComponent",
        },
    ]);
});


