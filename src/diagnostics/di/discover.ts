import { ts } from "../../compiler/typescript.ts";
import type {
    DiDiagnosticsFacts,
    DiInjectionFact,
    DiRegistrationCycleFact,
    DiRegistrationFact,
    DiSourceDiagnosticsInput,
    DiTokenReference,
} from "./facts.ts";

interface DiDiagnosticFileContext {
    file: string;
    sourceFile: ts.SourceFile;
    variables: ReadonlyMap<string, ts.Expression>;
    functions: ReadonlyMap<string, ts.Expression>;
    classes: ReadonlyMap<string, ts.ClassDeclaration>;
    imports: ReadonlyMap<string, ImportedBinding>;
    exportedBindings: ReadonlyMap<string, ts.Expression>;
    exportedClasses: ReadonlyMap<string, ts.ClassDeclaration>;
}

interface ImportedBinding {
    importedName: string;
    sourceFile: string;
}

interface ResolvedDiExpression {
    expression: ts.Expression;
    fileContext: DiDiagnosticFileContext;
}

export async function discoverDiFacts(
    sourceInputs: readonly DiSourceDiagnosticsInput[],
    options?: {
        appId?: string;
    },
): Promise<DiDiagnosticsFacts> {
    const fileContexts = createFileContexts(sourceInputs);
    const registrations = collectProjectServiceRegistrations(fileContexts, options);
    return {
        registrations,
        injections: collectProjectInjectionUsages(fileContexts),
        cycles: collectRegistrationCycles(registrations),
    };
}
function createFileContexts(
    files: readonly DiSourceDiagnosticsInput[],
): ReadonlyMap<string, DiDiagnosticFileContext> {
    const contexts = new Map<string, DiDiagnosticFileContext>();

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
            functions: collectTopLevelFunctionExpressions(sourceFile),
            classes: collectTopLevelClassDeclarations(sourceFile),
            imports: collectImports(sourceFile, file.file),
            exportedBindings: collectExportedBindings(sourceFile),
            exportedClasses: collectExportedClasses(sourceFile),
        });
    }

    return contexts;
}

function collectProjectServiceRegistrations(
    fileContexts: ReadonlyMap<string, DiDiagnosticFileContext>,
    options?: {
        appId?: string;
    },
): readonly DiRegistrationFact[] {
    const registrations: DiRegistrationFact[] = [];

    for (const fileContext of fileContexts.values()) {
        visitNode(fileContext.sourceFile, (node) => {
            if (!ts.isCallExpression(node)) {
                return;
            }

            const callee = readIdentifierLike(node.expression);
            if (callee !== "startApp") {
                return;
            }

            const servicesResolutions = extractServicesExpressionsFromAppDefinition(
                node.arguments[0],
                fileContext,
                fileContexts,
                new Set<string>(),
                false,
                options?.appId,
            );
            const resolvedExpressions = Array.isArray(servicesResolutions)
                ? servicesResolutions
                : servicesResolutions
                ? [servicesResolutions]
                : [];
            if (resolvedExpressions.length === 0) {
                return;
            }

            for (const servicesResolution of resolvedExpressions) {
                registrations.push(
                    ...resolveServiceRegistrationsFromExpression(
                        servicesResolution.expression,
                        servicesResolution.fileContext,
                        fileContexts,
                        new Set<string>(),
                    ),
                );
            }
        });
    }

    const deduped = new Map<string, DiRegistrationFact>();
    for (const registration of registrations) {
        deduped.set(`${registration.file}::${registration.token.key}`, registration);
    }

    return [...deduped.values()];
}

function collectProjectInjectionUsages(
    fileContexts: ReadonlyMap<string, DiDiagnosticFileContext>,
): readonly DiInjectionFact[] {
    const usages: DiInjectionFact[] = [];

    for (const fileContext of fileContexts.values()) {
        visitNode(fileContext.sourceFile, (node) => {
            if (!ts.isClassDeclaration(node) || !node.name || !isExportedClassDeclaration(node)) {
                return;
            }

            for (const member of node.members) {
                const token = readMemberInjectionToken(member);
                if (!token) {
                    continue;
                }

                usages.push({
                    token,
                    file: fileContext.file,
                    exportName: node.name.text,
                });
            }
        });
    }

    return usages;
}

