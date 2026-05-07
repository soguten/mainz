import { normalizeLocaleTag } from "../../../i18n/core.ts";
import type { MainzDiagnostic, RouteDiagnosticsPageInput } from "../facts.ts";

export const invalidLocaleTagDiagnosticCode = "invalid-locale-tag" as const;

export function collectInvalidLocaleTagDiagnostics(
  page: RouteDiagnosticsPageInput,
): readonly MainzDiagnostic[] {
  const diagnostics: MainzDiagnostic[] = [];

  for (const locale of page.page.locales ?? []) {
    try {
      normalizeLocaleTag(locale);
    } catch (error) {
      diagnostics.push({
        code: invalidLocaleTagDiagnosticCode,
        severity: "error",
        // Keep locale-based subject formatting stable because suppression matching relies on it.
        subject: `locale=${locale}`,
        message:
          `Page "${page.exportName}" declares invalid locale "${locale}" in @Locales(...). ${
            toErrorMessage(error)
          }`,
        file: page.file,
        exportName: page.exportName,
        routePath: page.page.path,
      });
    }
  }

  return diagnostics;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
