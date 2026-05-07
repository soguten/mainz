import type {
  MainzDiagnostic,
  RouteDiagnosticsPageInput,
  RoutePageFacts,
} from "../facts.ts";

export const pageRenderDataWithoutExplicitDataDiagnosticCode =
  "page-render-data-without-explicit-data" as const;

export function collectPageRenderDataWithoutExplicitDataDiagnostics(
  page: RouteDiagnosticsPageInput,
  facts: RoutePageFacts | undefined,
): readonly MainzDiagnostic[] {
  if (
    !facts?.hasRenderDataParameter ||
    !facts.staticMembers.hasInstanceLoadMember ||
    facts.hasExplicitDataContract ||
    facts.renderDataParameterTypeIsUnknown
  ) {
    return [];
  }

  return [{
    code: pageRenderDataWithoutExplicitDataDiagnosticCode,
    severity: "error",
    message:
      `Page "${page.exportName}" declares render(data) without an explicit Data generic on Page<Props, State, Data>. ` +
      "When Data is omitted, render(data) must accept unknown. Declare Data explicitly or change the parameter type to unknown.",
    file: page.file,
    exportName: page.exportName,
    routePath: page.page.path,
  }];
}
