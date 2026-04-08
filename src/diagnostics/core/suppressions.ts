import { ts } from "@/compiler/typescript.ts";
import { authorizationPolicyNotRegisteredComponentRuleCode } from "../../components/diagnostics/rules/authorization-policy-not-registered.rule.ts";
import { componentAllowAnonymousNotSupportedRuleCode } from "../../components/diagnostics/rules/component-allow-anonymous-not-supported.rule.ts";
import { componentAuthorizationSsgWarningRuleCode } from "../../components/diagnostics/rules/component-authorization-ssg-warning.rule.ts";
import { componentBlockingPlaceholderConflictRuleCode } from "../../components/diagnostics/rules/component-blocking-placeholder-conflict.rule.ts";
import { componentErrorWithoutLoadRuleCode } from "../../components/diagnostics/rules/component-error-without-load.rule.ts";
import { componentLoadMissingPlaceholderRuleCode } from "../../components/diagnostics/rules/component-load-missing-placeholder.rule.ts";
import { componentPlaceholderInSsgMissingPlaceholderRuleCode } from "../../components/diagnostics/rules/component-placeholder-in-ssg-missing-placeholder.rule.ts";
import { componentPlaceholderWithoutLoadRuleCode } from "../../components/diagnostics/rules/component-placeholder-without-load.rule.ts";
import { componentRenderStrategyWithoutLoadRuleCode } from "../../components/diagnostics/rules/component-render-strategy-without-load.rule.ts";
import { diRegistrationCycleRuleCode } from "../../di/diagnostics/rules/di-registration-cycle.rule.ts";
import { diServiceDependencyNotRegisteredRuleCode } from "../../di/diagnostics/rules/di-service-dependency-not-registered.rule.ts";
import { diTokenNotRegisteredRuleCode } from "../../di/diagnostics/rules/di-token-not-registered.rule.ts";
import { authorizationPolicyNotRegisteredPageDiagnosticCode } from "../../routing/diagnostics/rules/authorization-policy-not-registered.rule.ts";
import { dynamicSsgInvalidEntriesDiagnosticCode } from "../../routing/diagnostics/rules/dynamic-ssg-invalid-entries.rule.ts";
import { dynamicSsgMissingEntriesDiagnosticCode } from "../../routing/diagnostics/rules/dynamic-ssg-missing-entries.rule.ts";
import { dynamicSsgMissingLoadDiagnosticCode } from "../../routing/diagnostics/rules/dynamic-ssg-missing-load.rule.ts";
import { invalidLocaleTagDiagnosticCode } from "../../routing/diagnostics/rules/invalid-locale-tag.rule.ts";
import { multipleNotFoundPagesDiagnosticCode } from "../../routing/diagnostics/rules/multiple-not-found-pages.rule.ts";
import { notFoundMustNotDefineRouteDiagnosticCode } from "../../routing/diagnostics/rules/not-found-must-not-define-route.rule.ts";
import { notFoundMustUseSsgDiagnosticCode } from "../../routing/diagnostics/rules/not-found-must-use-ssg.rule.ts";
import { pageAuthorizationAnonymousConflictDiagnosticCode } from "../../routing/diagnostics/rules/page-authorization-anonymous-conflict.rule.ts";
import { pageAuthorizationSsgWarningDiagnosticCode } from "../../routing/diagnostics/rules/page-authorization-ssg-warning.rule.ts";
import { pageStaticLoadUnsupportedDiagnosticCode } from "../../routing/diagnostics/rules/page-static-load-unsupported.rule.ts";
import type { DiagnosticsSourceInput, MainzDiagnostic } from "./target-model.ts";

export const invalidDiagnosticSuppressionCode = "invalid-diagnostic-suppression" as const;
export const unknownDiagnosticSuppressionCode = "unknown-diagnostic-suppression" as const;
export const unusedDiagnosticSuppressionCode = "unused-diagnostic-suppression" as const;

