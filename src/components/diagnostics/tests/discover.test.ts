/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { resolve } from "node:path";
import { discoverComponentFacts } from "../index.ts";

Deno.test("components/diagnostics: discover should resolve inherited load and strategy facts", async () => {
    const file = resolve(
        Deno.cwd(),
        "src/components/diagnostics/tests/component-load-diagnostics.fixture.tsx",
    ).replaceAll("\\", "/");

    const facts = await discoverComponentFacts([
        {
            file,
            source: await Deno.readTextFile(file),
        },
    ]);

    assertEquals(
        facts.find((fact) => fact.exportName === "BlockingFallbackComponent"),
        {
            file,
            exportName: "BlockingFallbackComponent",
            isAbstract: false,
            extendsComponent: true,
            extendsPage: false,
            hasLoad: true,
            renderStrategy: "blocking",
            hasFallback: true,
            hasAuthorize: false,
            authorizationPolicy: undefined,
            hasAllowAnonymous: false,
        },
    );
});
