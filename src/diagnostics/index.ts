export {
    collectRouteDiagnostics,
} from "./route-diagnostics.ts";
export {
    collectDiDiagnostics,
} from "./di-diagnostics.ts";

export type {
    DiDiagnostic,
    DiSourceDiagnosticsInput,
} from "./di-diagnostics.ts";
export type {
    MainzDiagnosticCode,
    MainzDiagnosticSeverity,
    RouteDiagnosticsPageInput,
} from "./route-diagnostics.ts";
export type {
    ComponentDiagnostic,
    ComponentSourceDiagnosticsInput,
} from "./component-diagnostics.ts";
export {
    collectComponentDiagnostics,
} from "./component-diagnostics.ts";

import type { MainzDiagnostic as RouteDiagnostic } from "./route-diagnostics.ts";
import type { ComponentDiagnostic } from "./component-diagnostics.ts";
import type { DiDiagnostic } from "./di-diagnostics.ts";

export type MainzDiagnostic = RouteDiagnostic | ComponentDiagnostic | DiDiagnostic;
