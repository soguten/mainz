/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { resolve } from "node:path";
import { collectComponentDiagnostics } from "../index.ts";

Deno.test("diagnostics/component: should report missing ResourceComponent strategy and fallback intent", async () => {
    const file = resolve(Deno.cwd(), "src/diagnostics/tests/component-diagnostics.fixture.tsx");
    const diagnostics = await collectComponentDiagnostics([
        {
            file: file.replaceAll("\\", "/"),
            source: await Deno.readTextFile(file),
        },
    ]);

    assertEquals(diagnostics, [
        {
            code: "resource-component-missing-render-strategy",
            severity: "error",
            message:
                'ResourceComponent "MissingStrategyResourceComponent" must declare @RenderStrategy(...). ' +
                "ResourceComponent requires a fixed component-level render strategy.",
            file: file.replaceAll("\\", "/"),
            exportName: "MissingStrategyResourceComponent",
        },
        {
            code: "resource-component-blocking-client-resource",
            severity: "warning",
            message:
                'ResourceComponent "BlockingClientResourceComponent" uses @RenderStrategy("blocking") with client-only resource "live-preview". ' +
                "This is valid in CSR, but it will fail when the component is used in an SSG path.",
            file: file.replaceAll("\\", "/"),
            exportName: "BlockingClientResourceComponent",
        },
        {
            code: "resource-component-blocking-private-resource",
            severity: "warning",
            message:
                'ResourceComponent "BlockingPrivateResourceComponent" uses @RenderStrategy("blocking") with private resource "current-user". ' +
                "This is valid in CSR, but it will fail when the component is used in an SSG path.",
            file: file.replaceAll("\\", "/"),
            exportName: "BlockingPrivateResourceComponent",
        },
        {
            code: "resource-component-missing-fallback",
            severity: "warning",
            message:
                'ResourceComponent "MissingFallbackResourceComponent" uses @RenderStrategy("deferred") without a fallback. ' +
                "Add a fallback to make the component's async placeholder explicit.",
            file: file.replaceAll("\\", "/"),
            exportName: "MissingFallbackResourceComponent",
        },
    ]);
});
