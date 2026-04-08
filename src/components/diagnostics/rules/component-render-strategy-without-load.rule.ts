import type { DiagnosticsRule } from "../../../diagnostics/core/pipeline.ts";
import type { ComponentDiagnostic, ComponentDiagnosticsContext, ComponentFact } from "../facts.ts";

export const componentRenderStrategyWithoutLoadRuleCode =
    "component-render-strategy-without-load" as const;

export const componentRenderStrategyWithoutLoadRule: DiagnosticsRule<
    ComponentFact,
    ComponentDiagnosticsContext,
    ComponentDiagnostic
> = {
    code: componentRenderStrategyWithoutLoadRuleCode,
    run(component) {
        if (component.isAbstract || component.hasLoad || !component.hasExplicitRenderStrategy) {
            return [];
        }

        if (component.renderStrategy === "blocking") {
            return [{
                code: componentRenderStrategyWithoutLoadRuleCode,
                severity: "warning",
                message:
                    `Component "${component.exportName}" declares @RenderStrategy("blocking") but does not declare load(). ` +
                    '@RenderStrategy("blocking") is allowed on synchronous components, but it is redundant because blocking is already the default.',
                file: component.file,
                exportName: component.exportName,
            }];
        }

        return [{
            code: componentRenderStrategyWithoutLoadRuleCode,
            severity: "warning",
            message:
                `Component "${component.exportName}" declares @RenderStrategy("${component.renderStrategy}") but does not declare load(). ` +
                `@RenderStrategy("${component.renderStrategy}") requires load() to participate in async component rendering.`,
            file: component.file,
            exportName: component.exportName,
        }];
    },
};
