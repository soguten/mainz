import { isDynamicRoutePath } from "../../index.ts";
import type { MainzDiagnostic, RouteDiagnosticsPageInput, RoutePageFacts } from "../facts.ts";

export const dynamicSsgMissingLoadDiagnosticCode = "dynamic-ssg-missing-load" as const;

export function collectDynamicSsgMissingLoadDiagnostics(
    page: RouteDiagnosticsPageInput,
    facts: RoutePageFacts | undefined,
    options?: {
        hasInvalidEntries?: boolean;
    },
): readonly MainzDiagnostic[] {
    if (page.page.mode !== "ssg" || !isDynamicRoutePath(page.page.path)) {
        return [];
    }

    if (options?.hasInvalidEntries) {
        return [];
    }

    const staticMembers = facts?.staticMembers ?? {
        hasEntriesMember: false,
        hasStaticLoadMember: false,
        hasInstanceLoadMember: false,
    };
    const entriesFact = facts?.entriesFact ?? {
        hasEntriesMember: staticMembers.hasEntriesMember,
    };

    if (
        !entriesFact.hasEntriesMember ||
        staticMembers.hasStaticLoadMember ||
        staticMembers.hasInstanceLoadMember
    ) {
        return [];
    }

    return [{
        code: dynamicSsgMissingLoadDiagnosticCode,
        severity: "warning",
        message:
            `Dynamic SSG route "${page.page.path}" defines entries() but no instance page load(). This is valid when route params are sufficient to render, but consider load.byParam(...) or load.byParams(...) if the page repeats route lookups.`,
        file: page.file,
        exportName: page.exportName,
        routePath: page.page.path,
    }];
}
