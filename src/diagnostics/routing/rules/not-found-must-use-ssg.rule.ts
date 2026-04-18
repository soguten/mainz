import type { MainzDiagnostic, RouteDiagnosticsPageInput } from "../facts.ts";

export const notFoundMustUseSsgDiagnosticCode = "not-found-must-use-ssg" as const;

export function collectNotFoundMustUseSsgDiagnostics(
    page: RouteDiagnosticsPageInput,
): readonly MainzDiagnostic[] {
    if (page.page.notFound !== true || page.page.mode === "ssg") {
        return [];
    }

    return [{
        code: notFoundMustUseSsgDiagnosticCode,
        severity: "error",
        message: `notFound page "${page.exportName}" must use @RenderMode("ssg").`,
        file: page.file,
        exportName: page.exportName,
        routePath: page.page.path,
    }];
}
