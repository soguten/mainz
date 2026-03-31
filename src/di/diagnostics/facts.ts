import { diServiceDependencyNotRegisteredRuleCode } from "./rules/di-service-dependency-not-registered.rule.ts";
import { diRegistrationCycleRuleCode } from "./rules/di-registration-cycle.rule.ts";
import { diTokenNotRegisteredRuleCode } from "./rules/di-token-not-registered.rule.ts";

export interface DiSourceDiagnosticsInput {
    file: string;
    source: string;
}

export interface DiTokenReference {
    key: string;
    name: string;
}

export interface DiRegistrationFact {
    token: DiTokenReference;
    lifetime: "singleton" | "transient";
    dependencies: readonly DiTokenReference[];
    file: string;
}

export interface DiInjectionFact {
    token: DiTokenReference;
    file: string;
    exportName: string;
}

export interface DiRegistrationCycleFact {
    cycle: readonly DiTokenReference[];
    file: string;
    exportName: string;
}

export interface DiDiagnosticsFacts {
    registrations: readonly DiRegistrationFact[];
    injections: readonly DiInjectionFact[];
    cycles: readonly DiRegistrationCycleFact[];
}

export interface DiDiagnosticsContext {
    routePathsByOwner: ReadonlyMap<string, string>;
}

export type DiDiagnosticCode =
    | typeof diServiceDependencyNotRegisteredRuleCode
    | typeof diRegistrationCycleRuleCode
    | typeof diTokenNotRegisteredRuleCode;

export interface DiDiagnostic {
    code: DiDiagnosticCode;
    severity: "error";
    message: string;
    file: string;
    exportName: string;
    routePath?: string;
}
