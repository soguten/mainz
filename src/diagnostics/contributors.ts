import { commandDiagnosticsContributor } from "../commands/diagnostics/index.ts";
import { componentDiagnosticsContributor } from "../components/diagnostics/index.ts";
import { diDiagnosticsContributor } from "../di/diagnostics/index.ts";
import { routeDiagnosticsContributor } from "../routing/diagnostics/index.ts";
import type { DiagnosticsContributor } from "./core/target-model.ts";

export {
    commandDiagnosticsContributor,
    componentDiagnosticsContributor,
    diDiagnosticsContributor,
    routeDiagnosticsContributor,
};

export const diagnosticsContributors = [
    routeDiagnosticsContributor,
    componentDiagnosticsContributor,
    diDiagnosticsContributor,
    commandDiagnosticsContributor,
] as const satisfies readonly DiagnosticsContributor[];
