import { authorizationPolicyNotRegisteredComponentRuleCode } from "./rules/authorization-policy-not-registered.rule.ts";
import { componentAllowAnonymousNotSupportedRuleCode } from "./rules/component-allow-anonymous-not-supported.rule.ts";
import { componentAuthorizationSsgWarningRuleCode } from "./rules/component-authorization-ssg-warning.rule.ts";
import { componentBlockingFallbackMisleadingRuleCode } from "./rules/component-blocking-fallback-misleading.rule.ts";
import { componentLoadMissingFallbackRuleCode } from "./rules/component-load-missing-fallback.rule.ts";
import { componentRenderStrategyWithoutLoadRuleCode } from "./rules/component-render-strategy-without-load.rule.ts";
import {
    invalidDiagnosticSuppressionCode,
    unknownDiagnosticSuppressionCode,
    unusedDiagnosticSuppressionCode,
} from "../../diagnostics/core/suppressions.ts";

export interface ComponentSourceDiagnosticsInput {
    file: string;
    source: string;
}

export type ComponentRenderStrategy =
    | "blocking"
    | "deferred"
    | "client-only"
    | "forbidden-in-ssg";

export interface ComponentFact {
    file: string;
    exportName: string;
    isAbstract: boolean;
    extendsComponent: boolean;
    extendsPage: boolean;
    hasLoad: boolean;
    renderStrategy?: ComponentRenderStrategy;
    hasFallback: boolean;
    hasAuthorize: boolean;
    authorizationPolicy?: string;
    hasAllowAnonymous: boolean;
}

export interface ComponentDiagnosticsContext {
    registeredPolicyNames?: ReadonlySet<string>;
}

export type ComponentDiagnosticCode =
    | typeof authorizationPolicyNotRegisteredComponentRuleCode
    | typeof componentAllowAnonymousNotSupportedRuleCode
    | typeof componentAuthorizationSsgWarningRuleCode
    | typeof componentBlockingFallbackMisleadingRuleCode
    | typeof componentLoadMissingFallbackRuleCode
    | typeof componentRenderStrategyWithoutLoadRuleCode
    | typeof invalidDiagnosticSuppressionCode
    | typeof unknownDiagnosticSuppressionCode
    | typeof unusedDiagnosticSuppressionCode;

export interface ComponentDiagnostic {
    code: ComponentDiagnosticCode;
    severity: "error" | "warning";
    message: string;
    file: string;
    exportName: string;
    subject?: string;
}
