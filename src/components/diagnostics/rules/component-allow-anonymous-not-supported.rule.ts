import type { DiagnosticsRule } from "../../../diagnostics/core/pipeline.ts";
import type { ComponentDiagnostic, ComponentDiagnosticsContext, ComponentFact } from "../facts.ts";

export const componentAllowAnonymousNotSupportedRuleCode =
    "component-allow-anonymous-not-supported" as const;

export const componentAllowAnonymousNotSupportedRule: DiagnosticsRule<ComponentFact, ComponentDiagnosticsContext, ComponentDiagnostic> = {
    code: componentAllowAnonymousNotSupportedRuleCode,
    run(component) {
        if (!component.hasAllowAnonymous) {
            return [];
        }

        return [{
            code: componentAllowAnonymousNotSupportedRuleCode,
            severity: "error",
            message: `Component "${component.exportName}" declares @AllowAnonymous(). ` +
                "@AllowAnonymous() is page-only; component authorization is always additive.",
            file: component.file,
            exportName: component.exportName,
        }];
    },
};