function resolveServiceRegistrationsFromExpression(
    expression: ts.Expression,
    fileContext: DiDiagnosticFileContext,
    fileContexts: ReadonlyMap<string, DiDiagnosticFileContext>,
    visitedReferences: Set<string>,
): readonly DiRegistrationFact[] {
    const normalizedExpression = unwrapExpression(expression);

    if (ts.isArrayLiteralExpression(normalizedExpression)) {
        const registrations: DiRegistrationFact[] = [];
        for (const element of normalizedExpression.elements) {
            if (ts.isSpreadElement(element)) {
                registrations.push(
                    ...resolveServiceRegistrationsFromExpression(
                        element.expression,
                        fileContext,
                        fileContexts,
                        new Set(visitedReferences),
                    ),
                );
                continue;
            }

            if (!ts.isExpression(element)) {
                continue;
            }

            const registration = resolveServiceRegistrationCall(element, fileContext, fileContexts);
            if (registration) {
                registrations.push(registration);
            }
        }

        return registrations;
    }

    if (ts.isIdentifier(normalizedExpression)) {
        const referenceKey = `${fileContext.file}::${normalizedExpression.text}`;
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

        return resolveServiceRegistrationsFromExpression(
            resolved.expression,
            resolved.fileContext,
            fileContexts,
            visitedReferences,
        );
    }

    const registration = resolveServiceRegistrationCall(
        normalizedExpression,
        fileContext,
        fileContexts,
    );
    return registration ? [registration] : [];
}

function resolveServiceRegistrationCall(
    expression: ts.Expression,
    fileContext: DiDiagnosticFileContext,
    fileContexts: ReadonlyMap<string, DiDiagnosticFileContext>,
): DiRegistrationFact | undefined {
    const normalizedExpression = unwrapExpression(expression);
    if (!ts.isCallExpression(normalizedExpression)) {
        return undefined;
    }

    const callee = readIdentifierLike(normalizedExpression.expression);
    if (callee !== "singleton" && callee !== "transient") {
        return undefined;
    }

    const [tokenExpression, implementationOrFactoryExpression] = normalizedExpression.arguments;
    const token = readTokenReference(tokenExpression);
    if (!token) {
        return undefined;
    }

    return {
        token,
        lifetime: callee,
        dependencies: collectRegistrationDependencies(
            tokenExpression,
            implementationOrFactoryExpression,
            fileContext,
            fileContexts,
        ),
        file: fileContext.file,
    };
}

function collectRegistrationDependencies(
    tokenExpression: ts.Expression | undefined,
    implementationOrFactoryExpression: ts.Expression | undefined,
    fileContext: DiDiagnosticFileContext,
    fileContexts: ReadonlyMap<string, DiDiagnosticFileContext>,
): readonly DiTokenReference[] {
    if (!implementationOrFactoryExpression) {
        return collectClassDependencies(tokenExpression, fileContext, fileContexts);
    }

    const classDependencies = collectClassDependencies(
        implementationOrFactoryExpression,
        fileContext,
        fileContexts,
    );
    if (classDependencies.length > 0) {
        return classDependencies;
    }

    return collectFactoryDependencies(
        implementationOrFactoryExpression,
        fileContext,
        fileContexts,
    );
}

