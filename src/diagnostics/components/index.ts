import { runDiagnosticsRules } from "../core/pipeline.ts";
import type {
  DiagnosticsContributor,
  DiagnosticsTargetModel,
} from "../core/target-model.ts";
import { discoverComponentFacts } from "./discover.ts";
import type {
  ComponentDiagnostic,
  ComponentDiagnosticsContext,
  ComponentSourceDiagnosticsInput,
} from "./facts.ts";
import { authorizationPolicyNotRegisteredComponentRule } from "./rules/authorization-policy-not-registered.rule.ts";
import { componentAllowAnonymousNotSupportedRule } from "./rules/component-allow-anonymous-not-supported.rule.ts";
import { componentAuthorizationSsgWarningRule } from "./rules/component-authorization-ssg-warning.rule.ts";
import { componentBlockingPlaceholderConflictRule } from "./rules/component-blocking-placeholder-conflict.rule.ts";
import { componentErrorWithoutLoadRule } from "./rules/component-error-without-load.rule.ts";
import { componentLoadMissingPlaceholderRule } from "./rules/component-load-missing-placeholder.rule.ts";
import { componentRenderDataWithoutExplicitDataRule } from "./rules/component-render-data-without-explicit-data.rule.ts";
import { componentRenderDataWithoutLoadRule } from "./rules/component-render-data-without-load.rule.ts";
import { componentPlaceholderInSsgMissingPlaceholderRule } from "./rules/component-placeholder-in-ssg-missing-placeholder.rule.ts";
import { componentPlaceholderWithoutLoadRule } from "./rules/component-placeholder-without-load.rule.ts";
import { componentRenderStrategyWithoutLoadRule } from "./rules/component-render-strategy-without-load.rule.ts";
import { collectDiagnosticsFromModel } from "../collect.ts";
import { createDiagnosticsTargetModel } from "../core/target-model.ts";

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
  componentBlockingPlaceholderConflictRule,
  componentErrorWithoutLoadRule,
  componentLoadMissingPlaceholderRule,
  componentPlaceholderInSsgMissingPlaceholderRule,
  componentPlaceholderWithoutLoadRule,
  componentRenderDataWithoutExplicitDataRule,
  componentRenderDataWithoutLoadRule,
  componentRenderStrategyWithoutLoadRule,
};

const componentDiagnosticsRules = [
  componentRenderStrategyWithoutLoadRule,
  componentAllowAnonymousNotSupportedRule,
  componentAuthorizationSsgWarningRule,
  authorizationPolicyNotRegisteredComponentRule,
  componentRenderDataWithoutLoadRule,
  componentPlaceholderWithoutLoadRule,
  componentErrorWithoutLoadRule,
  componentPlaceholderInSsgMissingPlaceholderRule,
  componentLoadMissingPlaceholderRule,
  componentRenderDataWithoutExplicitDataRule,
  componentBlockingPlaceholderConflictRule,
] as const;
export const componentDiagnosticsContributor: DiagnosticsContributor = {
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
