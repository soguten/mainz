/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { componentLoadMissingPlaceholderRule } from "../../index.ts";

Deno.test("diagnostics/components/rules: load without placeholder should warn for defer owners", () => {
    const diagnostics = componentLoadMissingPlaceholderRule.run(
        {
            file: "/repo/src/components/Preview.tsx",
            exportName: "PreviewComponent",
            isAbstract: false,
            extendsComponent: true,
            extendsPage: false,
            hasLoad: true,
            renderStrategy: "defer",
            renderPolicy: undefined,
            hasPlaceholder: false,
            hasError: false,
            hasExplicitRenderStrategy: true,
            hasExplicitRenderPolicy: false,
            hasAuthorize: false,
            authorizationPolicy: undefined,
            hasAllowAnonymous: false,
            hasRenderDataParameter: false,
            renderDataParameterTypeIsUnknown: false,
            hasExplicitDataContract: true,
        },
        {},
    );

    assertEquals(diagnostics, [
        {
            code: "component-load-missing-placeholder",
            severity: "warning",
            message:
                'Component "PreviewComponent" declares load() with @RenderStrategy("defer") without a placeholder(). ' +
                "Add placeholder() to make the component's async placeholder explicit.",
            file: "/repo/src/components/Preview.tsx",
            exportName: "PreviewComponent",
        },
    ]);
});