export interface DiagnosticSuppression {
    code: string;
    reason: string;
    subject?: string;
}

interface ParsedSuppressionOwner {
    file: string;
    exportName: string;
    routePath?: string;
    suppressions: readonly DiagnosticSuppression[];
    validationDiagnostics: readonly MainzDiagnostic[];
}

type SuppressibleDiagnostic = {
    code: string;
    severity: "error" | "warning";
    message: string;
    file: string;
    exportName: string;
    routePath?: string;
    subject?: string;
};

const diagnosticSubjectValidators = new Map<string, (subject: string) => boolean>([
    [invalidLocaleTagDiagnosticCode, (subject) => /^locale=.+$/.test(subject)],
    [
        dynamicSsgInvalidEntriesDiagnosticCode,
        (subject) => /^entry=\d+(;locale=.+)?$/.test(subject),
    ],
    [
        diServiceDependencyNotRegisteredRuleCode,
        (subject) => /^dependency=.+$/.test(subject),
    ],
    [diTokenNotRegisteredRuleCode, (subject) => /^token=.+$/.test(subject)],
]);

const knownDiagnosticCodes = new Set<string>([
    authorizationPolicyNotRegisteredComponentRuleCode,
    componentAllowAnonymousNotSupportedRuleCode,
    componentAuthorizationSsgWarningRuleCode,
    componentBlockingPlaceholderConflictRuleCode,
    componentErrorWithoutLoadRuleCode,
    componentLoadMissingPlaceholderRuleCode,
    componentPlaceholderInSsgMissingPlaceholderRuleCode,
    componentPlaceholderWithoutLoadRuleCode,
    componentRenderStrategyWithoutLoadRuleCode,
    diRegistrationCycleRuleCode,
    diServiceDependencyNotRegisteredRuleCode,
    diTokenNotRegisteredRuleCode,
    authorizationPolicyNotRegisteredPageDiagnosticCode,
    dynamicSsgInvalidEntriesDiagnosticCode,
    dynamicSsgMissingEntriesDiagnosticCode,
    dynamicSsgMissingLoadDiagnosticCode,
    invalidLocaleTagDiagnosticCode,
    multipleNotFoundPagesDiagnosticCode,
    notFoundMustNotDefineRouteDiagnosticCode,
    notFoundMustUseSsgDiagnosticCode,
    pageAuthorizationAnonymousConflictDiagnosticCode,
    pageAuthorizationSsgWarningDiagnosticCode,
    pageStaticLoadUnsupportedDiagnosticCode,
]);

export function applyDiagnosticSuppressions<T extends SuppressibleDiagnostic>(
    diagnostics: readonly T[],
    sourceInputs: readonly DiagnosticsSourceInput[],
    options?: {
        routePathsByOwner?: ReadonlyMap<string, string>;
    },
): readonly T[] {
    const owners = collectParsedSuppressionOwners(
        sourceInputs,
        options?.routePathsByOwner ?? new Map<string, string>(),
    );
    if (owners.size === 0) {
        return diagnostics;
    }

    const usedSuppressions = new Set<string>();
    const visibleDiagnostics: T[] = [];

    for (const diagnostic of diagnostics) {
        const owner = owners.get(`${diagnostic.file}::${diagnostic.exportName}`);
        if (!owner) {
            visibleDiagnostics.push(diagnostic);
            continue;
        }

        const matchedSuppression = owner.suppressions.find((suppression) =>
            suppression.code === diagnostic.code &&
            (suppression.subject === undefined || suppression.subject === diagnostic.subject)
        );
        if (!matchedSuppression) {
            visibleDiagnostics.push(diagnostic);
            continue;
        }

        usedSuppressions.add(
            createSuppressionKey(owner.file, owner.exportName, matchedSuppression),
        );
    }

    const validationDiagnostics = [...owners.values()].flatMap((owner) => [
        ...owner.validationDiagnostics,
        ...owner.suppressions.flatMap((suppression) => {
            const suppressionKey = createSuppressionKey(owner.file, owner.exportName, suppression);
            if (usedSuppressions.has(suppressionKey)) {
                return [];
            }

            return [createUnusedSuppressionDiagnostic(owner, suppression)];
        }),
    ]) as T[];

    return [...visibleDiagnostics, ...validationDiagnostics];
}

