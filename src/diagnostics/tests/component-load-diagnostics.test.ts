/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { resolve } from "node:path";
import { collectComponentDiagnostics } from "../index.ts";

Deno.test("diagnostics/component: should report Component.load strategy and fallback intent", async () => {
    const file = resolve(
        Deno.cwd(),
        "src/diagnostics/tests/component-load-diagnostics.fixture.tsx",
    );
    const diagnostics = await collectComponentDiagnostics([
        {
            file: file.replaceAll("\\", "/"),
            source: await Deno.readTextFile(file),
        },
    ]);

    assertEquals(diagnostics, [
        {
            code: "component-load-missing-render-strategy",
            severity: "error",
            message:
                'Component "MissingStrategyLoadComponent" declares load() but does not declare @RenderStrategy(...). ' +
                "Component.load() requires a fixed component-level render strategy.",
            file: file.replaceAll("\\", "/"),
            exportName: "MissingStrategyLoadComponent",
        },
        {
            code: "component-load-missing-fallback",
            severity: "warning",
            message:
                'Component "MissingFallbackLoadComponent" declares load() with @RenderStrategy("client-only") without a fallback. ' +
                "Add a fallback to make the component's async placeholder explicit.",
            file: file.replaceAll("\\", "/"),
            exportName: "MissingFallbackLoadComponent",
        },
        {
            code: "component-render-strategy-without-load",
            severity: "warning",
            message:
                'Component "StrategyWithoutLoadComponent" declares @RenderStrategy("blocking") but does not declare load(). ' +
                "@RenderStrategy(...) only affects Component.load() and has no effect on synchronous components.",
            file: file.replaceAll("\\", "/"),
            exportName: "StrategyWithoutLoadComponent",
        },
    ]);
});
