import type { MainzDiagnostic } from "./target-model.ts";

export interface DiagnosticsRule<TFact, TContext, TDiagnostic> {
    code: string;
    run(fact: TFact, context: TContext): readonly TDiagnostic[];
}

export function runDiagnosticsRules<TFact, TContext, TDiagnostic>(
    facts: readonly TFact[],
    rules: readonly DiagnosticsRule<TFact, TContext, TDiagnostic>[],
    context: TContext,
): TDiagnostic[] {
    const diagnostics: TDiagnostic[] = [];

    for (const fact of facts) {
        for (const rule of rules) {
            diagnostics.push(...rule.run(fact, context));
        }
    }

    return diagnostics;
}

export type DomainDiagnostics<TModel> = {
    name: string;
    collect(model: TModel): Promise<readonly MainzDiagnostic[]>;
};
