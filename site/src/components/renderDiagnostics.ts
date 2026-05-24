import type { RouteGenerationMetadata } from "./RenderDiagnosticsPanel.tsx";

export function createRouteDiagnosticsFallback(args: {
  renderMode: "csr" | "ssg" | "ssr";
  routePath: string;
  renderPath: string;
  locale?: string;
}): Partial<RouteGenerationMetadata> {
  return {
    routeRenderMode: args.renderMode,
    documentRenderMode: args.renderMode,
    routePath: args.routePath,
    renderPath: args.renderPath,
    locale: args.locale,
  };
}
