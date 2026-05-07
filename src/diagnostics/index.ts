export { collectRouteDiagnostics } from "./routing/index.ts";
export { collectDiDiagnostics } from "./di/index.ts";
export { collectCommandDiagnostics } from "./commands/index.ts";

export type { DiDiagnostic, DiSourceDiagnosticsInput } from "./di/index.ts";
export type {
  CommandDiagnostic,
  CommandSourceDiagnosticsInput,
} from "./commands/index.ts";
export type {
  MainzDiagnosticCode,
  MainzDiagnosticSeverity,
  RouteDiagnosticsPageInput,
} from "./routing/index.ts";
export type {
  ComponentDiagnostic,
  ComponentSourceDiagnosticsInput,
} from "./components/index.ts";
export { collectComponentDiagnostics } from "./components/index.ts";
export {
  collectDiagnosticsForTarget,
  collectDiagnosticsFromInput,
  collectDiagnosticsFromModel,
  collectTargetDiagnostics,
  collectTargetModelDiagnostics,
} from "./collect.ts";
export {
  collectDiagnosticsForConfig,
  formatDiagnosticsHuman,
  formatDiagnosticsJson,
  shouldFailDiagnostics,
} from "./command.ts";
export type {
  DiagnosticsContributor,
  DiagnosticsContributorInput,
  DiagnosticsSourceInput,
  DiagnosticsTargetInput,
} from "./core/target-model.ts";
export type {
  DiagnosticsTargetContext,
  DiagnosticsTargetModel,
  MainzDiagnostic,
} from "./core/target-model.ts";
export type { DiagnoseCommandOptions, TargetDiagnostic } from "./command.ts";
export { createDiagnosticsTargetModel } from "./core/target-model.ts";
export {
  commandDiagnosticsContributor,
  componentDiagnosticsContributor,
  diagnosticsContributors,
  diDiagnosticsContributor,
  routeDiagnosticsContributor,
} from "./contributors.ts";
