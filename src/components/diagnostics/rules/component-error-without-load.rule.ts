import type { DiagnosticsRule } from "../../../diagnostics/core/pipeline.ts";
import type { ComponentDiagnostic, ComponentDiagnosticsContext, ComponentFact } from "../facts.ts";

export const componentErrorWithoutLoadRuleCode =
    "component-error-without-load" as const;

export const componentErrorWithoutLoadRule: DiagnosticsRule<
    ComponentFact,
    ComponentDiagnosticsContext,
    ComponentDiagnostic
> = {
    code: componentErrorWithoutLoadRuleCode,
    run(component) {
        if (component.isAbstract || !component.hasError || component.hasLoad) {
            return [];
        }

        return [{
            code: componentErrorWithoutLoadRuleCode,
            severity: "warning",
            message:
                `Component "${component.exportName}" declares error(error) but does not declare load(). ` +
                "error(error) only participates when async component loading can reject.",
            file: component.file,
            exportName: component.exportName,
        }];
    },
};
