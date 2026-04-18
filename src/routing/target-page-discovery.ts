/// <reference lib="deno.ns" />

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { ts } from "@/compiler/typescript.ts";
import { discoverPageExportFromFile, discoverPagesFromFile } from "./server.ts";
import type { RenderMode } from "./index.ts";
import type { PageAuthorizationMetadata } from "../authorization/index.ts";
import type { PageHeadDefinition } from "../components/page.ts";
import type { NormalizedMainzTarget } from "../config/index.ts";
import {
    invalidLocalePageDiscoveryErrorKind,
    type PageDiscoveryError,
    type PageDiscoveryErrorKind,
    pageDiscoveryFailedErrorKind,
} from "./page-discovery-errors.ts";

export interface CliDiscoveredPage {
    file: string;
    exportName: string;
    path: string;
    mode: RenderMode;
    notFound?: boolean;
    locales?: readonly string[];
    head?: PageHeadDefinition;
    authorization?: PageAuthorizationMetadata;
}

export type CliPageDiscoveryError = PageDiscoveryError;

interface AppFileContext {
    file: string;
    sourceFile: ts.SourceFile;
    variables: ReadonlyMap<string, ts.Expression>;
    imports: ReadonlyMap<string, ImportedBinding>;
    exportedBindings: ReadonlyMap<string, ts.Expression>;
}

interface ImportedBinding {
    importedName: string;
    sourceFile: string;
}

interface AppPageReference {
    localName: string;
    pathOverride?: string;
    notFound?: boolean;
}

interface RoutedAppDefinitionResolution {
    appDefinition: ts.ObjectLiteralExpression;
    context: AppFileContext;
}

export interface AppDiscoveryCandidate {
    appId?: string;
    appFile: string;
    routed: boolean;
    authorizationPolicyNames?: readonly string[];
    discoveredPages: readonly CliDiscoveredPage[];
    discoveryErrors?: readonly CliPageDiscoveryError[];
}

export interface TargetAppDiscovery {
    resolvedAppFile?: string;
    appCandidates: readonly AppDiscoveryCandidate[] | undefined;
    foundAppDefinition: boolean;
}

interface ResolvedAppExpression {
    expression: ts.Expression;
    context: AppFileContext;
}

export async function resolveTargetDiscoveredPages(
    pagesDir: string | undefined,
    cwd = Deno.cwd(),
): Promise<{
    filesystemPageFiles: string[] | undefined;
    discoveredPages: CliDiscoveredPage[] | undefined;
    discoveryErrors: readonly CliPageDiscoveryError[] | undefined;
}> {
    const filesystemPageFiles = pagesDir
        ? await collectFilesystemPageFiles(resolve(cwd, pagesDir))
        : undefined;
    const discoveredPages: CliDiscoveredPage[] = [];
    const discoveryErrors: CliPageDiscoveryError[] = [];

    for (const filePath of filesystemPageFiles ?? []) {
        try {
            const entries = await discoverPagesFromFile(filePath);
            discoveredPages.push(...entries.map((entry) => ({
                file: entry.file,
                exportName: entry.exportName,
                ...entry.page,
            })));
        } catch (error) {
            const message = toErrorMessage(error);
            discoveryErrors.push({
                kind: classifyPageDiscoveryError(message),
                file: normalizePathSlashes(filePath),
                message,
            });
        }
    }

    return normalizeDiscoveredPagesResult({
        filesystemPageFiles,
        discoveredPages,
        discoveryErrors,
    });
}