function collectParsedSuppressionOwners(
    sourceInputs: readonly DiagnosticsSourceInput[],
    routePathsByOwner: ReadonlyMap<string, string>,
): ReadonlyMap<string, ParsedSuppressionOwner> {
    const owners = new Map<string, ParsedSuppressionOwner>();

    for (const input of sourceInputs) {
        const sourceFile = ts.createSourceFile(
            input.file,
            input.source,
            ts.ScriptTarget.Latest,
            true,
            input.file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
        );

        for (const statement of sourceFile.statements) {
            if (!ts.isClassDeclaration(statement) || !statement.name || !hasExportModifier(statement)) {
                continue;
            }

            const owner = parseSuppressionOwner(
                input.file,
                statement.name.text,
                input.source,
                statement,
                routePathsByOwner.get(`${input.file}::${statement.name.text}`),
            );
            if (!owner) {
                continue;
            }

            owners.set(`${owner.file}::${owner.exportName}`, owner);
        }
    }

    return owners;
}

function parseSuppressionOwner(
    file: string,
    exportName: string,
    sourceText: string,
    node: ts.ClassDeclaration,
    routePath: string | undefined,
): ParsedSuppressionOwner | undefined {
    const blockText = readSuppressionCommentBlock(sourceText, node);
    if (!blockText) {
        return undefined;
    }

    const parsed = parseSuppressionBlock(blockText, {
        file,
        exportName,
        routePath,
    });

    return {
        file,
        exportName,
        routePath,
        suppressions: parsed.suppressions,
        validationDiagnostics: parsed.validationDiagnostics,
    };
}

function readSuppressionCommentBlock(
    sourceText: string,
    node: ts.ClassDeclaration,
): string | undefined {
    const commentRanges = ts.getLeadingCommentRanges(sourceText, node.getFullStart()) ?? [];
    for (let index = commentRanges.length - 1; index >= 0; index--) {
        const commentRange = commentRanges[index];
        if (commentRange.kind !== ts.SyntaxKind.MultiLineCommentTrivia) {
            continue;
        }

        const commentText = sourceText.slice(commentRange.pos, commentRange.end);
        if (!commentText.includes("@mainz-diagnostics-ignore")) {
            continue;
        }

        return commentText;
    }

    return undefined;
}

