export { collectRouteDiagnostics } from "../routing/diagnostics/index.ts";
export { collectDiDiagnostics } from "../di/diagnostics/index.ts";

export type { DiDiagnostic, DiSourceDiagnosticsInput } from "../di/diagnostics/index.ts";
export type { MainzDiagnosticCode, MainzDiagnosticSeverity, RouteDiagnosticsPageInput } from "../routing/diagnostics/index.ts";
export type { ComponentDiagnostic, ComponentSourceDiagnosticsInput } from "../components/diagnostics/index.ts";
export { collectComponentDiagnostics } from "../components/diagnostics/index.ts";
export {
    collectDiagnosticsForTarget,
    collectDiagnosticsFromInput,
    collectDiagnosticsFromModel,
    collectTargetDiagnostics,
    collectTargetModelDiagnostics,
} from "./collect.ts";
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
export { createDiagnosticsTargetModel } from "./core/target-model.ts";
export {
    componentDiagnosticsContributor,
    diagnosticsContributors,
    diDiagnosticsContributor,
    routeDiagnosticsContributor,
} from "./contributors.ts";