export async function resolveTargetDiscoveredPagesForTarget(
    target: NormalizedMainzTarget,
    cwd = Deno.cwd(),
): Promise<{
    filesystemPageFiles: string[] | undefined;
    discoveredPages: CliDiscoveredPage[] | undefined;
    discoveryErrors: readonly CliPageDiscoveryError[] | undefined;
}> {
    const resolvedAppFile = resolveTargetAppFile(target, cwd);
    if (resolvedAppFile) {
        const appDiscovery = await resolveTargetAppCandidatesFromAppFile(
            resolvedAppFile,
            target.appFile !== undefined,
        );
        if (!appDiscovery.foundAppDefinition && isRoutedTargetInput(target)) {
            return normalizeDiscoveredPagesResult({
                filesystemPageFiles: undefined,
                discoveredPages: undefined,
                discoveryErrors: [{
                    kind: pageDiscoveryFailedErrorKind,
                    file: normalizePathSlashes(resolve(resolvedAppFile)),
                    message:
                        `Target "${target.name}" must define a routed app with defineApp(...) before pages can be discovered.`,
                }],
            });
        }

        const validCandidates = selectValidTargetAppCandidates(target, appDiscovery.appCandidates);
        if (validCandidates.length === 1) {
            const selectedCandidate = validCandidates[0];
            return normalizeDiscoveredPagesResult({
                filesystemPageFiles: selectedCandidate.discoveredPages.map((page) => page.file),
                discoveredPages: [...selectedCandidate.discoveredPages],
                discoveryErrors: undefined,
            });
        }

        if (validCandidates.length > 1) {
            return normalizeDiscoveredPagesResult({
                filesystemPageFiles: undefined,
                discoveredPages: undefined,
                discoveryErrors: [{
                    kind: pageDiscoveryFailedErrorKind,
                    file: normalizePathSlashes(resolve(resolvedAppFile)),
                    message:
                        `Target "${target.name}" found multiple routed apps in "${resolvedAppFile}". Add appId to select one.`,
                }],
            });
        }

        const discoveryErrors = [
            ...flattenCandidateDiscoveryErrors(appDiscovery.appCandidates),
            ...buildTargetAppSelectionErrors(target, appDiscovery.appCandidates),
        ];
        if (discoveryErrors.length > 0) {
            return normalizeDiscoveredPagesResult({
                filesystemPageFiles: undefined,
                discoveredPages: undefined,
                discoveryErrors,
            });
        }
    }

    if (isRoutedTargetInput(target)) {
        return normalizeDiscoveredPagesResult({
            filesystemPageFiles: undefined,
            discoveredPages: undefined,
            discoveryErrors: [{
                kind: pageDiscoveryFailedErrorKind,
                file: normalizePathSlashes(resolve(cwd, target.rootDir)),
                message:
                    `Target "${target.name}" must define a routed app with defineApp(...) before pages can be discovered.`,
            }],
        });
    }

    return await resolveTargetDiscoveredPages(target.pagesDir, cwd);
}

export async function resolveTargetAppDiscoveryForTarget(
    target: NormalizedMainzTarget,
    cwd = Deno.cwd(),
): Promise<TargetAppDiscovery> {
    const resolvedAppFile = resolveTargetAppFile(target, cwd);
    if (!resolvedAppFile) {
        return {
            appCandidates: undefined,
            foundAppDefinition: false,
        };
    }

    const appDiscovery = await resolveTargetAppCandidatesFromAppFile(
        resolvedAppFile,
        target.appFile !== undefined,
    );
    return {
        resolvedAppFile,
        ...appDiscovery,
    };
}

export async function collectFilesystemFiles(directory: string): Promise<string[]> {
    const filePaths: string[] = [];

    for await (const entry of Deno.readDir(directory)) {
        const absolutePath = resolve(directory, entry.name);

        if (entry.isDirectory) {
            const nested = await collectFilesystemFiles(absolutePath);
            filePaths.push(...nested);
            continue;
        }

        if (!entry.isFile) continue;
        filePaths.push(normalizePathSlashes(absolutePath));
    }

    return filePaths;
}

