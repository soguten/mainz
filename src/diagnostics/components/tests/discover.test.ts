/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { resolve } from "node:path";
import { discoverComponentFacts } from "../index.ts";

Deno.test("diagnostics/components: discover should resolve inherited load and strategy facts", async () => {
  const file = resolve(
    Deno.cwd(),
    "src/diagnostics/components/tests/component-load-diagnostics.fixture.tsx",
  ).replaceAll("\\", "/");

  const facts = await discoverComponentFacts([
    {
      file,
      source: await Deno.readTextFile(file),
    },
  ]);

  assertEquals(
    facts.find((fact) => fact.exportName === "BlockingPlaceholderComponent"),
    {
      file,
      exportName: "BlockingPlaceholderComponent",
      isAbstract: false,
      extendsComponent: true,
      extendsPage: false,
      hasLoad: true,
      renderStrategy: "blocking",
      renderPolicy: undefined,
      hasPlaceholder: true,
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
  );
});
