import {
  isDynamicRoutePath,
  validateRouteEntryParams,
} from "../../../routing/index.ts";
import type {
  MainzDiagnostic,
  RouteDiagnosticsPageInput,
  RouteEntriesEvaluationFact,
  RoutePageFacts,
} from "../facts.ts";

export const dynamicSsgInvalidEntriesDiagnosticCode =
  "dynamic-ssg-invalid-entries" as const;

export function collectDynamicSsgInvalidEntriesDiagnostics(
  page: RouteDiagnosticsPageInput,
  facts: RoutePageFacts | undefined,
): {
  diagnostics: readonly MainzDiagnostic[];
  hasInvalidEntries: boolean;
} {
  if (page.page.mode !== "ssg" || !isDynamicRoutePath(page.page.path)) {
    return {
      diagnostics: [],
      hasInvalidEntries: false,
    };
  }

  const entriesFact = facts?.entriesFact;
  if (!entriesFact?.evaluation) {
    return {
      diagnostics: [],
      hasInvalidEntries: false,
    };
  }

  const diagnostics: MainzDiagnostic[] = [];
  const locales = page.page.locales?.length ? page.page.locales : [undefined];
  const entriesEvaluation = entriesFact.evaluation;

  if (entriesEvaluation.kind === "non-array") {
    diagnostics.push({
      code: dynamicSsgInvalidEntriesDiagnosticCode,
      severity: "error",
      message:
        `entries() for dynamic SSG route "${page.page.path}" returned a non-array result. Expected an array of entry definitions.`,
      file: page.file,
      exportName: page.exportName,
      routePath: page.page.path,
    });
    return {
      diagnostics,
      hasInvalidEntries: true,
    };
  }

  if (entriesEvaluation.kind !== "array") {
    return {
      diagnostics,
      hasInvalidEntries: false,
    };
  }

  return collectArrayEntriesDiagnostics(
    page,
    entriesEvaluation,
    locales,
    diagnostics,
  );
}

function collectArrayEntriesDiagnostics(
  page: RouteDiagnosticsPageInput,
  entriesEvaluation: Extract<RouteEntriesEvaluationFact, { kind: "array" }>,
  locales: readonly (string | undefined)[],
  diagnostics: MainzDiagnostic[],
): {
  diagnostics: readonly MainzDiagnostic[];
  hasInvalidEntries: boolean;
} {
  for (const locale of locales) {
    for (const [entryIndex, entry] of entriesEvaluation.entries.entries()) {
      try {
        validateRouteEntryParams(page.page.path, entry.params);
      } catch (error) {
        const subject = locale
          ? `entry=${entryIndex};locale=${locale}`
          : `entry=${entryIndex}`;
        diagnostics.push({
          code: dynamicSsgInvalidEntriesDiagnosticCode,
          severity: "error",
          // Keep entry-based subject formatting stable because suppression matching relies on it.
          subject,
          message:
            `entries() for dynamic SSG route "${page.page.path}" returned an invalid entry at index ${entryIndex}${
              locale ? ` for locale "${locale}"` : ""
            }: ${toErrorMessage(error)}`,
          file: page.file,
          exportName: page.exportName,
          routePath: page.page.path,
        });
      }
    }
  }

  return {
    diagnostics,
    hasInvalidEntries: diagnostics.length > 0,
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
