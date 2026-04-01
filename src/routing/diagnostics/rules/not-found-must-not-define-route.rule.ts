import type { MainzDiagnostic, RouteDiagnosticsPageInput } from "../facts.ts";

export const notFoundMustNotDefineRouteDiagnosticCode = "not-found-must-not-define-route" as const;

export function collectNotFoundMustNotDefineRouteDiagnostics(
    page: RouteDiagnosticsPageInput,
): readonly MainzDiagnostic[] {
    if (page.page.notFound !== true || !page.page.declaredRoutePath) {
        return [];
    }

    return [{
        code: notFoundMustNotDefineRouteDiagnosticCode,
        severity: "error",
        message:
            `notFound page "${page.exportName}" must not define @Route(...). Register it only through defineApp({ notFound }).`,
        file: page.file,
        exportName: page.exportName,
        routePath: page.page.declaredRoutePath,
    }];
}
