/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { resolve } from "node:path";
import { collectDiDiagnostics } from "../index.ts";

Deno.test("di/diagnostics: contributor should preserve current DI diagnostics behavior", async () => {
    const file = resolve(
        Deno.cwd(),
        "src/di/diagnostics/tests/di-diagnostics.fixture.tsx",
    ).replaceAll("\\", "/");

    const diagnostics = await collectDiDiagnostics(
        [
            {
                file,
                source: await Deno.readTextFile(file),
            },
        ],
        {
            routePathsByOwner: new Map([[`${file}::DiagnosticsDiFixturePage`, "/di"]]),
        },
    );

    assertEquals(
        diagnostics.map((diagnostics) => diagnostics.code),
        [
            "di-factory-dependency-not-registered",
            "di-registration-cycle",
            "di-token-not-registered",
            "di-token-not-registered",
        ],
    );
});
