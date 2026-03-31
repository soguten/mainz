/// <reference lib="deno.ns" />

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { ts } from "@/compiler/typescript.ts";
import { discoverPagesFromFile } from "../routing/server.ts";
import type { RenderMode } from "../routing/index.ts";
import type { PageAuthorizationMetadata } from "../authorization/index.ts";
import type { PageHeadDefinition } from "../components/page.ts";
import type { NormalizedMainzTarget } from "../config/index.ts";
import {
    invalidLocalePageDiscoveryErrorKind,
    type PageDiscoveryError,
    type PageDiscoveryErrorKind,
    pageDiscoveryFailedErrorKind,
} from "../routing/page-discovery-errors.ts";

export interface CliDiscoveredPage {
    file: string;
    exportName: string;
    path: string;
    mode: RenderMode;
    hasExplicitRenderMode?: boolean;
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
        const appDiscovery = await resolveTargetDiscoveredPagesFromAppFile(
            resolvedAppFile,
            target.appFile !== undefined,
        );
        if (appDiscovery.foundAppDefinition) {
            return normalizeDiscoveredPagesResult(appDiscovery);
        }

        if (appDiscovery.discoveryErrors?.length) {
            return normalizeDiscoveredPagesResult(appDiscovery);
        }
    }

    return await resolveTargetDiscoveredPages(target.pagesDir, cwd);
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

async function resolveTargetDiscoveredPagesFromAppFile(
    appFile: string,
    explicit: boolean,
): Promise<{
    filesystemPageFiles: string[] | undefined;
    discoveredPages: CliDiscoveredPage[] | undefined;
    discoveryErrors: readonly CliPageDiscoveryError[] | undefined;
    foundAppDefinition: boolean;
}> {
    const normalizedAppFile = normalizePathSlashes(resolve(appFile));
    if (!existsSync(normalizedAppFile)) {
        if (!explicit) {
            return {
                filesystemPageFiles: undefined,
                discoveredPages: undefined,
                discoveryErrors: undefined,
                foundAppDefinition: false,
            };
        }

        return {
            filesystemPageFiles: undefined,
            discoveredPages: undefined,
            discoveryErrors: [{
                kind: pageDiscoveryFailedErrorKind,
                file: normalizedAppFile,
                message: `Configured appFile "${normalizedAppFile}" could not be found.`,
            }],
            foundAppDefinition: false,
        };
    }

    let source: string;
    try {
        source = await Deno.readTextFile(normalizedAppFile);
    } catch (error) {
        return {
            filesystemPageFiles: undefined,
            discoveredPages: undefined,
            discoveryErrors: [{
                kind: pageDiscoveryFailedErrorKind,
                file: normalizedAppFile,
                message: `Could not read app module "${normalizedAppFile}": ${
                    toErrorMessage(error)
                }`,
            }],
            foundAppDefinition: false,
        };
    }

    const contexts = new Map<string, AppFileContext>();
    const context = createAppFileContext(normalizedAppFile, source);
    contexts.set(normalizedAppFile, context);
    const appResolution = findRoutedAppDefinition(context, contexts);
    if (!appResolution) {
        return {
            filesystemPageFiles: undefined,
            discoveredPages: undefined,
            discoveryErrors: undefined,
            foundAppDefinition: false,
        };
    }

    const references = readAppPageReferences(appResolution.appDefinition);
    const discoveredPages: CliDiscoveredPage[] = [];
    const discoveryErrors: CliPageDiscoveryError[] = [];
    const pageFiles = new Set<string>();

    for (const reference of references) {
        const importedBinding = appResolution.context.imports.get(reference.localName);
        if (!importedBinding) {
            discoveryErrors.push({
                kind: pageDiscoveryFailedErrorKind,
                file: normalizedAppFile,
                message:
                    `App definition "${normalizedAppFile}" references "${reference.localName}" in pages/notFound, ` +
                    "but only directly imported page constructors are currently supported there.",
            });
            continue;
        }

        pageFiles.add(importedBinding.sourceFile);

        try {
            const pageEntries = await discoverPagesFromFile(importedBinding.sourceFile);
            const discoveredPage = pageEntries.find((entry) =>
                entry.exportName === importedBinding.importedName
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
                notFound: reference.notFound ? true : discoveredPage.page.notFound,
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

    return normalizeDiscoveredPagesResult({
        filesystemPageFiles: pageFiles.size > 0
            ? [...pageFiles].sort((a, b) => a.localeCompare(b))
            : undefined,
        discoveredPages,
        discoveryErrors,
        foundAppDefinition: true,
    });
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

function findRoutedAppDefinition(
    context: AppFileContext,
    contexts: Map<string, AppFileContext>,
): RoutedAppDefinitionResolution | undefined {
    let found: RoutedAppDefinitionResolution | undefined;

    visitNode(context.sourceFile, (node) => {
        if (found || !ts.isCallExpression(node)) {
            return;
        }

        const callee = readIdentifierLike(node.expression);
        if (callee !== "startApp" && callee !== "defineApp") {
            return;
        }

        const candidate = resolveRoutedAppDefinitionExpression(
            node.arguments[0],
            context,
            contexts,
            new Set<string>(),
            callee === "defineApp",
        );
        if (candidate) {
            found = candidate;
        }
    });

    return found;
}

function resolveRoutedAppDefinitionExpression(
    expression: ts.Expression | undefined,
    context: AppFileContext,
    contexts: Map<string, AppFileContext>,
    visitedReferences: Set<string>,
    allowObjectLiteral: boolean,
): RoutedAppDefinitionResolution | undefined {
    const normalizedExpression = expression ? unwrapExpression(expression) : undefined;
    if (!normalizedExpression) {
        return undefined;
    }

    if (ts.isObjectLiteralExpression(normalizedExpression)) {
        return allowObjectLiteral && hasNamedProperty(normalizedExpression, "pages")
            ? {
                appDefinition: normalizedExpression,
                context,
            }
            : undefined;
    }

    if (
        ts.isCallExpression(normalizedExpression) &&
        readIdentifierLike(normalizedExpression.expression) === "defineApp"
    ) {
        return resolveRoutedAppDefinitionExpression(
            normalizedExpression.arguments[0],
            context,
            contexts,
            visitedReferences,
            true,
        );
    }

    if (!ts.isIdentifier(normalizedExpression)) {
        return undefined;
    }

    const referenceKey = `${context.file}::${normalizedExpression.text}`;
    if (visitedReferences.has(referenceKey)) {
        return undefined;
    }

    visitedReferences.add(referenceKey);
    const resolved = resolveIdentifierExpression(context, contexts, normalizedExpression.text);
    if (!resolved) {
        return undefined;
    }

    return resolveRoutedAppDefinitionExpression(
        resolved.expression,
        resolved.context,
        contexts,
        visitedReferences,
        allowObjectLiteral,
    );
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
    const discoveredPages = result.discoveredPages?.sort((a, b) => {
        if (a.path !== b.path) {
            return a.path.localeCompare(b.path);
        }

        if (a.file !== b.file) {
            return a.file.localeCompare(b.file);
        }

        return a.exportName.localeCompare(b.exportName);
    });

    return {
        ...result,
        discoveredPages: discoveredPages?.length ? discoveredPages : undefined,
        discoveryErrors: result.discoveryErrors?.length ? result.discoveryErrors : undefined,
        filesystemPageFiles: result.filesystemPageFiles?.length
            ? [...result.filesystemPageFiles].sort((a, b) => a.localeCompare(b))
            : undefined,
    };
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
