import type { DiagnosticsRule } from "../../../diagnostics/core/pipeline.ts";
import type { ComponentDiagnostic, ComponentDiagnosticsContext, ComponentFact } from "../facts.ts";

export const componentPlaceholderWithoutLoadRuleCode =
    "component-placeholder-without-load" as const;

export const componentPlaceholderWithoutLoadRule: DiagnosticsRule<
    ComponentFact,
    ComponentDiagnosticsContext,
    ComponentDiagnostic
> = {
    code: componentPlaceholderWithoutLoadRuleCode,
    run(component) {
        if (
            component.isAbstract ||
            !component.hasPlaceholder ||
            component.hasLoad ||
            component.renderPolicy === "placeholder-in-ssg"
        ) {
            return [];
        }

        return [{
            code: componentPlaceholderWithoutLoadRuleCode,
            severity: "warning",
            message:
                `Component "${component.exportName}" declares placeholder() but does not declare load(). ` +
                "placeholder() should accompany async component loading or @RenderPolicy(\"placeholder-in-ssg\").",
            file: component.file,
            exportName: component.exportName,
        }];
    },
};