async function resolveTargetAppCandidatesFromAppFile(
    appFile: string,
    explicit: boolean,
): Promise<{
    appCandidates: readonly AppDiscoveryCandidate[] | undefined;
    foundAppDefinition: boolean;
}> {
    const normalizedAppFile = normalizePathSlashes(resolve(appFile));
    if (!existsSync(normalizedAppFile)) {
        if (!explicit) {
            return {
                appCandidates: undefined,
                foundAppDefinition: false,
            };
        }

        return {
            appCandidates: [{
                appFile: normalizedAppFile,
                routed: false,
                discoveredPages: [],
                discoveryErrors: [{
                    kind: pageDiscoveryFailedErrorKind,
                    file: normalizedAppFile,
                    message: `Configured appFile "${normalizedAppFile}" could not be found.`,
                }],
            }],
            foundAppDefinition: false,
        };
    }

    let source: string;
    try {
        source = await Deno.readTextFile(normalizedAppFile);
    } catch (error) {
        return {
            appCandidates: [{
                appFile: normalizedAppFile,
                routed: false,
                discoveredPages: [],
                discoveryErrors: [{
                    kind: pageDiscoveryFailedErrorKind,
                    file: normalizedAppFile,
                    message: `Could not read app module "${normalizedAppFile}": ${
                        toErrorMessage(error)
                    }`,
                }],
            }],
            foundAppDefinition: false,
        };
    }

    const contexts = new Map<string, AppFileContext>();
    const context = createAppFileContext(normalizedAppFile, source);
    contexts.set(normalizedAppFile, context);
    const appResolutions = collectAppDefinitions(context, contexts);
    if (appResolutions.length === 0) {
        return {
            appCandidates: undefined,
            foundAppDefinition: false,
        };
    }

    const appCandidates = await Promise.all(
        appResolutions.map((appResolution) => resolveAppCandidate(appResolution)),
    );
    applyDuplicateAppIdErrors(appCandidates);

    return {
        appCandidates: appCandidates.sort(compareAppDiscoveryCandidates),
        foundAppDefinition: true,
    };
}

function createAppFileContext(file: string, source: string): AppFileContext {
    const sourceFile = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    return {
        file,
        sourceFile,
        variables: collectTopLevelVariableExpressions(sourceFile),
        imports: collectImports(sourceFile, file),
        exportedBindings: collectExportedBindings(sourceFile),
    };
}

function collectAppDefinitions(
    context: AppFileContext,
    contexts: Map<string, AppFileContext>,
): readonly RoutedAppDefinitionResolution[] {
    const found: RoutedAppDefinitionResolution[] = [];
    const seen = new Set<string>();

    visitNode(context.sourceFile, (node) => {
        if (!ts.isCallExpression(node)) {
            return;
        }

        const callee = readIdentifierLike(node.expression);
        if (callee !== "startApp" && callee !== "defineApp") {
            return;
        }

        const candidates = collectAppDefinitionExpressions(
            node.arguments[0],
            context,
            contexts,
            new Set<string>(),
            callee === "defineApp",
        );
        for (const candidate of candidates) {
            const candidateKey =
                `${candidate.context.file}::${candidate.appDefinition.pos}::${candidate.appDefinition.end}`;
            if (seen.has(candidateKey)) {
                continue;
            }

            seen.add(candidateKey);
            found.push(candidate);
        }
    });

    return found;
}

function collectAppDefinitionExpressions(
    expression: ts.Expression | undefined,
    context: AppFileContext,
    contexts: Map<string, AppFileContext>,
    visitedReferences: Set<string>,
    allowObjectLiteral: boolean,
): readonly RoutedAppDefinitionResolution[] {
    const normalizedExpression = expression ? unwrapExpression(expression) : undefined;
    if (!normalizedExpression) {
        return [];
    }

    if (ts.isObjectLiteralExpression(normalizedExpression)) {
        return allowObjectLiteral && isAppDefinitionObjectLiteral(normalizedExpression)
            ? [{
                appDefinition: normalizedExpression,
                context,
            }]
            : [];
    }

    if (
        ts.isCallExpression(normalizedExpression) &&
        readIdentifierLike(normalizedExpression.expression) === "defineApp"
    ) {
        return collectAppDefinitionExpressions(
            normalizedExpression.arguments[0],
            context,
            contexts,
            visitedReferences,
            true,
        );
    }

    if (ts.isConditionalExpression(normalizedExpression)) {
        return [
            ...collectAppDefinitionExpressions(
                normalizedExpression.whenTrue,
                context,
                contexts,
                new Set(visitedReferences),
                allowObjectLiteral,
            ),
            ...collectAppDefinitionExpressions(
                normalizedExpression.whenFalse,
                context,
                contexts,
                new Set(visitedReferences),
                allowObjectLiteral,
            ),
        ];
    }

    if (!ts.isIdentifier(normalizedExpression)) {
        return [];
    }

    const referenceKey = `${context.file}::${normalizedExpression.text}`;
    if (visitedReferences.has(referenceKey)) {
        return [];
    }

    visitedReferences.add(referenceKey);
    const resolved = resolveIdentifierExpression(context, contexts, normalizedExpression.text);
    if (!resolved) {
        return [];
    }

    return collectAppDefinitionExpressions(
        resolved.expression,
        resolved.context,
        contexts,
        visitedReferences,
        allowObjectLiteral,
    );
}

