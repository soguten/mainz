import type { MainzDiagnostic, RouteDiagnosticsPageInput, RoutePageFacts } from "../facts.ts";
import { collectPageStaticLoadUnsupportedDiagnostics } from "./page-static-load-unsupported.rule.ts";

export function collectPageLoadLifecycleDiagnostics(
    page: RouteDiagnosticsPageInput,
    facts: RoutePageFacts | undefined,
): readonly MainzDiagnostic[] {
    return collectPageStaticLoadUnsupportedDiagnostics(page, facts);
}
