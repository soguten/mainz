/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { componentRenderDataWithoutLoadRule } from "../../index.ts";

Deno.test("diagnostics/components/rules: render(data) without load should error", () => {
  const diagnostics = componentRenderDataWithoutLoadRule.run({
    file: "/repo/src/components/Panel.tsx",
    exportName: "Panel",
    isAbstract: false,
    extendsComponent: true,
    extendsPage: false,
    hasLoad: false,
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

  assertEquals(diagnostics, [{
    code: "component-render-data-without-load",
    severity: "error",
    message:
      'Component "Panel" declares render(data) but does not declare load(). ' +
      "render(data) is only valid when lifecycle data is owned by load().",
    file: "/repo/src/components/Panel.tsx",
    exportName: "Panel",
  }]);
});

Deno.test("diagnostics/components/rules: render(data) with load should stay valid", () => {
  const diagnostics = componentRenderDataWithoutLoadRule.run({
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