async function resolveAppCandidate(
    appResolution: RoutedAppDefinitionResolution,
): Promise<AppDiscoveryCandidate> {
    const appId = readAppDefinitionId(appResolution.appDefinition);
    const routed = hasNamedProperty(appResolution.appDefinition, "pages");
    const discoveryErrors: CliPageDiscoveryError[] = [];
    if (!appId) {
        discoveryErrors.push({
            kind: pageDiscoveryFailedErrorKind,
            file: appResolution.context.file,
            message:
                `App definition in "${appResolution.context.file}" must declare a unique string id.`,
        });
    }

    const references = readAppPageReferences(appResolution.appDefinition);
    const discoveredPages: CliDiscoveredPage[] = [];

    for (const reference of references) {
        const importedBinding = appResolution.context.imports.get(reference.localName);
        if (!importedBinding) {
            discoveryErrors.push({
                kind: pageDiscoveryFailedErrorKind,
                file: appResolution.context.file,
                message:
                    `App definition "${appResolution.context.file}" references "${reference.localName}" in pages/notFound, ` +
                    "but only directly imported page constructors are currently supported there.",
            });
            continue;
        }

        try {
            const discoveredPage = await discoverPageExportFromFile(
                importedBinding.sourceFile,
                importedBinding.importedName,
                reference.notFound
                    ? {
                        allowMissingRoute: true,
                        fallbackPath: "/404",
                    }
                    : {},
            );

            if (!discoveredPage) {
                throw new Error(
                    `Imported page "${reference.localName}" did not resolve to exported page "${importedBinding.importedName}" in "${importedBinding.sourceFile}".`,
                );
            }

            discoveredPages.push({
                file: discoveredPage.file,
                exportName: discoveredPage.exportName,
                ...discoveredPage.page,
                path: reference.pathOverride ?? discoveredPage.page.path,
                notFound: reference.notFound ? true : undefined,
            });
        } catch (error) {
            const message = toErrorMessage(error);
            discoveryErrors.push({
                kind: classifyPageDiscoveryError(message),
                file: importedBinding.sourceFile,
                message,
            });
        }
    }

    return {
        appId,
        appFile: appResolution.context.file,
        routed,
        authorizationPolicyNames: readAppAuthorizationPolicyNames(appResolution.appDefinition),
        discoveredPages: normalizeDiscoveredPages([...discoveredPages]),
        discoveryErrors: discoveryErrors.length > 0 ? discoveryErrors : undefined,
    };
}

function applyDuplicateAppIdErrors(
    candidates: AppDiscoveryCandidate[],
): void {
    const candidatesById = new Map<string, AppDiscoveryCandidate[]>();
    for (const candidate of candidates) {
        if (!candidate.appId) {
            continue;
        }

        const bucket = candidatesById.get(candidate.appId) ?? [];
        bucket.push(candidate);
        candidatesById.set(candidate.appId, bucket);
    }

    for (const [appId, duplicates] of candidatesById) {
        if (duplicates.length < 2) {
            continue;
        }

        for (const candidate of duplicates) {
            const errors = [...(candidate.discoveryErrors ?? [])];
            errors.push({
                kind: pageDiscoveryFailedErrorKind,
                file: candidate.appFile,
                message:
                    `Discovered app id "${appId}" more than once. App ids must be unique per target.`,
            });
            candidate.discoveryErrors = errors;
        }
    }
}