function collectFactoryDependencies(
    expression: ts.Expression,
    fileContext: DiDiagnosticFileContext,
    fileContexts: ReadonlyMap<string, DiDiagnosticFileContext>,
    visitedReferences = new Set<string>(),
): readonly DiTokenReference[] {
    const callable = resolveCallableExpression(
        expression,
        fileContext,
        fileContexts,
        visitedReferences,
    );
    if (!callable || (!ts.isArrowFunction(callable) && !ts.isFunctionExpression(callable))) {
        return [];
    }

    const directGetNames = new Set<string>();
    const contextParameterNames = new Set<string>();
    const [firstParameter] = callable.parameters;
    if (firstParameter) {
        if (ts.isObjectBindingPattern(firstParameter.name)) {
            for (const element of firstParameter.name.elements) {
                if (!ts.isIdentifier(element.name)) {
                    continue;
                }

                const propertyName = element.propertyName && ts.isIdentifier(element.propertyName)
                    ? element.propertyName.text
                    : ts.isIdentifier(element.name)
                    ? element.name.text
                    : undefined;
                if (propertyName === "get") {
                    directGetNames.add(element.name.text);
                }
            }
        } else if (ts.isIdentifier(firstParameter.name)) {
            contextParameterNames.add(firstParameter.name.text);
        }
    }

    const dependencies: DiTokenReference[] = [];
    const seenDependencies = new Set<string>();
    visitNode(callable.body, (node) => {
        if (!ts.isCallExpression(node)) {
            return;
        }

        const dependency = readFactoryDependency(node, directGetNames, contextParameterNames);
        if (!dependency || seenDependencies.has(dependency.key)) {
            return;
        }

        seenDependencies.add(dependency.key);
        dependencies.push(dependency);
    });

    return dependencies;
}

function collectClassDependencies(
    expression: ts.Expression | undefined,
    fileContext: DiDiagnosticFileContext,
    fileContexts: ReadonlyMap<string, DiDiagnosticFileContext>,
    visitedReferences = new Set<string>(),
): readonly DiTokenReference[] {
    if (!expression) {
        return [];
    }

    const classDeclaration = resolveClassDeclaration(
        expression,
        fileContext,
        fileContexts,
        visitedReferences,
    );
    if (!classDeclaration) {
        return [];
    }

    const dependencies: DiTokenReference[] = [];
    const seenDependencies = new Set<string>();
    for (const member of classDeclaration.members) {
        const dependency = readMemberInjectionToken(member);
        if (!dependency || seenDependencies.has(dependency.key)) {
            continue;
        }

        seenDependencies.add(dependency.key);
        dependencies.push(dependency);
    }

    return dependencies;
}

function readFactoryDependency(
    node: ts.CallExpression,
    directGetNames: ReadonlySet<string>,
    contextParameterNames: ReadonlySet<string>,
): DiTokenReference | undefined {
    const [tokenExpression] = node.arguments;
    if (!tokenExpression) {
        return undefined;
    }

    if (ts.isIdentifier(node.expression) && directGetNames.has(node.expression.text)) {
        return readTokenReference(tokenExpression);
    }

    if (
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "get" &&
        ts.isIdentifier(node.expression.expression) &&
        contextParameterNames.has(node.expression.expression.text)
    ) {
        return readTokenReference(tokenExpression);
    }

    return undefined;
}

function collectRegistrationCycles(
    registrations: readonly DiRegistrationFact[],
): readonly DiRegistrationCycleFact[] {
    const registrationsByToken = new Map(
        registrations.map((registration) => [registration.token.key, registration]),
    );
    const cycles: DiRegistrationCycleFact[] = [];
    const emittedCycles = new Set<string>();

    for (const registration of registrations) {
        const cycle = detectCycleFromToken(registration.token.key, registrationsByToken);
        if (!cycle) {
            continue;
        }

        const canonicalCycleKey = canonicalizeCycle(cycle);
        if (emittedCycles.has(canonicalCycleKey)) {
            continue;
        }

        emittedCycles.add(canonicalCycleKey);
        cycles.push({
            cycle,
            file: registration.file,
            exportName: registration.token.name,
        });
    }

    return cycles;
}

function detectCycleFromToken(
    tokenKey: string,
    registrationsByToken: ReadonlyMap<string, DiRegistrationFact>,
): readonly DiTokenReference[] | undefined {
    return walkRegistrationGraph(tokenKey, registrationsByToken, [], new Set<string>());
}

