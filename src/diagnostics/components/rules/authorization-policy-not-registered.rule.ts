import type { DiagnosticsRule } from "../../core/pipeline.ts";
import type {
  ComponentDiagnostic,
  ComponentDiagnosticsContext,
  ComponentFact,
} from "../facts.ts";

export const authorizationPolicyNotRegisteredComponentRuleCode =
  "authorization-policy-not-registered" as const;

export const authorizationPolicyNotRegisteredComponentRule: DiagnosticsRule<
  ComponentFact,
  ComponentDiagnosticsContext,
  ComponentDiagnostic
> = {
  code: authorizationPolicyNotRegisteredComponentRuleCode,
  run(component, context) {
    const policyName = component.authorizationPolicy?.trim();
    if (
      !policyName || !context.registeredPolicyNames ||
      context.registeredPolicyNames.has(policyName)
    ) {
      return [];
    }

    return [{
      code: authorizationPolicyNotRegisteredComponentRuleCode,
      severity: "error",
      message:
        `Component "${component.exportName}" references @Authorize({ policy: "${policyName}" }), ` +
        "but that policy name is not declared in app.authorization.policyNames.",
      file: component.file,
      exportName: component.exportName,
    }];
  },
};