function readAppDefinitionId(appDefinition: ts.ObjectLiteralExpression): string | undefined {
    const idExpression = readNamedPropertyInitializer(appDefinition, "id");
    const normalizedIdExpression = idExpression ? unwrapExpression(idExpression) : undefined;
    if (!normalizedIdExpression || !ts.isStringLiteralLike(normalizedIdExpression)) {
        return undefined;
    }

    const appId = normalizedIdExpression.text.trim();
    return appId.length > 0 ? appId : undefined;
}

function readAppAuthorizationPolicyNames(
    appDefinition: ts.ObjectLiteralExpression,
): readonly string[] | undefined {
    const authorizationExpression = readNamedPropertyInitializer(appDefinition, "authorization");
    const authorization = authorizationExpression
        ? unwrapExpression(authorizationExpression)
        : undefined;
    if (!authorization || !ts.isObjectLiteralExpression(authorization)) {
        return undefined;
    }

    const policyNamesExpression = readNamedPropertyInitializer(authorization, "policyNames");
    const policyNames = policyNamesExpression ? unwrapExpression(policyNamesExpression) : undefined;
    if (!policyNames || !ts.isArrayLiteralExpression(policyNames)) {
        return undefined;
    }

    const names = policyNames.elements.flatMap((element) => {
        if (!ts.isStringLiteralLike(element)) {
            return [];
        }

        const policyName = element.text.trim();
        return policyName.length > 0 ? [policyName] : [];
    });

    if (names.length === 0) {
        return undefined;
    }

    return [...new Set(names)].sort((left, right) => left.localeCompare(right));
}

function compareAppDiscoveryCandidates(
    a: Pick<AppDiscoveryCandidate, "appId" | "appFile">,
    b: Pick<AppDiscoveryCandidate, "appId" | "appFile">,
): number {
    if ((a.appId ?? "") !== (b.appId ?? "")) {
        return (a.appId ?? "").localeCompare(b.appId ?? "");
    }

    return a.appFile.localeCompare(b.appFile);
}

function flattenCandidateDiscoveryErrors(
    candidates: readonly AppDiscoveryCandidate[] | undefined,
): readonly CliPageDiscoveryError[] {
    return (candidates ?? []).flatMap((candidate) => candidate.discoveryErrors ?? []);
}

function selectValidTargetAppCandidates(
    target: Pick<NormalizedMainzTarget, "appId">,
    candidates: readonly AppDiscoveryCandidate[] | undefined,
): AppDiscoveryCandidate[] {
    const validCandidates = (candidates ?? [])
        .filter((candidate) =>
            candidate.routed && !candidate.discoveryErrors?.length && candidate.appId
        )
        .sort(compareAppDiscoveryCandidates);

    if (!target.appId) {
        return validCandidates;
    }

    return validCandidates.filter((candidate) => candidate.appId === target.appId);
}

function isRoutedTargetInput(target: Pick<NormalizedMainzTarget, "pagesDir">): boolean {
    return Boolean(target.pagesDir);
}

function buildTargetAppSelectionErrors(
    target: Pick<NormalizedMainzTarget, "appFile" | "appId" | "name">,
    candidates: readonly AppDiscoveryCandidate[] | undefined,
): CliPageDiscoveryError[] {
    if (!target.appId) {
        return [];
    }

    const allCandidates = (candidates ?? []).filter((candidate) => candidate.routed);
    const matchingCandidates = allCandidates.filter((candidate) =>
        candidate.appId === target.appId
    );
    if (matchingCandidates.length === 1 && !matchingCandidates[0]?.discoveryErrors?.length) {
        return [];
    }

    if (matchingCandidates.length > 1) {
        return [{
            kind: pageDiscoveryFailedErrorKind,
            file: normalizePathSlashes(resolve(target.appFile ?? "")),
            message:
                `Target "${target.name}" selects appId "${target.appId}", but multiple apps with that id were found.`,
        }];
    }

    return [{
        kind: pageDiscoveryFailedErrorKind,
        file: normalizePathSlashes(resolve(target.appFile ?? "")),
        message:
            `Target "${target.name}" selects appId "${target.appId}", but "${target.appFile}" exports no app with that id.`,
    }];
}

