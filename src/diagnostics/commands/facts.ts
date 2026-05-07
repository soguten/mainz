import {
  invalidDiagnosticSuppressionCode,
  unknownDiagnosticSuppressionCode,
  unusedDiagnosticSuppressionCode,
} from "../core/suppressions.ts";

export const appCommandDuplicateIdDiagnosticCode =
  "app-command-duplicate-id" as const;

export interface CommandSourceDiagnosticsInput {
  file: string;
  source: string;
}

export interface CommandRegistrationFact {
  appId: string;
  commandId: string;
  file: string;
  exportName: string;
}

export interface CommandDiagnosticsContext {
  duplicateKeys: ReadonlySet<string>;
}

export type CommandDiagnosticCode =
  | typeof appCommandDuplicateIdDiagnosticCode
  | typeof invalidDiagnosticSuppressionCode
  | typeof unknownDiagnosticSuppressionCode
  | typeof unusedDiagnosticSuppressionCode;

export interface CommandDiagnostic {
  code: CommandDiagnosticCode;
  severity: "error" | "warning";
  message: string;
  file: string;
  exportName: string;
  subject?: string;
}
