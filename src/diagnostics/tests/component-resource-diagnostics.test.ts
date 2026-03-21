/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { resolve } from "node:path";
import { collectComponentSourceDiagnostics } from "../index.ts";

Deno.test("diagnostics/component-resource: should report missing owner render strategy and fallback intent", async () => {
    const file = resolve(
        Deno.cwd(),
        "src/diagnostics/tests/component-resource-diagnostics.fixture.tsx",
    ).replaceAll("\\", "/");

    const diagnostics = await collectComponentSourceDiagnostics([
        {
            file,
            source: await Deno.readTextFile(file),
        },
    ]);

    assertEquals(diagnostics, [
        {
            code: "component-resource-missing-render-strategy",
            severity: "error",
            message:
                'Component "DefaultExportMissingStrategyComponentResourceOwner" renders ComponentResource but does not declare @RenderStrategy(...). ' +
                "ComponentResource requires a fixed component-level render strategy on its owner.",
            file,
            exportName: "DefaultExportMissingStrategyComponentResourceOwner",
        },
        {
            code: "component-resource-missing-render-strategy",
            severity: "error",
            message:
                'Component "MissingStrategyComponentResourceOwner" renders ComponentResource but does not declare @RenderStrategy(...). ' +
                "ComponentResource requires a fixed component-level render strategy on its owner.",
            file,
            exportName: "MissingStrategyComponentResourceOwner",
        },
        {
            code: "component-resource-blocking-client-resource",
            severity: "warning",
            message:
                'Component "BlockingClientComponentResourceOwner" renders ComponentResource with @RenderStrategy("blocking") using client-only resource "live-preview". ' +
                "This is valid in CSR, but it will fail when the component is used in an SSG path.",
            file,
            exportName: "BlockingClientComponentResourceOwner",
        },
        {
            code: "component-resource-blocking-private-resource",
            severity: "warning",
            message:
                'Component "BlockingImplicitPrivateComponentResourceOwner" renders ComponentResource with @RenderStrategy("blocking") using private resource "draft-preview". ' +
                "This is valid in CSR, but it will fail when the component is used in an SSG path.",
            file,
            exportName: "BlockingImplicitPrivateComponentResourceOwner",
        },
        {
            code: "component-resource-blocking-private-resource",
            severity: "warning",
            message:
                'Component "BlockingPrivateComponentResourceOwner" renders ComponentResource with @RenderStrategy("blocking") using private resource "current-user". ' +
                "This is valid in CSR, but it will fail when the component is used in an SSG path.",
            file,
            exportName: "BlockingPrivateComponentResourceOwner",
        },
        {
            code: "component-resource-missing-fallback",
            severity: "warning",
            message:
                'Component "MissingFallbackComponentResourceOwner" renders ComponentResource with @RenderStrategy("deferred") without a fallback. ' +
                "Add a fallback to make the component's async placeholder explicit.",
            file,
            exportName: "MissingFallbackComponentResourceOwner",
        },
    ]);
});
