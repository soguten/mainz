import type { DiagnosticsRule } from "../../core/pipeline.ts";
import type {
  DiDiagnostic,
  DiDiagnosticsContext,
  DiRegistrationCycleFact,
} from "../facts.ts";

export const diRegistrationCycleRuleCode = "di-registration-cycle" as const;

export const diRegistrationCycleRule: DiagnosticsRule<
  DiRegistrationCycleFact,
  DiDiagnosticsContext,
  DiDiagnostic
> = {
  code: diRegistrationCycleRuleCode,
  run(cycleFact) {
    return [{
      code: diRegistrationCycleRuleCode,
      severity: "error",
      message: `Service registration cycle detected: ${
        cycleFact.cycle.map((token) => token.name).join(" -> ")
      }.`,
      file: cycleFact.file,
      exportName: cycleFact.exportName,
    }];
  },
};
