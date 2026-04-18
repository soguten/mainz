import type { MainzDiagnostic, RouteDiagnosticsPageInput, RoutePageFacts } from "../facts.ts";
import { collectPageRenderDataWithoutExplicitDataDiagnostics } from "./page-render-data-without-explicit-data.rule.ts";
import { collectPageRenderDataWithoutLoadDiagnostics } from "./page-render-data-without-load.rule.ts";
import { collectPageStaticLoadUnsupportedDiagnostics } from "./page-static-load-unsupported.rule.ts";

export function collectPageLoadLifecycleDiagnostics(
    page: RouteDiagnosticsPageInput,
    facts: RoutePageFacts | undefined,
): readonly MainzDiagnostic[] {
    return [
        ...collectPageStaticLoadUnsupportedDiagnostics(page, facts),
        ...collectPageRenderDataWithoutLoadDiagnostics(page, facts),
        ...collectPageRenderDataWithoutExplicitDataDiagnostics(page, facts),
    ];
}
