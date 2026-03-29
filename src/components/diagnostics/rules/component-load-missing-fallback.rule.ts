import type { DiagnosticsRule } from "../../../diagnostics/core/pipeline.ts";
import type { ComponentDiagnostic, ComponentDiagnosticsContext, ComponentFact } from "../facts.ts";

export const componentLoadMissingFallbackRuleCode = "component-load-missing-fallback" as const;

export const componentLoadMissingFallbackRule: DiagnosticsRule<ComponentFact, ComponentDiagnosticsContext, ComponentDiagnostic> = {
    code: componentLoadMissingFallbackRuleCode,
    run(component) {
        if (
            !component.hasLoad ||
            (component.renderStrategy !== "deferred" &&
                component.renderStrategy !== "client-only") ||
            component.hasFallback
        ) {
            return [];
        }

        return [{
            code: componentLoadMissingFallbackRuleCode,
            severity: "warning",
            message:
                `Component "${component.exportName}" declares load() with @RenderStrategy("${component.renderStrategy}") without a fallback. ` +
                "Add a fallback to make the component's async placeholder explicit.",
            file: component.file,
            exportName: component.exportName,
        }];
    },
};
