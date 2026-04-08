import type { DiagnosticsRule } from "../../../diagnostics/core/pipeline.ts";
import type { ComponentDiagnostic, ComponentDiagnosticsContext, ComponentFact } from "../facts.ts";

export const componentAuthorizationSsgWarningRuleCode =
    "component-authorization-ssg-warning" as const;

export const componentAuthorizationSsgWarningRule: DiagnosticsRule<
    ComponentFact,
    ComponentDiagnosticsContext,
    ComponentDiagnostic
> = {
    code: componentAuthorizationSsgWarningRuleCode,
    run(component) {
        if (!component.hasAuthorize) {
            return [];
        }

        return [{
            code: componentAuthorizationSsgWarningRuleCode,
            severity: "warning",
            message: `Component "${component.exportName}" declares @Authorize(...). ` +
                "Protected components cannot be rendered during SSG because shared prerender output must not include privileged content.",
            file: component.file,
            exportName: component.exportName,
        }];
    },
};
