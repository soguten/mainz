import {
    collectPageAuthorizationAnonymousConflictDiagnostics,
} from "./page-authorization-anonymous-conflict.rule.ts";
import { collectPageAuthorizationPolicyDiagnostics } from "./authorization-policy-not-registered.rule.ts";
import { collectPageAuthorizationSsgDiagnostics } from "./page-authorization-ssg-warning.rule.ts";
import type { MainzDiagnostic, RouteDiagnosticsPageInput } from "../facts.ts";
import { collectInvalidLocaleTagDiagnostics } from "./invalid-locale-tag.rule.ts";
import { collectMultipleNotFoundPagesDiagnostics } from "./multiple-not-found-pages.rule.ts";
import { collectNotFoundMustUseSsgDiagnostics } from "./not-found-must-use-ssg.rule.ts";

export function collectPageMetadataDiagnostics(
    pages: readonly RouteDiagnosticsPageInput[],
    options?: {
        registeredPolicyNames?: readonly string[];
    },
): readonly MainzDiagnostic[] {
    const diagnostics: MainzDiagnostic[] = [];
    const registeredPolicies = options?.registeredPolicyNames
        ? new Set(options.registeredPolicyNames)
        : undefined;
    diagnostics.push(...collectMultipleNotFoundPagesDiagnostics(pages));

    for (const page of pages) {
        diagnostics.push(...collectInvalidLocaleTagDiagnostics(page));
        diagnostics.push(...collectNotFoundMustUseSsgDiagnostics(page));
        diagnostics.push(...collectPageAuthorizationAnonymousConflictDiagnostics(page));
        diagnostics.push(
            ...collectPageAuthorizationPolicyDiagnostics(
                page,
                {
                    registeredPolicyNames: registeredPolicies,
                },
            ),
        );
        diagnostics.push(...collectPageAuthorizationSsgDiagnostics(page));
    }

    return diagnostics;
}
