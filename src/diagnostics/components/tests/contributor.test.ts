/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { resolve } from "node:path";
import { collectComponentDiagnostics } from "../index.ts";

Deno.test("diagnostics/components: contributor should preserve current component diagnostics behavior", async () => {
    const file = resolve(
        Deno.cwd(),
        "src/diagnostics/components/tests/component-load-diagnostics.fixture.tsx",
    ).replaceAll("\\", "/");

    const diagnostics = await collectComponentDiagnostics([
        {
            file,
            source: await Deno.readTextFile(file),
        },
    ]);

    assertEquals(
        diagnostics.map((diagnostics) => diagnostics.code),
        [
            "component-allow-anonymous-not-supported",
            "component-placeholder-in-ssg-missing-placeholder",
            "component-render-data-without-explicit-data",
            "component-render-data-without-load",
            "component-authorization-ssg-warning",
            "component-authorization-ssg-warning",
            "component-blocking-placeholder-conflict",
            "component-blocking-placeholder-conflict",
            "component-error-without-load",
            "component-placeholder-without-load",
            "component-render-strategy-without-load",
        ],
    );
});
