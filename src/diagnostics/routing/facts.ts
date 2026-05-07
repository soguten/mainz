import type { PageAuthorizationMetadata } from "../../authorization/index.ts";
import { authorizationPolicyNotRegisteredPageDiagnosticCode } from "./rules/authorization-policy-not-registered.rule.ts";
import { dynamicSsgInvalidEntriesDiagnosticCode } from "./rules/dynamic-ssg-invalid-entries.rule.ts";
import { dynamicSsgMissingEntriesDiagnosticCode } from "./rules/dynamic-ssg-missing-entries.rule.ts";
import { dynamicSsgMissingLoadDiagnosticCode } from "./rules/dynamic-ssg-missing-load.rule.ts";
import { invalidLocaleTagDiagnosticCode } from "./rules/invalid-locale-tag.rule.ts";
import { multipleNotFoundPagesDiagnosticCode } from "./rules/multiple-not-found-pages.rule.ts";
import { pageAuthorizationAnonymousConflictDiagnosticCode } from "./rules/page-authorization-anonymous-conflict.rule.ts";
import { pageAuthorizationSsgWarningDiagnosticCode } from "./rules/page-authorization-ssg-warning.rule.ts";
import { pageRenderDataWithoutExplicitDataDiagnosticCode } from "./rules/page-render-data-without-explicit-data.rule.ts";
import { pageRenderDataWithoutLoadDiagnosticCode } from "./rules/page-render-data-without-load.rule.ts";
import { pageStaticLoadUnsupportedDiagnosticCode } from "./rules/page-static-load-unsupported.rule.ts";
import {
  invalidDiagnosticSuppressionCode,
  unknownDiagnosticSuppressionCode,
  unusedDiagnosticSuppressionCode,
} from "../core/suppressions.ts";

export type MainzDiagnosticSeverity = "warning" | "error";
export const pageDiscoveryFailedDiagnosticCode =
  "page-discovery-failed" as const;
export type MainzDiagnosticCode =
  | typeof authorizationPolicyNotRegisteredPageDiagnosticCode
  | typeof dynamicSsgInvalidEntriesDiagnosticCode
  | typeof dynamicSsgMissingEntriesDiagnosticCode
  | typeof dynamicSsgMissingLoadDiagnosticCode
  | typeof invalidLocaleTagDiagnosticCode
  | typeof invalidDiagnosticSuppressionCode
  | typeof pageDiscoveryFailedDiagnosticCode
  | typeof multipleNotFoundPagesDiagnosticCode
  | typeof pageAuthorizationAnonymousConflictDiagnosticCode
  | typeof pageAuthorizationSsgWarningDiagnosticCode
  | typeof pageRenderDataWithoutExplicitDataDiagnosticCode
  | typeof pageRenderDataWithoutLoadDiagnosticCode
  | typeof pageStaticLoadUnsupportedDiagnosticCode
  | typeof unknownDiagnosticSuppressionCode
  | typeof unusedDiagnosticSuppressionCode;

export interface MainzDiagnostic {
  code: MainzDiagnosticCode;
  severity: MainzDiagnosticSeverity;
  message: string;
  file: string;
  exportName: string;
  routePath?: string;
  subject?: string;
}

export interface RouteDiagnosticsPageInput {
  file: string;
  exportName: string;
  page: {
    path: string;
    mode: "csr" | "ssg";
    notFound?: boolean;
    locales?: readonly string[];
    authorization?: PageAuthorizationMetadata;
  };
}

export interface RouteEntryDefinition {
  params: Record<string, string>;
}

export interface RouteEntriesUnknownFact {
  kind: "unknown";
}

export interface RouteEntriesNonArrayFact {
  kind: "non-array";
}

export interface RouteEntriesArrayFact {
  kind: "array";
  entries: readonly RouteEntryDefinition[];
}

export type RouteEntriesEvaluationFact =
  | RouteEntriesUnknownFact
  | RouteEntriesNonArrayFact
  | RouteEntriesArrayFact;

export interface RouteStaticMembersFact {
  hasEntriesMember: boolean;
  hasStaticLoadMember: boolean;
  hasInstanceLoadMember: boolean;
}

export interface RouteEntriesFact {
  hasEntriesMember: boolean;
  evaluation?: RouteEntriesEvaluationFact;
}

export interface RoutePageFacts {
  staticMembers: RouteStaticMembersFact;
  entriesFact: RouteEntriesFact;
  hasRenderDataParameter: boolean;
  renderDataParameterTypeIsUnknown: boolean;
  hasExplicitDataContract: boolean;
}
