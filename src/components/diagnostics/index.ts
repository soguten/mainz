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
    const facts = await discoverComponentFacts(sourceInputs);
    const diagnostics = analyzeComponentDiagnostics(
        facts,
        createComponentDiagnosticsContext(options),
    );
    return diagnostics.sort(compareComponentDiagnostics);
}

function createComponentDiagnosticsContext(
    options: { registeredPolicyNames?: readonly string[] } | undefined,
): ComponentDiagnosticsContext {
    return {
        registeredPolicyNames: options?.registeredPolicyNames
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

function compareComponentDiagnostics(a: ComponentDiagnostic, b: ComponentDiagnostic): number {
    if (a.severity !== b.severity) {
        return a.severity.localeCompare(b.severity);
    }

    if (a.code !== b.code) {
        return a.code.localeCompare(b.code);
    }

    if (a.file !== b.file) {
        return a.file.localeCompare(b.file);
    }

    return a.exportName.localeCompare(b.exportName);
}
