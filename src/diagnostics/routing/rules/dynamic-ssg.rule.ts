import type {
  MainzDiagnostic,
  RouteDiagnosticsPageInput,
  RoutePageFacts,
} from "../facts.ts";
import { collectDynamicSsgInvalidEntriesDiagnostics } from "./dynamic-ssg-invalid-entries.rule.ts";
import { collectDynamicSsgMissingEntriesDiagnostics } from "./dynamic-ssg-missing-entries.rule.ts";
import { collectDynamicSsgMissingLoadDiagnostics } from "./dynamic-ssg-missing-load.rule.ts";

export function collectDynamicSsgDiagnostics(
  page: RouteDiagnosticsPageInput,
  facts: RoutePageFacts | undefined,
): readonly MainzDiagnostic[] {
  const missingEntriesDiagnostics = collectDynamicSsgMissingEntriesDiagnostics(
    page,
    facts,
  );
  if (missingEntriesDiagnostics.length > 0) {
    return missingEntriesDiagnostics;
  }

  const invalidEntries = collectDynamicSsgInvalidEntriesDiagnostics(
    page,
    facts,
  );

  return [
    ...invalidEntries.diagnostics,
    ...collectDynamicSsgMissingLoadDiagnostics(page, facts, {
      hasInvalidEntries: invalidEntries.hasInvalidEntries,
    }),
  ];
}
