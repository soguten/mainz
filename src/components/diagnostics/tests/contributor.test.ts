/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { resolve } from "node:path";
import { collectComponentDiagnostics } from "../index.ts";

Deno.test("components/diagnostics: contributor should preserve current component diagnostics behavior", async () => {
    const file = resolve(
        Deno.cwd(),
        "src/components/diagnostics/tests/component-load-diagnostics.fixture.tsx",
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
            "component-authorization-ssg-warning",
            "component-authorization-ssg-warning",
            "component-blocking-fallback-misleading",
            "component-load-missing-fallback",
            "component-render-strategy-without-load",
        ],
    );
});
