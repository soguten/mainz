import type { MainzDiagnostic, RouteDiagnosticsPageInput, RoutePageFacts } from "../facts.ts";

export const pageStaticLoadUnsupportedDiagnosticCode = "page-static-load-unsupported" as const;

export function collectPageStaticLoadUnsupportedDiagnostics(
    page: RouteDiagnosticsPageInput,
    facts: RoutePageFacts | undefined,
): readonly MainzDiagnostic[] {
    if (!facts?.staticMembers.hasStaticLoadMember) {
        return [];
    }

    return [{
        code: pageStaticLoadUnsupportedDiagnosticCode,
        severity: "error",
        message:
            `Page "${page.exportName}" declares static load(), which is no longer supported. Move that logic into the page instance load() lifecycle.`,
        file: page.file,
        exportName: page.exportName,
        routePath: page.page.path,
    }];
}
