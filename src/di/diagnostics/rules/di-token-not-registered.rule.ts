import type { DiagnosticsRule } from "../../../diagnostics/core/pipeline.ts";
import type {
    DiDiagnostic,
    DiDiagnosticsContext,
    DiInjectionFact,
    DiRegistrationFact,
} from "../facts.ts";

export const diTokenNotRegisteredRuleCode = "di-token-not-registered" as const;

export const diTokenNotRegisteredRule: DiagnosticsRule<
    DiInjectionFact,
    { registrationsByToken: ReadonlyMap<string, DiRegistrationFact> } & DiDiagnosticsContext,
    DiDiagnostic
> = {
    code: diTokenNotRegisteredRuleCode,
    run(injection, context) {
        if (context.registrationsByToken.has(injection.token.key)) {
            return [];
        }

        return [{
            code: diTokenNotRegisteredRuleCode,
            severity: "error",
            message:
                `Class "${injection.exportName}" injects "${injection.token.name}" with mainz/di, ` +
                "but that token is not registered in app startup services.",
            file: injection.file,
            exportName: injection.exportName,
            routePath: context.routePathsByOwner.get(`${injection.file}::${injection.exportName}`),
        }];
    },
};
