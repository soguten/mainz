import type { MainzDiagnostic, RouteDiagnosticsPageInput } from "../facts.ts";

export const authorizationPolicyNotRegisteredPageDiagnosticCode =
    "authorization-policy-not-registered" as const;

export function collectPageAuthorizationPolicyDiagnostics(
    page: RouteDiagnosticsPageInput,
    context: { registeredPolicyNames?: ReadonlySet<string> },
): readonly MainzDiagnostic[] {
    const requiredPolicy = page.page.authorization?.requirement?.policy;
    if (
        !requiredPolicy ||
        !context.registeredPolicyNames ||
        context.registeredPolicyNames.has(requiredPolicy)
    ) {
        return [];
    }

    return [{
        code: authorizationPolicyNotRegisteredPageDiagnosticCode,
        severity: "error",
        message:
            `Page "${page.exportName}" references @Authorize({ policy: "${requiredPolicy}" }), ` +
            "but that policy name is not declared in app.authorization.policyNames.",
        file: page.file,
        exportName: page.exportName,
        routePath: page.page.path,
    }];
}
