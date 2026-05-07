import { commandDiagnosticsContributor } from "./commands/index.ts";
import { componentDiagnosticsContributor } from "./components/index.ts";
import { diDiagnosticsContributor } from "./di/index.ts";
import { routeDiagnosticsContributor } from "./routing/index.ts";
import type { DiagnosticsContributor } from "./core/target-model.ts";

export {
  commandDiagnosticsContributor,
  componentDiagnosticsContributor,
  diDiagnosticsContributor,
  routeDiagnosticsContributor,
};

export const diagnosticsContributors: readonly DiagnosticsContributor[] = [
  routeDiagnosticsContributor,
  componentDiagnosticsContributor,
  diDiagnosticsContributor,
  commandDiagnosticsContributor,
];
