/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { resolve } from "node:path";
import { collectDiDiagnostics } from "../index.ts";
import type { DiDiagnostic } from "../index.ts";

Deno.test("diagnostics/di: collector should report missing service tokens, missing registered service dependencies, and cycles", async () => {
    const file = resolve(
        Deno.cwd(),
        "src/diagnostics/di/tests/di-diagnostics.fixture.tsx",
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

    const expected: DiDiagnostic[] = [
        {
            code: "di-service-dependency-not-registered",
            severity: "error",
            subject: "dependency=MissingDependency",
            message:
                'Service "NeedsMissingDependency" depends on "MissingDependency" in its registered service graph, ' +
                "but that dependency is not registered in app startup services.",
            file,
            exportName: "NeedsMissingDependency",
        },
        {
            code: "di-token-not-registered",
            severity: "error",
            subject: "token=MissingApi",
            message: 'Class "DiagnosticsDiFixturePage" injects "MissingApi" with mainz/di, ' +
                "but that token is not registered in app startup services.",
            file,
            exportName: "DiagnosticsDiFixturePage",
            routePath: "/di",
        },
        {
            code: "di-token-not-registered",
            severity: "error",
            subject: "token=MissingApi",
            message: 'Class "InjectedWidget" injects "MissingApi" with mainz/di, ' +
                "but that token is not registered in app startup services.",
            file,
            exportName: "InjectedWidget",
        },
        {
            code: "di-registration-cycle",
            severity: "error",
            message: "Service registration cycle detected: CycleA -> CycleB -> CycleA.",
            file,
            exportName: "CycleA",
        },
    ];

    assertEquals(
        sortDiagnostics(normalizeDiagnostics(diagnostics)),
        sortDiagnostics(expected),
    );
});

Deno.test("diagnostics/di: collector should support subject-targeted suppression on exported owners", async () => {
    const file = resolve(
        Deno.cwd(),
        "src/diagnostics/di/tests/di-suppression.fixture.tsx",
    ).replaceAll("\\", "/");

    const diagnostics = await collectDiDiagnostics([
        {
            file,
            source: await Deno.readTextFile(file),
        },
    ]);

    const expected: DiDiagnostic[] = [
        {
            code: "di-token-not-registered",
            severity: "error",
            subject: "token=MissingApi",
            message: 'Class "UnsuppressedInjectedWidget" injects "MissingApi" with mainz/di, ' +
                "but that token is not registered in app startup services.",
            file,
            exportName: "UnsuppressedInjectedWidget",
        },
    ];

    assertEquals(
        sortDiagnostics(normalizeDiagnostics(diagnostics)),
        sortDiagnostics(expected),
    );
});

function normalizeDiagnostics<T>(diagnostics: readonly T[]): T[] {
    return JSON.parse(JSON.stringify(diagnostics)) as T[];
}

function sortDiagnostics<
    T extends { code: string; exportName: string; routePath?: string; subject?: string },
>(
    diagnostics: readonly T[],
): T[] {
    return [...diagnostics].sort((a, b) => {
        if (a.code !== b.code) {
            return a.code.localeCompare(b.code);
        }

        if (a.exportName !== b.exportName) {
            return a.exportName.localeCompare(b.exportName);
        }

        if ((a.routePath ?? "") !== (b.routePath ?? "")) {
            return (a.routePath ?? "").localeCompare(b.routePath ?? "");
        }

        return (a.subject ?? "").localeCompare(b.subject ?? "");
    });
}
