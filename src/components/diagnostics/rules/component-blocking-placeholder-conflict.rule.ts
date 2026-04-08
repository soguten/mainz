import type { DiagnosticsRule } from "../../../diagnostics/core/pipeline.ts";
import type { ComponentDiagnostic, ComponentDiagnosticsContext, ComponentFact } from "../facts.ts";

export const componentBlockingPlaceholderConflictRuleCode =
    "component-blocking-placeholder-conflict" as const;

export const componentBlockingPlaceholderConflictRule: DiagnosticsRule<
    ComponentFact,
    ComponentDiagnosticsContext,
    ComponentDiagnostic
> = {
    code: componentBlockingPlaceholderConflictRuleCode,
    run(component) {
        if (
            !(component.renderStrategy === "blocking" && component.hasPlaceholder &&
                component.renderPolicy !== "placeholder-in-ssg")
        ) {
            return [];
        }

        return [{
            code: componentBlockingPlaceholderConflictRuleCode,
            severity: "warning",
            message:
                `Component "${component.exportName}" declares @RenderStrategy("blocking") with a placeholder(). ` +
                "Blocking components normally render resolved output instead of visible placeholder UI, so this placeholder may be misleading unless it is only intended for @RenderPolicy(\"placeholder-in-ssg\").",
            file: component.file,
            exportName: component.exportName,
        }];
    },
};
