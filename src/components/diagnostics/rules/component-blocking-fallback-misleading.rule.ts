import type { DiagnosticsRule } from "../../../diagnostics/core/pipeline.ts";
import type { ComponentDiagnostic, ComponentDiagnosticsContext, ComponentFact } from "../facts.ts";

export const componentBlockingFallbackMisleadingRuleCode =
    "component-blocking-fallback-misleading" as const;

export const componentBlockingFallbackMisleadingRule: DiagnosticsRule<
    ComponentFact,
    ComponentDiagnosticsContext,
    ComponentDiagnostic
> = {
    code: componentBlockingFallbackMisleadingRuleCode,
    run(component) {
        if (
            !(component.hasLoad && component.renderStrategy === "blocking" && component.hasFallback)
        ) {
            return [];
        }

        return [{
            code: componentBlockingFallbackMisleadingRuleCode,
            severity: "warning",
            message:
                `Component "${component.exportName}" declares @RenderStrategy("blocking") with a fallback. ` +
                "Blocking components normally render resolved output instead of visible fallback UI, so this fallback may be misleading.",
            file: component.file,
            exportName: component.exportName,
        }];
    },
};
