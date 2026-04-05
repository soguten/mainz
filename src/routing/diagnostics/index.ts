import type { DiagnosticsTargetModel } from "../../diagnostics/core/target-model.ts";
import type { MainzDiagnostic, RouteDiagnosticsPageInput } from "./facts.ts";
import { collectRoutePageFacts } from "./discover.ts";
import { collectDynamicSsgDiagnostics } from "./rules/dynamic-ssg.rule.ts";
import { collectPageLoadLifecycleDiagnostics } from "./rules/page-load-lifecycle.rule.ts";
import { collectPageMetadataDiagnostics } from "./rules/page-metadata.rule.ts";
import { collectDiagnosticsFromModel } from "../../diagnostics/collect.ts";
import { createDiagnosticsTargetModel } from "../../diagnostics/core/target-model.ts";

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
    const sourceInputs = await collectRouteSourceInputs(pages);
    const routePathsByOwner = new Map(
        pages.map((page) => [`${page.file}::${page.exportName}`, page.page.path]),
    );
    return await collectDiagnosticsFromModel(
        createDiagnosticsTargetModel({
            pages,
            sourceInputs,
            registeredPolicyNames: options?.registeredPolicyNames,
            routePathsByOwner,
        }),
        [routeDiagnosticsContributor],
    ) as readonly MainzDiagnostic[];
}

function createRoutingDiagnosticsContext(
    options: { registeredPolicyNames?: readonly string[] } | undefined,
): RoutingDiagnosticsContext {
    return {
        registeredPolicyNames: options?.registeredPolicyNames !== undefined
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
            ...collectPageLoadLifecycleDiagnostics(
                page,
                facts.pageFactsByPage.get(`${page.file}::${page.exportName}`),
            ),
        );
        diagnostics.push(
            ...collectDynamicSsgDiagnostics(
                page,
                facts.pageFactsByPage.get(`${page.file}::${page.exportName}`),
            ),
        );
    }

    return diagnostics;
}

async function collectRouteSourceInputs(
    pages: readonly RouteDiagnosticsPageInput[],
): Promise<readonly { file: string; source: string }[]> {
    const uniqueFiles = [...new Set(pages.map((page) => page.file))];
    const sourceInputs: { file: string; source: string }[] = [];

    for (const file of uniqueFiles) {
        sourceInputs.push({
            file,
            source: await Deno.readTextFile(file),
        });
    }

    return sourceInputs;
}
