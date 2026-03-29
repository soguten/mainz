import type { DiagnosticsRule } from "../../../diagnostics/core/pipeline.ts";
import type { ComponentDiagnostic, ComponentDiagnosticsContext, ComponentFact } from "../facts.ts";

export const componentRenderStrategyWithoutLoadRuleCode =
    "component-render-strategy-without-load" as const;

export const componentRenderStrategyWithoutLoadRule: DiagnosticsRule<ComponentFact, ComponentDiagnosticsContext, ComponentDiagnostic> = {
    code: componentRenderStrategyWithoutLoadRuleCode,
    run(component) {
        if (component.isAbstract || component.hasLoad || !component.renderStrategy) {
            return [];
        }

        return [{
            code: componentRenderStrategyWithoutLoadRuleCode,
            severity: "warning",
            message:
                `Component "${component.exportName}" declares @RenderStrategy("${component.renderStrategy}") but does not declare load(). ` +
                "@RenderStrategy(...) only affects Component.load() and has no effect on synchronous components.",
            file: component.file,
            exportName: component.exportName,
        }];
    },
};