function walkRegistrationGraph(
    tokenKey: string,
    registrationsByToken: ReadonlyMap<string, DiRegistrationFact>,
    stack: readonly DiTokenReference[],
    active: Set<string>,
): readonly DiTokenReference[] | undefined {
    const registration = registrationsByToken.get(tokenKey);
    if (!registration) {
        return undefined;
    }

    const currentStack = [...stack, registration.token];
    if (active.has(tokenKey)) {
        const cycleStartIndex = stack.findIndex((entry) => entry.key === tokenKey);
        return cycleStartIndex >= 0
            ? [...stack.slice(cycleStartIndex), registration.token]
            : currentStack;
    }

    active.add(tokenKey);
    try {
        for (const dependency of registration.dependencies) {
            const cycle = walkRegistrationGraph(
                dependency.key,
                registrationsByToken,
                currentStack,
                active,
            );
            if (cycle) {
                return cycle;
            }
        }
    } finally {
        active.delete(tokenKey);
    }

    return undefined;
}

function canonicalizeCycle(cycle: readonly DiTokenReference[]): string {
    const closedCycle = cycle.length > 1 && cycle[0]?.key === cycle[cycle.length - 1]?.key
        ? cycle.slice(0, -1)
        : cycle;
    if (closedCycle.length === 0) {
        return "";
    }

    const rotations = closedCycle.map((_, startIndex) =>
        [...closedCycle.slice(startIndex), ...closedCycle.slice(0, startIndex)].map((token) =>
            token.key
        ).join("->")
    );
    return rotations.sort()[0];
}

