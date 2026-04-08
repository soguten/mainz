import type { DiagnosticsRule } from "../../../diagnostics/core/pipeline.ts";
import type { ComponentDiagnostic, ComponentDiagnosticsContext, ComponentFact } from "../facts.ts";

export const componentRenderDataWithoutExplicitDataRuleCode =
    "component-render-data-without-explicit-data" as const;

export const componentRenderDataWithoutExplicitDataRule: DiagnosticsRule<
    ComponentFact,
    ComponentDiagnosticsContext,
    ComponentDiagnostic
> = {
    code: componentRenderDataWithoutExplicitDataRuleCode,
    run(component) {
        if (
            component.isAbstract ||
            !component.hasLoad ||
            !component.hasRenderDataParameter ||
            component.hasExplicitDataContract ||
            component.renderDataParameterTypeIsUnknown
        ) {
            return [];
        }

        return [{
            code: componentRenderDataWithoutExplicitDataRuleCode,
            severity: "error",
            message:
                `Component "${component.exportName}" declares render(data) without an explicit Data generic on Component<Props, State, Data>. ` +
                "When Data is omitted, render(data) must accept unknown. Declare Data explicitly or change the parameter type to unknown.",
            file: component.file,
            exportName: component.exportName,
        }];
    },
};