function isAppDefinitionObjectLiteral(
    objectLiteral: ts.ObjectLiteralExpression,
): boolean {
    return hasNamedProperty(objectLiteral, "pages") || hasNamedProperty(objectLiteral, "root");
}

function resolveIdentifierExpression(
    context: AppFileContext,
    contexts: Map<string, AppFileContext>,
    identifierName: string,
): ResolvedAppExpression | undefined {
    const localVariable = context.variables.get(identifierName);
    if (localVariable) {
        return {
            expression: localVariable,
            context,
        };
    }

    const importedBinding = context.imports.get(identifierName);
    if (!importedBinding) {
        return undefined;
    }

    const importedContext = loadAppFileContext(importedBinding.sourceFile, contexts);
    if (!importedContext) {
        return undefined;
    }

    const exportedExpression = importedContext.exportedBindings.get(importedBinding.importedName);
    if (!exportedExpression) {
        return undefined;
    }

    return {
        expression: exportedExpression,
        context: importedContext,
    };
}

function loadAppFileContext(
    file: string,
    contexts: Map<string, AppFileContext>,
): AppFileContext | undefined {
    const normalizedFile = normalizePathSlashes(resolve(file));
    const cached = contexts.get(normalizedFile);
    if (cached) {
        return cached;
    }

    let source: string;
    try {
        source = Deno.readTextFileSync(normalizedFile);
    } catch {
        return undefined;
    }

    const context = createAppFileContext(normalizedFile, source);
    contexts.set(normalizedFile, context);
    return context;
}

function readAppPageReferences(
    appDefinition: ts.ObjectLiteralExpression,
): readonly AppPageReference[] {
    const references: AppPageReference[] = [];

    const pagesExpression = readNamedPropertyInitializer(appDefinition, "pages");
    const pagesArray =
        pagesExpression && ts.isArrayLiteralExpression(unwrapExpression(pagesExpression))
            ? unwrapExpression(pagesExpression)
            : undefined;
    if (pagesArray && ts.isArrayLiteralExpression(pagesArray)) {
        for (const element of pagesArray.elements) {
            if (!ts.isExpression(element)) {
                continue;
            }

            const pageReference = readAppPageReference(element);
            if (pageReference) {
                references.push(pageReference);
            }
        }
    }

    const notFoundExpression = readNamedPropertyInitializer(appDefinition, "notFound");
    const notFoundReference = notFoundExpression
        ? readAppPageReference(notFoundExpression, true)
        : undefined;
    if (notFoundReference) {
        references.push(notFoundReference);
    }

    return dedupePageReferences(references);
}

function readAppPageReference(
    expression: ts.Expression,
    notFound = false,
): AppPageReference | undefined {
    const normalizedExpression = unwrapExpression(expression);

    if (ts.isIdentifier(normalizedExpression)) {
        return {
            localName: normalizedExpression.text,
            notFound,
        };
    }

    if (!ts.isObjectLiteralExpression(normalizedExpression)) {
        return undefined;
    }

    const pageExpression = readNamedPropertyInitializer(normalizedExpression, "page");
    const pageIdentifier = pageExpression && ts.isIdentifier(unwrapExpression(pageExpression))
        ? unwrapExpression(pageExpression)
        : undefined;
    if (!pageIdentifier || !ts.isIdentifier(pageIdentifier)) {
        return undefined;
    }

    const pathExpression = readNamedPropertyInitializer(normalizedExpression, "path");
    const normalizedPathExpression = pathExpression ? unwrapExpression(pathExpression) : undefined;
    const pathOverride = normalizedPathExpression &&
            ts.isStringLiteralLike(normalizedPathExpression)
        ? normalizedPathExpression.text
        : undefined;

    return {
        localName: pageIdentifier.text,
        pathOverride,
        notFound,
    };
}

