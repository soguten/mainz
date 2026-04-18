import type { DiagnosticsRule } from "../../core/pipeline.ts";
import type { ComponentDiagnostic, ComponentDiagnosticsContext, ComponentFact } from "../facts.ts";

export const componentRenderDataWithoutLoadRuleCode = "component-render-data-without-load" as const;

export const componentRenderDataWithoutLoadRule: DiagnosticsRule<
    ComponentFact,
    ComponentDiagnosticsContext,
    ComponentDiagnostic
> = {
    code: componentRenderDataWithoutLoadRuleCode,
    run(component) {
        if (component.isAbstract || !component.hasRenderDataParameter || component.hasLoad) {
            return [];
        }

        return [{
            code: componentRenderDataWithoutLoadRuleCode,
            severity: "error",
            message:
                `Component "${component.exportName}" declares render(data) but does not declare load(). ` +
                "render(data) is only valid when lifecycle data is owned by load().",
            file: component.file,
            exportName: component.exportName,
        }];
    },
};
