import type { MainzDiagnostic, RouteDiagnosticsPageInput } from "../facts.ts";

export const pageAuthorizationSsgWarningDiagnosticCode =
  "page-authorization-ssg-warning" as const;

export function collectPageAuthorizationSsgDiagnostics(
  page: RouteDiagnosticsPageInput,
): readonly MainzDiagnostic[] {
  if (page.page.mode !== "ssg" || !page.page.authorization?.requirement) {
    return [];
  }

  return [{
    code: pageAuthorizationSsgWarningDiagnosticCode,
    severity: "warning",
    message:
      `Page "${page.exportName}" uses @Authorize(...) with @RenderMode("ssg"). ` +
      "Mainz treats this as declarative route metadata only; protected delivery must be enforced by the host, adapter, gateway, or proxy.",
    file: page.file,
    exportName: page.exportName,
    routePath: page.page.path,
  }];
}
