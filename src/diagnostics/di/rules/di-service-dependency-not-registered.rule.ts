import type { DiagnosticsRule } from "../../core/pipeline.ts";
import type { DiDiagnostic, DiDiagnosticsContext, DiRegistrationFact } from "../facts.ts";

export const diServiceDependencyNotRegisteredRuleCode =
    "di-service-dependency-not-registered" as const;

export const diServiceDependencyNotRegisteredRule: DiagnosticsRule<
    DiRegistrationFact,
    { registrationsByToken: ReadonlyMap<string, DiRegistrationFact> } & DiDiagnosticsContext,
    DiDiagnostic
> = {
    code: diServiceDependencyNotRegisteredRuleCode,
    run(registration, context) {
        const diagnostics: DiDiagnostic[] = [];

        for (const dependency of registration.dependencies) {
            if (context.registrationsByToken.has(dependency.key)) {
                continue;
            }

            diagnostics.push({
                code: diServiceDependencyNotRegisteredRuleCode,
                severity: "error",
                // Keep dependency-based subject formatting stable because suppression matching relies on it.
                subject: `dependency=${dependency.name}`,
                message:
                    `Service "${registration.token.name}" depends on "${dependency.name}" in its registered service graph, ` +
                    "but that dependency is not registered in app startup services.",
                file: registration.file,
                exportName: registration.token.name,
            });
        }

        return diagnostics;
    },
};
