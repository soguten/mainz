import type { MainzDiagnostic, RouteDiagnosticsPageInput, RoutePageFacts } from "../facts.ts";

export const pageRenderDataWithoutLoadDiagnosticCode = "page-render-data-without-load" as const;

export function collectPageRenderDataWithoutLoadDiagnostics(
    page: RouteDiagnosticsPageInput,
    facts: RoutePageFacts | undefined,
): readonly MainzDiagnostic[] {
    if (!facts?.hasRenderDataParameter || facts.staticMembers.hasInstanceLoadMember) {
        return [];
    }

    return [{
        code: pageRenderDataWithoutLoadDiagnosticCode,
        severity: "error",
        message: `Page "${page.exportName}" declares render(data) but does not declare load(). ` +
            "render(data) is only valid when page lifecycle data is owned by load().",
        file: page.file,
        exportName: page.exportName,
        routePath: page.page.path,
    }];
}
