import type { DiagnosticsRule } from "../../core/pipeline.ts";
import type {
    CommandDiagnostic,
    CommandDiagnosticsContext,
    CommandRegistrationFact,
} from "../facts.ts";
import { appCommandDuplicateIdDiagnosticCode } from "../facts.ts";

export { appCommandDuplicateIdDiagnosticCode } from "../facts.ts";

export const appCommandDuplicateIdRule: DiagnosticsRule<
    CommandRegistrationFact,
    CommandDiagnosticsContext,
    CommandDiagnostic
> = {
    code: appCommandDuplicateIdDiagnosticCode,
    run(fact, context) {
        const duplicateKey = createAppCommandDuplicateKey(fact.appId, fact.commandId);
        if (!context.duplicateKeys.has(duplicateKey)) {
            return [];
        }

        return [{
            code: appCommandDuplicateIdDiagnosticCode,
            severity: "error",
            message:
                `App "${fact.appId}" registers command id "${fact.commandId}" more than once. Command ids must be unique per app.`,
            file: fact.file,
            exportName: fact.exportName,
            subject: `commandId=${fact.commandId}`,
        }];
    },
};

export function createAppCommandDuplicateKey(appId: string, commandId: string): string {
    return `${appId}::${commandId}`;
}
