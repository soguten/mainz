import { runDiagnosticsRules } from "../../diagnostics/core/pipeline.ts";
import type { DiagnosticsTargetModel } from "../../diagnostics/core/target-model.ts";
import { discoverComponentFacts } from "./discover.ts";
import type {
    ComponentDiagnostic,
    ComponentDiagnosticsContext,
    ComponentSourceDiagnosticsInput,
} from "./facts.ts";
import { authorizationPolicyNotRegisteredComponentRule } from "./rules/authorization-policy-not-registered.rule.ts";
import { componentAllowAnonymousNotSupportedRule } from "./rules/component-allow-anonymous-not-supported.rule.ts";
import { componentAuthorizationSsgWarningRule } from "./rules/component-authorization-ssg-warning.rule.ts";
import { componentBlockingFallbackMisleadingRule } from "./rules/component-blocking-fallback-misleading.rule.ts";
import { componentLoadMissingFallbackRule } from "./rules/component-load-missing-fallback.rule.ts";
import { componentRenderStrategyWithoutLoadRule } from "./rules/component-render-strategy-without-load.rule.ts";
import { collectDiagnosticsFromModel } from "../../diagnostics/collect.ts";
import { createDiagnosticsTargetModel } from "../../diagnostics/core/target-model.ts";

export type {
    ComponentDiagnostic,
    ComponentDiagnosticCode,
    ComponentDiagnosticsContext,
    ComponentFact,
    ComponentRenderStrategy,
    ComponentSourceDiagnosticsInput,
} from "./facts.ts";
export { discoverComponentFacts } from "./discover.ts";
export {
    authorizationPolicyNotRegisteredComponentRule,
    componentAllowAnonymousNotSupportedRule,
    componentAuthorizationSsgWarningRule,
    componentBlockingFallbackMisleadingRule,
    componentLoadMissingFallbackRule,
    componentRenderStrategyWithoutLoadRule,
};

const componentDiagnosticsRules = [
    componentRenderStrategyWithoutLoadRule,
    componentAllowAnonymousNotSupportedRule,
    componentAuthorizationSsgWarningRule,
    authorizationPolicyNotRegisteredComponentRule,
    componentLoadMissingFallbackRule,
    componentBlockingFallbackMisleadingRule,
] as const;
export const componentDiagnosticsContributor = {
    name: "components",
    async collect(model: DiagnosticsTargetModel) {
        const facts = await discoverComponentFacts(model.sourceInputs);
        return analyzeComponentDiagnostics(
            facts,
            createComponentDiagnosticsContext({
                registeredPolicyNames: model.context.registeredPolicyNames,
            }),
        );
    },
};

export async function collectComponentDiagnostics(
    sourceInputs: readonly ComponentSourceDiagnosticsInput[],
    options?: {
        registeredPolicyNames?: readonly string[];
    },
): Promise<readonly ComponentDiagnostic[]> {
    return await collectDiagnosticsFromModel(
        createDiagnosticsTargetModel({
            pages: [],
            sourceInputs,
            registeredPolicyNames: options?.registeredPolicyNames,
            routePathsByOwner: new Map<string, string>(),
        }),
        [componentDiagnosticsContributor],
    ) as readonly ComponentDiagnostic[];
}

function createComponentDiagnosticsContext(
    options: { registeredPolicyNames?: readonly string[] } | undefined,
): ComponentDiagnosticsContext {
    return {
        registeredPolicyNames: options?.registeredPolicyNames !== undefined
            ? new Set(options.registeredPolicyNames)
            : undefined,
    };
}

function analyzeComponentDiagnostics(
    facts: readonly import("./facts.ts").ComponentFact[],
    context: ComponentDiagnosticsContext,
): ComponentDiagnostic[] {
    return runDiagnosticsRules(
        facts,
        componentDiagnosticsRules,
        context,
    );
}
