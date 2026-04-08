import { authorizationPolicyNotRegisteredComponentRuleCode } from "./rules/authorization-policy-not-registered.rule.ts";
import { componentAllowAnonymousNotSupportedRuleCode } from "./rules/component-allow-anonymous-not-supported.rule.ts";
import { componentAuthorizationSsgWarningRuleCode } from "./rules/component-authorization-ssg-warning.rule.ts";
import { componentBlockingPlaceholderConflictRuleCode } from "./rules/component-blocking-placeholder-conflict.rule.ts";
import { componentErrorWithoutLoadRuleCode } from "./rules/component-error-without-load.rule.ts";
import { componentLoadMissingPlaceholderRuleCode } from "./rules/component-load-missing-placeholder.rule.ts";
import { componentRenderDataWithoutExplicitDataRuleCode } from "./rules/component-render-data-without-explicit-data.rule.ts";
import { componentRenderDataWithoutLoadRuleCode } from "./rules/component-render-data-without-load.rule.ts";
import { componentPlaceholderInSsgMissingPlaceholderRuleCode } from "./rules/component-placeholder-in-ssg-missing-placeholder.rule.ts";
import { componentPlaceholderWithoutLoadRuleCode } from "./rules/component-placeholder-without-load.rule.ts";
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
    | "defer";

export type ComponentRenderPolicy =
    | "placeholder-in-ssg"
    | "hide-in-ssg"
    | "forbidden-in-ssg";

export interface ComponentFact {
    file: string;
    exportName: string;
    isAbstract: boolean;
    extendsComponent: boolean;
    extendsPage: boolean;
    hasLoad: boolean;
    renderStrategy?: ComponentRenderStrategy;
    renderPolicy?: ComponentRenderPolicy;
    hasPlaceholder: boolean;
    hasError: boolean;
    hasExplicitRenderStrategy: boolean;
    hasExplicitRenderPolicy: boolean;
    hasAuthorize: boolean;
    authorizationPolicy?: string;
    hasAllowAnonymous: boolean;
    hasRenderDataParameter: boolean;
    renderDataParameterTypeIsUnknown: boolean;
    hasExplicitDataContract: boolean;
}

export interface ComponentDiagnosticsContext {
    registeredPolicyNames?: ReadonlySet<string>;
}

export type ComponentDiagnosticCode =
    | typeof authorizationPolicyNotRegisteredComponentRuleCode
    | typeof componentAllowAnonymousNotSupportedRuleCode
    | typeof componentAuthorizationSsgWarningRuleCode
    | typeof componentBlockingPlaceholderConflictRuleCode
    | typeof componentErrorWithoutLoadRuleCode
    | typeof componentLoadMissingPlaceholderRuleCode
    | typeof componentRenderDataWithoutExplicitDataRuleCode
    | typeof componentRenderDataWithoutLoadRuleCode
    | typeof componentPlaceholderInSsgMissingPlaceholderRuleCode
    | typeof componentPlaceholderWithoutLoadRuleCode
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
