import type { RouteDiagnosticsPageInput } from "../routing/facts.ts";

export interface MainzDiagnostic {
  code: string;
  severity: "error" | "warning";
  message: string;
  file: string;
  exportName: string;
  routePath?: string;
  subject?: string;
}

export interface DiagnosticsSourceInput {
  file: string;
  source: string;
}

export interface DiagnosticsTargetContext {
  registeredPolicyNames?: readonly string[];
  routePathsByOwner: ReadonlyMap<string, string>;
  appId?: string;
}

export interface DiagnosticsTargetModel {
  pages: readonly RouteDiagnosticsPageInput[];
  sourceInputs: readonly DiagnosticsSourceInput[];
  context: DiagnosticsTargetContext;
}

export interface DiagnosticsTargetInput {
  pages: readonly RouteDiagnosticsPageInput[];
  sourceInputs: readonly DiagnosticsSourceInput[];
  registeredPolicyNames?: readonly string[];
  routePathsByOwner: ReadonlyMap<string, string>;
  appId?: string;
}

export interface DiagnosticsContributor {
  name: string;
  collect(model: DiagnosticsTargetModel): Promise<readonly MainzDiagnostic[]>;
}

export function createDiagnosticsTargetModel(
  input: DiagnosticsTargetInput,
): DiagnosticsTargetModel {
  return {
    pages: input.pages,
    sourceInputs: input.sourceInputs,
    context: {
      registeredPolicyNames: input.registeredPolicyNames,
      routePathsByOwner: input.routePathsByOwner,
      appId: input.appId,
    },
  };
}

export type DiagnosticsContributorInput = DiagnosticsTargetInput;
