import { ts } from "@/compiler/typescript.ts";
import type { CommandRegistrationFact, CommandSourceDiagnosticsInput } from "./facts.ts";

interface CommandDiagnosticsFileContext {
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

interface RoutedAppDefinitionResolution {
    appDefinition: ts.ObjectLiteralExpression;
    fileContext: CommandDiagnosticsFileContext;
}

interface ResolvedCommandExpression {
    expression: ts.Expression;
    fileContext: CommandDiagnosticsFileContext;
    exportName: string;
}

export async function discoverCommandFacts(
    sourceInputs: readonly CommandSourceDiagnosticsInput[],
    options?: {
        appId?: string;
    },
): Promise<readonly CommandRegistrationFact[]> {
    const fileContexts = createFileContexts(sourceInputs);
    return collectProjectCommandRegistrations(fileContexts, options);
}

function createFileContexts(
    files: readonly CommandSourceDiagnosticsInput[],
): ReadonlyMap<string, CommandDiagnosticsFileContext> {
    const contexts = new Map<string, CommandDiagnosticsFileContext>();

    for (const file of files) {
        const sourceFile = ts.createSourceFile(
            file.file,
            file.source,
            ts.ScriptTarget.Latest,
            true,
            file.file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
        );

        contexts.set(file.file, {
            file: file.file,
            sourceFile,
            variables: collectTopLevelVariableExpressions(sourceFile),
            imports: collectImports(sourceFile, file.file),
            exportedBindings: collectExportedBindings(sourceFile),
        });
    }

    return contexts;
}

function collectProjectCommandRegistrations(
    fileContexts: ReadonlyMap<string, CommandDiagnosticsFileContext>,
    options?: {
        appId?: string;
    },
): readonly CommandRegistrationFact[] {
    const registrations: CommandRegistrationFact[] = [];

    for (const fileContext of fileContexts.values()) {
        for (const appResolution of collectAppDefinitions(fileContext, fileContexts)) {
            const appId = readAppDefinitionId(appResolution.appDefinition);
            if (!appId || (options?.appId && appId !== options.appId)) {
                continue;
            }

            const commandsExpression = readNamedPropertyInitializer(
                appResolution.appDefinition,
                "commands",
            );
            if (!commandsExpression) {
                continue;
            }

            registrations.push(
                ...resolveCommandRegistrationsFromExpression(
                    commandsExpression,
                    appId,
                    appResolution.fileContext,
                    fileContexts,
                    new Set<string>(),
                    "(command)",
                ),
            );
        }
    }

    return registrations;
}

function collectAppDefinitions(
    fileContext: CommandDiagnosticsFileContext,
    fileContexts: ReadonlyMap<string, CommandDiagnosticsFileContext>,
): readonly RoutedAppDefinitionResolution[] {
    const found: RoutedAppDefinitionResolution[] = [];
    const seen = new Set<string>();

    visitNode(fileContext.sourceFile, (node) => {
        if (!ts.isCallExpression(node)) {
            return;
        }

        const callee = readIdentifierLike(node.expression);
        if (callee !== "startApp" && callee !== "defineApp") {
            return;
        }

        const candidates = collectAppDefinitionExpressions(
            node.arguments[0],
            fileContext,
            fileContexts,
            new Set<string>(),
            callee === "defineApp",
        );
        for (const candidate of candidates) {
            const candidateKey =
                `${candidate.fileContext.file}::${candidate.appDefinition.pos}::${candidate.appDefinition.end}`;
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
    fileContext: CommandDiagnosticsFileContext,
    fileContexts: ReadonlyMap<string, CommandDiagnosticsFileContext>,
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
                fileContext,
            }]
            : [];
    }

    if (
        ts.isCallExpression(normalizedExpression) &&
        readIdentifierLike(normalizedExpression.expression) === "defineApp"
    ) {
        return collectAppDefinitionExpressions(
            normalizedExpression.arguments[0],
            fileContext,
            fileContexts,
            visitedReferences,
            true,
        );
    }

    if (ts.isConditionalExpression(normalizedExpression)) {
        return [
            ...collectAppDefinitionExpressions(
                normalizedExpression.whenTrue,
                fileContext,
                fileContexts,
                new Set(visitedReferences),
                allowObjectLiteral,
            ),
            ...collectAppDefinitionExpressions(
                normalizedExpression.whenFalse,
                fileContext,
                fileContexts,
                new Set(visitedReferences),
                allowObjectLiteral,
            ),
        ];
    }

    if (!ts.isIdentifier(normalizedExpression)) {
        return [];
    }

    const referenceKey = `${fileContext.file}::app::${normalizedExpression.text}`;
    if (visitedReferences.has(referenceKey)) {
        return [];
    }

    visitedReferences.add(referenceKey);
    const resolved = resolveIdentifierExpression(
        fileContext,
        fileContexts,
        normalizedExpression.text,
    );
    if (!resolved) {
        return [];
    }

    return collectAppDefinitionExpressions(
        resolved.expression,
        resolved.fileContext,
        fileContexts,
        visitedReferences,
        allowObjectLiteral,
    );
}

function resolveCommandRegistrationsFromExpression(
    expression: ts.Expression,
    appId: string,
    fileContext: CommandDiagnosticsFileContext,
    fileContexts: ReadonlyMap<string, CommandDiagnosticsFileContext>,
    visitedReferences: Set<string>,
    exportName: string,
): readonly CommandRegistrationFact[] {
    const normalizedExpression = unwrapExpression(expression);

    if (ts.isArrayLiteralExpression(normalizedExpression)) {
        const registrations: CommandRegistrationFact[] = [];

        for (const element of normalizedExpression.elements) {
            if (ts.isSpreadElement(element)) {
                registrations.push(
                    ...resolveCommandRegistrationsFromExpression(
                        element.expression,
                        appId,
                        fileContext,
                        fileContexts,
                        new Set(visitedReferences),
                        exportName,
                    ),
                );
                continue;
            }

            if (!ts.isExpression(element)) {
                continue;
            }

            registrations.push(
                ...resolveCommandRegistrationsFromExpression(
                    element,
                    appId,
                    fileContext,
                    fileContexts,
                    new Set(visitedReferences),
                    exportName,
                ),
            );
        }

        return registrations;
    }

    if (ts.isConditionalExpression(normalizedExpression)) {
        return [
            ...resolveCommandRegistrationsFromExpression(
                normalizedExpression.whenTrue,
                appId,
                fileContext,
                fileContexts,
                new Set(visitedReferences),
                exportName,
            ),
            ...resolveCommandRegistrationsFromExpression(
                normalizedExpression.whenFalse,
                appId,
                fileContext,
                fileContexts,
                new Set(visitedReferences),
                exportName,
            ),
        ];
    }

    if (ts.isIdentifier(normalizedExpression)) {
        const referenceKey = `${fileContext.file}::command::${normalizedExpression.text}`;
        if (visitedReferences.has(referenceKey)) {
            return [];
        }

        visitedReferences.add(referenceKey);
        const resolved = resolveIdentifierExpression(
            fileContext,
            fileContexts,
            normalizedExpression.text,
        );
        if (!resolved) {
            return [];
        }

        return resolveCommandRegistrationsFromExpression(
            resolved.expression,
            appId,
            resolved.fileContext,
            fileContexts,
            visitedReferences,
            resolved.exportName,
        );
    }

    if (
        ts.isCallExpression(normalizedExpression) &&
        readIdentifierLike(normalizedExpression.expression) === "defineCommand"
    ) {
        const [commandDefinition] = normalizedExpression.arguments;
        return commandDefinition
            ? resolveCommandRegistrationsFromExpression(
                commandDefinition,
                appId,
                fileContext,
                fileContexts,
                visitedReferences,
                exportName,
            )
            : [];
    }

    if (!ts.isObjectLiteralExpression(normalizedExpression)) {
        return [];
    }

    const commandId = readCommandId(normalizedExpression);
    if (!commandId) {
        return [];
    }

    return [{
        appId,
        commandId,
        file: fileContext.file,
        exportName,
    }];
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

function readCommandId(commandDefinition: ts.ObjectLiteralExpression): string | undefined {
    const idExpression = readNamedPropertyInitializer(commandDefinition, "id");
    const normalizedIdExpression = idExpression ? unwrapExpression(idExpression) : undefined;
    if (!normalizedIdExpression || !ts.isStringLiteralLike(normalizedIdExpression)) {
        return undefined;
    }

    const commandId = normalizedIdExpression.text.trim();
    return commandId.length > 0 ? commandId : undefined;
}

function isAppDefinitionObjectLiteral(objectLiteral: ts.ObjectLiteralExpression): boolean {
    return hasNamedProperty(objectLiteral, "pages") || hasNamedProperty(objectLiteral, "root");
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

function resolveIdentifierExpression(
    fileContext: CommandDiagnosticsFileContext,
    fileContexts: ReadonlyMap<string, CommandDiagnosticsFileContext>,
    identifierName: string,
): ResolvedCommandExpression | undefined {
    const localVariable = fileContext.variables.get(identifierName);
    if (localVariable) {
        return {
            expression: localVariable,
            fileContext,
            exportName: identifierName,
        };
    }

    const importedBinding = fileContext.imports.get(identifierName);
    if (!importedBinding) {
        return undefined;
    }

    const importedContext = fileContexts.get(importedBinding.sourceFile);
    if (!importedContext) {
        return undefined;
    }

    const exportedExpression = importedContext.exportedBindings.get(importedBinding.importedName);
    if (!exportedExpression) {
        return undefined;
    }

    return {
        expression: exportedExpression,
        fileContext: importedContext,
        exportName: importedBinding.importedName,
    };
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

function readIdentifierLike(expression: ts.Expression): string | undefined {
    const normalizedExpression = unwrapExpression(expression);
    return ts.isIdentifier(normalizedExpression) ? normalizedExpression.text : undefined;
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

function visitNode(node: ts.Node, visitor: (node: ts.Node) => void): void {
    visitor(node);
    node.forEachChild((child) => visitNode(child, visitor));
}