function extractServicesExpression(node: ts.Expression | undefined): ts.Expression | undefined {
    const normalizedNode = node ? unwrapExpression(node) : undefined;
    if (!normalizedNode || !ts.isObjectLiteralExpression(normalizedNode)) {
        return undefined;
    }

    for (const property of normalizedNode.properties) {
        if (
            ts.isPropertyAssignment(property) &&
            isNamedProperty(property.name, "services")
        ) {
            return property.initializer;
        }

        if (ts.isShorthandPropertyAssignment(property) && property.name.text === "services") {
            return property.name;
        }
    }

    return undefined;
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

function extractServicesExpressionsFromAppDefinition(
    node: ts.Expression | undefined,
    fileContext: DiDiagnosticFileContext,
    fileContexts: ReadonlyMap<string, DiDiagnosticFileContext>,
    visitedReferences: Set<string>,
    allowObjectLiteral: boolean,
    appId?: string,
): readonly ResolvedDiExpression[] {
    const normalizedNode = node ? unwrapExpression(node) : undefined;
    if (!normalizedNode) {
        return [];
    }

    if (allowObjectLiteral) {
        const discoveredAppId = readAppIdFromAppDefinition(normalizedNode);
        if (appId && discoveredAppId !== appId) {
            return [];
        }

        const directServices = extractServicesExpression(normalizedNode);
        if (directServices) {
            return [{
                expression: directServices,
                fileContext,
            }];
        }

        return [];
    }

    if (
        ts.isCallExpression(normalizedNode) &&
        readIdentifierLike(normalizedNode.expression) === "defineApp"
    ) {
        return extractServicesExpressionsFromAppDefinition(
            normalizedNode.arguments[0],
            fileContext,
            fileContexts,
            visitedReferences,
            true,
            appId,
        );
    }

    if (ts.isConditionalExpression(normalizedNode)) {
        return [
            ...extractServicesExpressionsFromAppDefinition(
                normalizedNode.whenTrue,
                fileContext,
                fileContexts,
                new Set(visitedReferences),
                allowObjectLiteral,
                appId,
            ),
            ...extractServicesExpressionsFromAppDefinition(
                normalizedNode.whenFalse,
                fileContext,
                fileContexts,
                new Set(visitedReferences),
                allowObjectLiteral,
                appId,
            ),
        ];
    }

    if (!ts.isIdentifier(normalizedNode)) {
        return [];
    }

    const referenceKey = `${fileContext.file}::app::${normalizedNode.text}`;
    if (visitedReferences.has(referenceKey)) {
        return [];
    }

    visitedReferences.add(referenceKey);
    const resolved = resolveIdentifierExpression(
        fileContext,
        fileContexts,
        normalizedNode.text,
    );
    if (!resolved) {
        return [];
    }

    return extractServicesExpressionsFromAppDefinition(
        resolved.expression,
        resolved.fileContext,
        fileContexts,
        visitedReferences,
        allowObjectLiteral,
        appId,
    );
}

function readAppIdFromAppDefinition(expression: ts.Expression): string | undefined {
    const normalizedExpression = unwrapExpression(expression);
    if (!ts.isObjectLiteralExpression(normalizedExpression)) {
        return undefined;
    }

    const idExpression = readNamedPropertyInitializer(normalizedExpression, "id");
    const normalizedIdExpression = idExpression ? unwrapExpression(idExpression) : undefined;
    if (!normalizedIdExpression || !ts.isStringLiteralLike(normalizedIdExpression)) {
        return undefined;
    }

    const appId = normalizedIdExpression.text.trim();
    return appId.length > 0 ? appId : undefined;
}

function readMemberInjectionToken(node: ts.ClassElement): DiTokenReference | undefined {
    if (!ts.isPropertyDeclaration(node) || !node.initializer) {
        return undefined;
    }

    const initializer = unwrapExpression(node.initializer);
    if (!ts.isCallExpression(initializer)) {
        return undefined;
    }

    if (!ts.isIdentifier(initializer.expression) || initializer.expression.text !== "inject") {
        return undefined;
    }

    return readTokenReference(initializer.arguments[0]);
}

function readTokenReference(expression: ts.Expression | undefined): DiTokenReference | undefined {
    if (!expression) {
        return undefined;
    }

    const normalizedExpression = unwrapExpression(expression);
    if (ts.isIdentifier(normalizedExpression)) {
        return {
            key: normalizedExpression.text,
            name: normalizedExpression.text,
        };
    }

    if (ts.isPropertyAccessExpression(normalizedExpression)) {
        const name = normalizedExpression.getText();
        return {
            key: name,
            name,
        };
    }

    return undefined;
}

function resolveIdentifierExpression(
    fileContext: DiDiagnosticFileContext,
    fileContexts: ReadonlyMap<string, DiDiagnosticFileContext>,
    identifierName: string,
): ResolvedDiExpression | undefined {
    const localVariable = fileContext.variables.get(identifierName);
    if (localVariable) {
        return {
            expression: localVariable,
            fileContext,
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
    };
}

function resolveCallableExpression(
    expression: ts.Expression,
    fileContext: DiDiagnosticFileContext,
    fileContexts: ReadonlyMap<string, DiDiagnosticFileContext>,
    visitedReferences: Set<string>,
): ts.Expression | undefined {
    const normalizedExpression = unwrapExpression(expression);
    if (ts.isArrowFunction(normalizedExpression) || ts.isFunctionExpression(normalizedExpression)) {
        return normalizedExpression;
    }

    if (!ts.isIdentifier(normalizedExpression)) {
        return undefined;
    }

    const referenceKey = `${fileContext.file}::callable::${normalizedExpression.text}`;
    if (visitedReferences.has(referenceKey)) {
        return undefined;
    }

    visitedReferences.add(referenceKey);
    const localFunction = fileContext.functions.get(normalizedExpression.text);
    if (localFunction) {
        return resolveCallableExpression(
            localFunction,
            fileContext,
            fileContexts,
            visitedReferences,
        );
    }

    const resolved = resolveIdentifierExpression(
        fileContext,
        fileContexts,
        normalizedExpression.text,
    );
    if (!resolved) {
        return undefined;
    }

    return resolveCallableExpression(
        resolved.expression,
        resolved.fileContext,
        fileContexts,
        visitedReferences,
    );
}

function resolveClassDeclaration(
    expression: ts.Expression,
    fileContext: DiDiagnosticFileContext,
    fileContexts: ReadonlyMap<string, DiDiagnosticFileContext>,
    visitedReferences: Set<string>,
): ts.ClassDeclaration | ts.ClassExpression | undefined {
    const normalizedExpression = unwrapExpression(expression);
    if (ts.isClassExpression(normalizedExpression)) {
        return normalizedExpression;
    }

    if (!ts.isIdentifier(normalizedExpression)) {
        return undefined;
    }

    const referenceKey = `${fileContext.file}::class::${normalizedExpression.text}`;
    if (visitedReferences.has(referenceKey)) {
        return undefined;
    }

    visitedReferences.add(referenceKey);

    const localClass = fileContext.classes.get(normalizedExpression.text);
    if (localClass) {
        return localClass;
    }

    const localVariable = fileContext.variables.get(normalizedExpression.text);
    if (localVariable) {
        return resolveClassDeclaration(
            localVariable,
            fileContext,
            fileContexts,
            visitedReferences,
        );
    }

    const importedBinding = fileContext.imports.get(normalizedExpression.text);
    if (!importedBinding) {
        return undefined;
    }

    const importedContext = fileContexts.get(importedBinding.sourceFile);
    if (!importedContext) {
        return undefined;
    }

    const exportedClass = importedContext.exportedClasses.get(importedBinding.importedName);
    if (exportedClass) {
        return exportedClass;
    }

    const exportedExpression = importedContext.exportedBindings.get(importedBinding.importedName);
    if (!exportedExpression) {
        return undefined;
    }

    return resolveClassDeclaration(
        exportedExpression,
        importedContext,
        fileContexts,
        visitedReferences,
    );
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

function collectTopLevelFunctionExpressions(
    sourceFile: ts.SourceFile,
): ReadonlyMap<string, ts.Expression> {
    const functions = new Map<string, ts.Expression>();

    for (const statement of sourceFile.statements) {
        if (ts.isFunctionDeclaration(statement) && statement.name) {
            functions.set(
                statement.name.text,
                ts.factory.createFunctionExpression(
                    undefined,
                    statement.asteriskToken,
                    undefined,
                    statement.typeParameters,
                    statement.parameters,
                    statement.type,
                    statement.body ?? ts.factory.createBlock([]),
                ),
            );
            continue;
        }

        if (!ts.isVariableStatement(statement)) {
            continue;
        }

        for (const declaration of statement.declarationList.declarations) {
            if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
                continue;
            }

            const initializer = unwrapExpression(declaration.initializer);
            if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
                functions.set(declaration.name.text, initializer);
            }
        }
    }

    return functions;
}

function collectTopLevelClassDeclarations(
    sourceFile: ts.SourceFile,
): ReadonlyMap<string, ts.ClassDeclaration> {
    const classes = new Map<string, ts.ClassDeclaration>();

    for (const statement of sourceFile.statements) {
        if (!ts.isClassDeclaration(statement) || !statement.name) {
            continue;
        }

        classes.set(statement.name.text, statement);
    }

    return classes;
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

function collectExportedClasses(
    sourceFile: ts.SourceFile,
): ReadonlyMap<string, ts.ClassDeclaration> {
    const classes = new Map<string, ts.ClassDeclaration>();

    for (const statement of sourceFile.statements) {
        if (!ts.isClassDeclaration(statement) || !hasExportModifier(statement)) {
            continue;
        }

        if (statement.name) {
            classes.set(statement.name.text, statement);
        }

        if (hasDefaultModifier(statement)) {
            classes.set("default", statement);
        }
    }

    return classes;
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

function isExportedClassDeclaration(node: ts.ClassDeclaration): boolean {
    return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ??
        false;
}

function hasExportModifier(node: ts.Node): boolean {
    return ts.canHaveModifiers(node) &&
        (ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ??
            false);
}

function hasDefaultModifier(node: ts.Node): boolean {
    return ts.canHaveModifiers(node) &&
        (ts.getModifiers(node)?.some((modifier) =>
            modifier.kind === ts.SyntaxKind.DefaultKeyword
        ) ??
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
