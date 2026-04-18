import { isDynamicRoutePath } from "../../../routing/index.ts";
import type { MainzDiagnostic, RouteDiagnosticsPageInput, RoutePageFacts } from "../facts.ts";

export const dynamicSsgMissingEntriesDiagnosticCode = "dynamic-ssg-missing-entries" as const;

export function collectDynamicSsgMissingEntriesDiagnostics(
    page: RouteDiagnosticsPageInput,
    facts: RoutePageFacts | undefined,
): readonly MainzDiagnostic[] {
    if (page.page.mode !== "ssg" || !isDynamicRoutePath(page.page.path)) {
        return [];
    }

    const entriesFact = facts?.entriesFact ?? {
        hasEntriesMember: false,
    };

    if (entriesFact.hasEntriesMember) {
        return [];
    }

    return [{
        code: dynamicSsgMissingEntriesDiagnosticCode,
        severity: "error",
        message: `SSG route "${page.page.path}" must define entries() to expand dynamic params.`,
        file: page.file,
        exportName: page.exportName,
        routePath: page.page.path,
    }];
}
