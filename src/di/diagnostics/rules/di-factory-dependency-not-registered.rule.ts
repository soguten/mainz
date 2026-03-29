import type { DiagnosticsRule } from "../../../diagnostics/core/pipeline.ts";
import type { DiDiagnostic, DiDiagnosticsContext, DiRegistrationFact } from "../facts.ts";

export const diFactoryDependencyNotRegisteredRuleCode =
    "di-factory-dependency-not-registered" as const;

export const diFactoryDependencyNotRegisteredRule: DiagnosticsRule<
    DiRegistrationFact,
    { registrationsByToken: ReadonlyMap<string, DiRegistrationFact> } & DiDiagnosticsContext,
    DiDiagnostic
> = {
    code: diFactoryDependencyNotRegisteredRuleCode,
    run(registration, context) {
        const diagnostics: DiDiagnostic[] = [];

        for (const dependency of registration.dependencies) {
            if (context.registrationsByToken.has(dependency.key)) {
                continue;
            }

            diagnostics.push({
                code: diFactoryDependencyNotRegisteredRuleCode,
                severity: "error",
                message:
                    `Service "${registration.token.name}" depends on "${dependency.name}" through get(...), ` +
                    "but that dependency is not registered in app startup services.",
                file: registration.file,
                exportName: registration.token.name,
            });
        }

        return diagnostics;
    },
};