function parseSuppressionBlock(
    blockText: string,
    owner: { file: string; exportName: string; routePath?: string },
): {
    suppressions: readonly DiagnosticSuppression[];
    validationDiagnostics: readonly MainzDiagnostic[];
} {
    const normalizedLines = blockText
        .replace(/^\/\*\*?/, "")
        .replace(/\*\/$/, "")
        .split(/\r?\n/)
        .map((line) => line.replace(/^\s*\* ?/, "").trimEnd());
    const firstContentIndex = normalizedLines.findIndex((line) => line.trim().length > 0);
    const directiveIndex = normalizedLines.findIndex((line) =>
        line.trim() === "@mainz-diagnostics-ignore"
    );
    const validationDiagnostics: MainzDiagnostic[] = [];

    if (directiveIndex === -1 || directiveIndex !== firstContentIndex) {
        return {
            suppressions: [],
            validationDiagnostics: [createInvalidSuppressionDiagnostic(
                owner,
                `Invalid diagnostic suppression on "${owner.exportName}": expected "@mainz-diagnostics-ignore" as the first non-empty line.`,
            )],
        };
    }

    const suppressions: DiagnosticSuppression[] = [];
    const seen = new Set<string>();
    for (const rawLine of normalizedLines.slice(directiveIndex + 1)) {
        const line = rawLine.trim();
        if (!line) {
            continue;
        }

        const match = /^([a-z0-9-]+)(?:\[([^\]]+)\])?:\s*(.+)$/.exec(line);
        if (!match) {
            validationDiagnostics.push(createInvalidSuppressionDiagnostic(
                owner,
                `Invalid diagnostic suppression on "${owner.exportName}": expected "diagnostic-code: reason".`,
            ));
            continue;
        }

        const [, code, subjectText, reasonText] = match;
        const reason = reasonText.trim();
        if (!reason) {
            validationDiagnostics.push(createInvalidSuppressionDiagnostic(
                owner,
                `Invalid diagnostic suppression on "${owner.exportName}": expected "diagnostic-code: reason".`,
            ));
            continue;
        }

        if (!knownDiagnosticCodes.has(code)) {
            validationDiagnostics.push({
                code: unknownDiagnosticSuppressionCode,
                severity: "warning",
                message: `Unknown diagnostic suppression code "${code}" on "${owner.exportName}".`,
                file: owner.file,
                exportName: owner.exportName,
                routePath: owner.routePath,
            });
            continue;
        }

        const subject = subjectText?.trim() || undefined;
        const subjectValidator = diagnosticSubjectValidators.get(code);
        if (subject && (!subjectValidator || !subjectValidator(subject))) {
            validationDiagnostics.push(createInvalidSuppressionDiagnostic(
                owner,
                `Invalid diagnostic suppression subject "${subject}" for "${code}" on "${owner.exportName}".`,
            ));
            continue;
        }

        if (!subject && subjectText !== undefined && subjectText.trim().length === 0) {
            validationDiagnostics.push(createInvalidSuppressionDiagnostic(
                owner,
                `Invalid diagnostic suppression subject "" for "${code}" on "${owner.exportName}".`,
            ));
            continue;
        }

        const key = `${code}::${subject ?? ""}`;
        if (seen.has(key)) {
            validationDiagnostics.push(createInvalidSuppressionDiagnostic(
                owner,
                `Duplicate diagnostic suppression "${formatSuppressionReference({ code, subject, reason })}" on "${owner.exportName}".`,
            ));
            continue;
        }

        seen.add(key);
        suppressions.push({
            code,
            subject,
            reason,
        });
    }

    return {
        suppressions,
        validationDiagnostics,
    };
}

function createInvalidSuppressionDiagnostic(
    owner: { file: string; exportName: string; routePath?: string },
    message: string,
): MainzDiagnostic {
    return {
        code: invalidDiagnosticSuppressionCode,
        severity: "warning",
        message,
        file: owner.file,
        exportName: owner.exportName,
        routePath: owner.routePath,
    };
}

function createUnusedSuppressionDiagnostic(
    owner: ParsedSuppressionOwner,
    suppression: DiagnosticSuppression,
): MainzDiagnostic {
    return {
        code: unusedDiagnosticSuppressionCode,
        severity: "warning",
        message:
            `Diagnostic suppression "${formatSuppressionReference(suppression)}" on "${owner.exportName}" was not used.`,
        file: owner.file,
        exportName: owner.exportName,
        routePath: owner.routePath,
    };
}

function formatSuppressionReference(suppression: DiagnosticSuppression): string {
    return suppression.subject
        ? `${suppression.code}[${suppression.subject}]`
        : suppression.code;
}

function createSuppressionKey(
    file: string,
    exportName: string,
    suppression: DiagnosticSuppression,
): string {
    return `${file}::${exportName}::${suppression.code}::${suppression.subject ?? ""}`;
}

function hasExportModifier(node: ts.Node): boolean {
    return ts.canHaveModifiers(node) &&
        (ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ??
            false);
}
