/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { componentRenderDataWithoutExplicitDataRule } from "../../index.ts";

Deno.test("components/diagnostics/rules: typed render(data) without explicit Data should error", () => {
    const diagnostics = componentRenderDataWithoutExplicitDataRule.run({
        file: "/repo/src/components/Panel.tsx",
        exportName: "Panel",
        isAbstract: false,
        extendsComponent: true,
        extendsPage: false,
        hasLoad: true,
        renderStrategy: "blocking",
        renderPolicy: undefined,
        hasPlaceholder: false,
        hasError: false,
        hasExplicitRenderStrategy: false,
        hasExplicitRenderPolicy: false,
        hasAuthorize: false,
        authorizationPolicy: undefined,
        hasAllowAnonymous: false,
        hasRenderDataParameter: true,
        renderDataParameterTypeIsUnknown: false,
        hasExplicitDataContract: false,
    }, {});

    assertEquals(diagnostics, [{
        code: "component-render-data-without-explicit-data",
        severity: "error",
        message:
            'Component "Panel" declares render(data) without an explicit Data generic on Component<Props, State, Data>. ' +
            "When Data is omitted, render(data) must accept unknown. Declare Data explicitly or change the parameter type to unknown.",
        file: "/repo/src/components/Panel.tsx",
        exportName: "Panel",
    }]);
});

Deno.test("components/diagnostics/rules: render(data: unknown) without explicit Data should stay valid", () => {
    const diagnostics = componentRenderDataWithoutExplicitDataRule.run({
        file: "/repo/src/components/Panel.tsx",
        exportName: "Panel",
        isAbstract: false,
        extendsComponent: true,
        extendsPage: false,
        hasLoad: true,
        renderStrategy: "blocking",
        renderPolicy: undefined,
        hasPlaceholder: false,
        hasError: false,
        hasExplicitRenderStrategy: false,
        hasExplicitRenderPolicy: false,
        hasAuthorize: false,
        authorizationPolicy: undefined,
        hasAllowAnonymous: false,
        hasRenderDataParameter: true,
        renderDataParameterTypeIsUnknown: true,
        hasExplicitDataContract: false,
    }, {});

    assertEquals(diagnostics, []);
});
