import type { DiagnosticsRule } from "../../core/pipeline.ts";
import type {
  ComponentDiagnostic,
  ComponentDiagnosticsContext,
  ComponentFact,
} from "../facts.ts";

export const componentPlaceholderInSsgMissingPlaceholderRuleCode =
  "component-placeholder-in-ssg-missing-placeholder" as const;

export const componentPlaceholderInSsgMissingPlaceholderRule: DiagnosticsRule<
  ComponentFact,
  ComponentDiagnosticsContext,
  ComponentDiagnostic
> = {
  code: componentPlaceholderInSsgMissingPlaceholderRuleCode,
  run(component) {
    if (
      component.renderPolicy !== "placeholder-in-ssg" ||
      component.hasPlaceholder
    ) {
      return [];
    }

    return [{
      code: componentPlaceholderInSsgMissingPlaceholderRuleCode,
      severity: "error",
      message:
        `Component "${component.exportName}" declares @RenderPolicy("placeholder-in-ssg") without a placeholder(). ` +
        `@RenderPolicy("placeholder-in-ssg") requires placeholder() so Mainz can emit placeholder output during SSG.`,
      file: component.file,
      exportName: component.exportName,
    }];
  },
};
