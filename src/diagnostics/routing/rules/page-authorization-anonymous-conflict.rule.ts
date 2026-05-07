import type { MainzDiagnostic, RouteDiagnosticsPageInput } from "../facts.ts";

export const pageAuthorizationAnonymousConflictDiagnosticCode =
  "page-authorization-anonymous-conflict" as const;

export function collectPageAuthorizationAnonymousConflictDiagnostics(
  page: RouteDiagnosticsPageInput,
): readonly MainzDiagnostic[] {
  if (
    page.page.authorization?.allowAnonymous !== true ||
    page.page.authorization.requirement === undefined
  ) {
    return [];
  }

  return [{
    code: pageAuthorizationAnonymousConflictDiagnosticCode,
    severity: "error",
    message:
      `Page "${page.exportName}" combines @AllowAnonymous() with @Authorize(...). ` +
      "@AllowAnonymous() cannot relax page authorization declared on the same page.",
    file: page.file,
    exportName: page.exportName,
    routePath: page.page.path,
  }];
}