function dedupePageReferences(
    references: readonly AppPageReference[],
): readonly AppPageReference[] {
    const deduped = new Map<string, AppPageReference>();

    for (const reference of references) {
        const key = `${reference.localName}::${reference.pathOverride ?? ""}`;
        const existing = deduped.get(key);
        deduped.set(key, {
            localName: reference.localName,
            pathOverride: reference.pathOverride,
            notFound: reference.notFound || existing?.notFound,
        });
    }

    return [...deduped.values()];
}

function readNamedPropertyInitializer(
    objectLiteral: ts.ObjectLiteralExpression,
    expectedName: string,
): ts.Expression | undefined {
    for (const property of objectLiteral.properties) {
        if (
            ts.isPropertyAssignment(property) &&
            isNamedProperty(property.name, expectedName)
        ) {
            return property.initializer;
        }

        if (ts.isShorthandPropertyAssignment(property) && property.name.text === expectedName) {
            return property.name;
        }
    }

    return undefined;
}

function hasNamedProperty(
    objectLiteral: ts.ObjectLiteralExpression,
    expectedName: string,
): boolean {
    return Boolean(readNamedPropertyInitializer(objectLiteral, expectedName));
}

function collectTopLevelVariableExpressions(
    sourceFile: ts.SourceFile,
): ReadonlyMap<string, ts.Expression> {
    const variables = new Map<string, ts.Expression>();

    for (const statement of sourceFile.statements) {
        if (!ts.isVariableStatement(statement)) {
            continue;
        }

        for (const declaration of statement.declarationList.declarations) {
            if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
                continue;
            }

            variables.set(declaration.name.text, declaration.initializer);
        }
    }

    return variables;
}

function collectImports(
    sourceFile: ts.SourceFile,
    file: string,
): ReadonlyMap<string, ImportedBinding> {
    const imports = new Map<string, ImportedBinding>();

    for (const statement of sourceFile.statements) {
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
            continue;
        }

        const importPath = statement.moduleSpecifier.text;
        if (!importPath.startsWith(".")) {
            continue;
        }

        const resolvedImport = resolveImportPath(file, importPath);
        if (!resolvedImport) {
            continue;
        }

        const importClause = statement.importClause;
        if (!importClause) {
            continue;
        }

        if (importClause.name) {
            imports.set(importClause.name.text, {
                importedName: "default",
                sourceFile: resolvedImport,
            });
        }

        const namedBindings = importClause.namedBindings;
        if (!namedBindings || !ts.isNamedImports(namedBindings)) {
            continue;
        }

        for (const element of namedBindings.elements) {
            imports.set(element.name.text, {
                importedName: element.propertyName?.text ?? element.name.text,
                sourceFile: resolvedImport,
            });
        }
    }

    return imports;
}

function collectExportedBindings(sourceFile: ts.SourceFile): ReadonlyMap<string, ts.Expression> {
    const bindings = new Map<string, ts.Expression>();

    for (const statement of sourceFile.statements) {
        if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
            for (const declaration of statement.declarationList.declarations) {
                if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
                    continue;
                }

                bindings.set(declaration.name.text, declaration.initializer);
            }

            continue;
        }

        if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
            bindings.set("default", statement.expression);
        }
    }

    return bindings;
}

function resolveImportPath(file: string, importPath: string): string | undefined {
    const basePath = file.slice(0, Math.max(file.lastIndexOf("/"), 0));
    const candidateBase = normalizePathSegments(`${basePath}/${importPath}`);
    const candidates = [
        candidateBase,
        `${candidateBase}.ts`,
        `${candidateBase}.tsx`,
        `${candidateBase}.mts`,
        `${candidateBase}.cts`,
        `${candidateBase}/index.ts`,
        `${candidateBase}/index.tsx`,
    ];

    for (const candidate of candidates) {
        try {
            Deno.statSync(candidate);
            return candidate.replaceAll("\\", "/");
        } catch {
            continue;
        }
    }

    return undefined;
}

