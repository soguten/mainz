import type { MainzDiagnostic, RouteDiagnosticsPageInput } from "../facts.ts";

export const multipleNotFoundPagesDiagnosticCode =
  "multiple-not-found-pages" as const;

export function collectMultipleNotFoundPagesDiagnostics(
  pages: readonly RouteDiagnosticsPageInput[],
): readonly MainzDiagnostic[] {
  const notFoundPages = pages.filter((page) => page.page.notFound === true);
  if (notFoundPages.length <= 1) {
    return [];
  }

  return notFoundPages.map((page) => ({
    code: multipleNotFoundPagesDiagnosticCode,
    severity: "error" as const,
    message:
      `Only one notFound page may be declared per routing set. "${page.exportName}" conflicts with other notFound pages.`,
    file: page.file,
    exportName: page.exportName,
    routePath: page.page.path,
  }));
}
