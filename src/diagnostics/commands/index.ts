import { runDiagnosticsRules } from "../core/pipeline.ts";
import type { DiagnosticsTargetModel } from "../core/target-model.ts";
import { collectDiagnosticsFromModel } from "../collect.ts";
import { createDiagnosticsTargetModel } from "../core/target-model.ts";
import { discoverCommandFacts } from "./discover.ts";
import type {
    CommandDiagnostic,
    CommandDiagnosticsContext,
    CommandRegistrationFact,
    CommandSourceDiagnosticsInput,
} from "./facts.ts";
import {
    appCommandDuplicateIdRule,
    createAppCommandDuplicateKey,
} from "./rules/app-command-duplicate-id.rule.ts";

export type {
    CommandDiagnostic,
    CommandDiagnosticCode,
    CommandDiagnosticsContext,
    CommandRegistrationFact,
    CommandSourceDiagnosticsInput,
} from "./facts.ts";
export { discoverCommandFacts } from "./discover.ts";
export {
    appCommandDuplicateIdDiagnosticCode,
    appCommandDuplicateIdRule,
} from "./rules/app-command-duplicate-id.rule.ts";

export const commandDiagnosticsContributor = {
    name: "commands",
    async collect(model: DiagnosticsTargetModel) {
        const registrations = await discoverCommandFacts(model.sourceInputs, {
            appId: model.context.appId,
        });
        return analyzeCommandDiagnostics(
            registrations,
            createCommandDiagnosticsContext(registrations),
        );
    },
};

export async function collectCommandDiagnostics(
    sourceInputs: readonly CommandSourceDiagnosticsInput[],
    options?: {
        appId?: string;
    },
): Promise<readonly CommandDiagnostic[]> {
    return await collectDiagnosticsFromModel(
        createDiagnosticsTargetModel({
            pages: [],
            sourceInputs,
            registeredPolicyNames: [],
            routePathsByOwner: new Map<string, string>(),
            appId: options?.appId,
        }),
        [commandDiagnosticsContributor],
    ) as readonly CommandDiagnostic[];
}

function createCommandDiagnosticsContext(
    registrations: readonly CommandRegistrationFact[],
): CommandDiagnosticsContext {
    const counts = new Map<string, number>();

    for (const registration of registrations) {
        const key = createAppCommandDuplicateKey(registration.appId, registration.commandId);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return {
        duplicateKeys: new Set(
            Array.from(counts.entries())
                .filter(([, count]) => count > 1)
                .map(([key]) => key),
        ),
    };
}

function analyzeCommandDiagnostics(
    registrations: readonly CommandRegistrationFact[],
    context: CommandDiagnosticsContext,
): CommandDiagnostic[] {
    return runDiagnosticsRules(registrations, [appCommandDuplicateIdRule], context);
}
