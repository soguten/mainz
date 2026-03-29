import type { DiagnosticsTargetModel } from "../../diagnostics/core/target-model.ts";
import type { MainzDiagnostic, RouteDiagnosticsPageInput } from "./facts.ts";
import { collectRoutePageFacts } from "./discover.ts";
import { collectDynamicSsgDiagnostics } from "./rules/dynamic-ssg.rule.ts";
import { collectPageMetadataDiagnostics } from "./rules/page-metadata.rule.ts";

export type {
    MainzDiagnostic,
    MainzDiagnosticCode,
    MainzDiagnosticSeverity,
    RouteDiagnosticsPageInput,
    RouteEntryDefinition,
    RoutePageFacts,
} from "./facts.ts";
export { pageDiscoveryFailedDiagnosticCode } from "./facts.ts";
export { invalidLocaleTagDiagnosticCode } from "./rules/invalid-locale-tag.rule.ts";

type RoutingDiagnosticsFacts = {
    pages: readonly RouteDiagnosticsPageInput[];
    pageFactsByPage: ReadonlyMap<string, import("./facts.ts").RoutePageFacts>;
};

type RoutingDiagnosticsContext = {
    registeredPolicyNames?: ReadonlySet<string>;
};

export const routeDiagnosticsContributor = {
    name: "routing",
    async collect(model: DiagnosticsTargetModel) {
        return analyzeRouteDiagnostics(
            {
                pages: model.pages,
                pageFactsByPage: await collectRoutePageFacts(model.pages),
            },
            createRoutingDiagnosticsContext({
                registeredPolicyNames: model.context.registeredPolicyNames,
            }),
        );
    },
};

export async function collectRouteDiagnostics(
    pages: readonly RouteDiagnosticsPageInput[],
    options?: {
        registeredPolicyNames?: readonly string[];
    },
): Promise<readonly MainzDiagnostic[]> {
    return analyzeRouteDiagnostics(
        {
            pages,
            pageFactsByPage: await collectRoutePageFacts(pages),
        },
        createRoutingDiagnosticsContext(options),
    );
}

function createRoutingDiagnosticsContext(
    options: { registeredPolicyNames?: readonly string[] } | undefined,
): RoutingDiagnosticsContext {
    return {
        registeredPolicyNames: options?.registeredPolicyNames
            ? new Set(options.registeredPolicyNames)
            : undefined,
    };
}

function analyzeRouteDiagnostics(
    facts: RoutingDiagnosticsFacts,
    context: RoutingDiagnosticsContext,
): MainzDiagnostic[] {
    const diagnostics = [
        ...collectPageMetadataDiagnostics(facts.pages, {
            registeredPolicyNames: context.registeredPolicyNames
                ? [...context.registeredPolicyNames]
                : undefined,
        }),
    ];

    for (const page of facts.pages) {
        diagnostics.push(
            ...collectDynamicSsgDiagnostics(
                page,
                facts.pageFactsByPage.get(`${page.file}::${page.exportName}`),
            ),
        );
    }

    return diagnostics;
}
