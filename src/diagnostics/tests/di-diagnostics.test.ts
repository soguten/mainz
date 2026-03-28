/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { resolve } from "node:path";
import { collectDiDiagnostics } from "../index.ts";

Deno.test("diagnostics/di: should report missing service tokens, missing factory dependencies, and cycles", async () => {
    const file = resolve(
        Deno.cwd(),
        "src/diagnostics/tests/di-diagnostics.fixture.tsx",
    ).replaceAll("\\", "/");

    const diagnostics = await collectDiDiagnostics(
        [
            {
                file,
                source: await Deno.readTextFile(file),
            },
        ],
        {
            routePathsByOwner: new Map([[`${file}::DiagnosticsDiPage`, "/di"]]),
        },
    );

    assertEquals(sortDiagnostics(normalizeDiagnostics(diagnostics)), sortDiagnostics([
        {
            code: "di-factory-dependency-not-registered",
            severity: "error",
            message:
                'Service "NeedsMissingDependency" depends on "MissingDependency" through get(...), ' +
                "but that dependency is not registered in app startup services.",
            file,
            exportName: "NeedsMissingDependency",
        },
        {
                code: "di-token-not-registered",
                severity: "error",
                message:
                    'Class "DiagnosticsDiPage" injects "MissingApi" with mainz/di, ' +
                    "but that token is not registered in app startup services.",
            file,
            exportName: "DiagnosticsDiPage",
            routePath: "/di",
        },
        {
                code: "di-token-not-registered",
                severity: "error",
                message:
                    'Class "InjectedWidget" injects "MissingApi" with mainz/di, ' +
                    "but that token is not registered in app startup services.",
            file,
            exportName: "InjectedWidget",
        },
        {
            code: "di-registration-cycle",
            severity: "error",
            message: 'Service registration cycle detected: CycleA -> CycleB -> CycleA.',
            file,
            exportName: "CycleA",
        },
    ]));
});

function normalizeDiagnostics<T>(diagnostics: readonly T[]): T[] {
    return JSON.parse(JSON.stringify(diagnostics)) as T[];
}

function sortDiagnostics<
    T extends { code: string; exportName: string; routePath?: string },
>(diagnostics: readonly T[]): T[] {
    return [...diagnostics].sort((a, b) => {
        if (a.code !== b.code) {
            return a.code.localeCompare(b.code);
        }

        if (a.exportName !== b.exportName) {
            return a.exportName.localeCompare(b.exportName);
        }

        return (a.routePath ?? "").localeCompare(b.routePath ?? "");
    });
}
