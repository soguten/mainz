import { runDiagnosticsRules } from "../../diagnostics/core/pipeline.ts";
import type { DiagnosticsTargetModel } from "../../diagnostics/core/target-model.ts";
import { discoverDiFacts } from "./discover.ts";
import type {
    DiDiagnostic,
    DiDiagnosticsContext,
    DiDiagnosticsFacts,
    DiRegistrationFact,
    DiSourceDiagnosticsInput,
} from "./facts.ts";
import { diServiceDependencyNotRegisteredRule } from "./rules/di-service-dependency-not-registered.rule.ts";
import { diRegistrationCycleRule } from "./rules/di-registration-cycle.rule.ts";
import { diTokenNotRegisteredRule } from "./rules/di-token-not-registered.rule.ts";
import { collectDiagnosticsFromModel } from "../../diagnostics/collect.ts";
import { createDiagnosticsTargetModel } from "../../diagnostics/core/target-model.ts";

export type {
    DiDiagnostic,
    DiDiagnosticCode,
    DiDiagnosticsContext,
    DiDiagnosticsFacts,
    DiInjectionFact,
    DiRegistrationCycleFact,
    DiRegistrationFact,
    DiSourceDiagnosticsInput,
    DiTokenReference,
} from "./facts.ts";
export { discoverDiFacts } from "./discover.ts";
export {
    diServiceDependencyNotRegisteredRule,
    diRegistrationCycleRule,
    diTokenNotRegisteredRule,
};

type DiDiagnosticsRuntimeContext = {
    registrationsByToken: ReadonlyMap<string, DiRegistrationFact>;
} & DiDiagnosticsContext;

export const diDiagnosticsContributor = {
    name: "di",
    async collect(model: DiagnosticsTargetModel) {
        const facts = await discoverDiFacts(model.sourceInputs, {
            appId: model.context.appId,
        });
        const context = createDiDiagnosticsContext(facts.registrations, {
            routePathsByOwner: model.context.routePathsByOwner,
        });
        return analyzeDiDiagnostics(facts, context);
    },
};

export async function collectDiDiagnostics(
    sourceInputs: readonly DiSourceDiagnosticsInput[],
    options?: {
        routePathsByOwner?: ReadonlyMap<string, string>;
    },
): Promise<readonly DiDiagnostic[]> {
    return await collectDiagnosticsFromModel(
        createDiagnosticsTargetModel({
            pages: [],
            sourceInputs,
            registeredPolicyNames: [],
            routePathsByOwner: options?.routePathsByOwner ?? new Map<string, string>(),
        }),
        [diDiagnosticsContributor],
    ) as readonly DiDiagnostic[];
}

function createDiDiagnosticsContext(
    registrations: readonly DiRegistrationFact[],
    options: { routePathsByOwner?: ReadonlyMap<string, string> } | undefined,
): DiDiagnosticsRuntimeContext {
    return {
        registrationsByToken: new Map(
            registrations.map((registration) => [registration.token.key, registration]),
        ),
        routePathsByOwner: options?.routePathsByOwner ?? new Map<string, string>(),
    };
}

function analyzeDiDiagnostics(
    facts: DiDiagnosticsFacts,
    context: DiDiagnosticsRuntimeContext,
): DiDiagnostic[] {
    return [
        ...runDiagnosticsRules(facts.injections, [diTokenNotRegisteredRule], context),
        ...runDiagnosticsRules(
            facts.registrations,
            [diServiceDependencyNotRegisteredRule],
            context,
        ),
        ...runDiagnosticsRules(facts.cycles, [diRegistrationCycleRule], context),
    ];
}
