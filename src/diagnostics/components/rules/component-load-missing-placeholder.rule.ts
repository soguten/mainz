import type { DiagnosticsRule } from "../../core/pipeline.ts";
import type {
  ComponentDiagnostic,
  ComponentDiagnosticsContext,
  ComponentFact,
} from "../facts.ts";

export const componentLoadMissingPlaceholderRuleCode =
  "component-load-missing-placeholder" as const;

export const componentLoadMissingPlaceholderRule: DiagnosticsRule<
  ComponentFact,
  ComponentDiagnosticsContext,
  ComponentDiagnostic
> = {
  code: componentLoadMissingPlaceholderRuleCode,
  run(component) {
    if (
      !component.hasLoad ||
      component.renderStrategy !== "defer" ||
      component.hasPlaceholder
    ) {
      return [];
    }

    return [{
      code: componentLoadMissingPlaceholderRuleCode,
      severity: "warning",
      message:
        `Component "${component.exportName}" declares load() with @RenderStrategy("${component.renderStrategy}") without a placeholder(). ` +
        "Add placeholder() to make the component's async placeholder explicit.",
      file: component.file,
      exportName: component.exportName,
    }];
  },
};