function normalizePathSegments(path: string): string {
    const segments = path.replaceAll("\\", "/").split("/");
    const normalized: string[] = [];

    for (const segment of segments) {
        if (!segment || segment === ".") {
            continue;
        }

        if (segment === "..") {
            normalized.pop();
            continue;
        }

        normalized.push(segment);
    }

    const hasDrivePrefix = /^[A-Za-z]:$/.test(normalized[0] ?? "");
    return hasDrivePrefix ? normalized.join("/") : `/${normalized.join("/")}`;
}

function hasExportModifier(node: ts.Node): boolean {
    return ts.canHaveModifiers(node) &&
        (ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ??
            false);
}

async function collectFilesystemPageFiles(pagesDir: string): Promise<string[]> {
    return await collectFilesystemFiles(pagesDir);
}

export function resolveTargetAppFile(
    target: NormalizedMainzTarget,
    cwd: string,
): string | undefined {
    if (target.appFile?.trim()) {
        return resolve(cwd, target.appFile);
    }

    const conventionalAppFile = resolve(cwd, target.rootDir, "src", "main.tsx");
    return existsSync(conventionalAppFile) ? conventionalAppFile : undefined;
}

function normalizeDiscoveredPagesResult<
    T extends {
        filesystemPageFiles: string[] | undefined;
        discoveredPages: CliDiscoveredPage[] | undefined;
        discoveryErrors: readonly CliPageDiscoveryError[] | undefined;
    },
>(result: T): T {
    const discoveredPages = result.discoveredPages
        ? normalizeDiscoveredPages(result.discoveredPages)
        : undefined;

    return {
        ...result,
        discoveredPages: discoveredPages?.length ? discoveredPages : undefined,
        discoveryErrors: result.discoveryErrors?.length ? result.discoveryErrors : undefined,
        filesystemPageFiles: result.filesystemPageFiles?.length
            ? [...result.filesystemPageFiles].sort((a, b) => a.localeCompare(b))
            : undefined,
    };
}

function normalizeDiscoveredPages(
    discoveredPages: readonly CliDiscoveredPage[],
): CliDiscoveredPage[] {
    return [...discoveredPages].sort((a, b) => {
        if (a.path !== b.path) {
            return a.path.localeCompare(b.path);
        }

        if (a.file !== b.file) {
            return a.file.localeCompare(b.file);
        }

        return a.exportName.localeCompare(b.exportName);
    });
}

function normalizePathSlashes(path: string): string {
    return path.replaceAll("\\", "/");
}

function classifyPageDiscoveryError(message: string): PageDiscoveryErrorKind {
    if (message.includes("@Locales() received invalid locale")) {
        return invalidLocalePageDiscoveryErrorKind;
    }

    return pageDiscoveryFailedErrorKind;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
    let current = expression;

    while (
        ts.isParenthesizedExpression(current) ||
        ts.isAsExpression(current) ||
        ts.isSatisfiesExpression(current) ||
        ts.isNonNullExpression(current) ||
        ts.isAwaitExpression(current)
    ) {
        current = current.expression;
    }

    return current;
}

function isNamedProperty(name: ts.PropertyName | undefined, expectedName: string): boolean {
    if (!name) {
        return false;
    }

    return (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) &&
        name.text === expectedName;
}

function readIdentifierLike(expression: ts.Expression): string | undefined {
    const normalizedExpression = unwrapExpression(expression);
    return ts.isIdentifier(normalizedExpression) ? normalizedExpression.text : undefined;
}

function visitNode(node: ts.Node, visitor: (node: ts.Node) => void): void {
    visitor(node);
    node.forEachChild((child) => visitNode(child, visitor));
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}
