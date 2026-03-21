export {
    collectRouteDiagnostics,
} from "./route-diagnostics.ts";

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
    collectComponentSourceDiagnostics,
} from "./component-diagnostics.ts";

import type { MainzDiagnostic as RouteDiagnostic } from "./route-diagnostics.ts";
import type { ComponentDiagnostic } from "./component-diagnostics.ts";

export type MainzDiagnostic = RouteDiagnostic | ComponentDiagnostic;
