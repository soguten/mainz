import ts from "npm:typescript";

export interface DiSourceDiagnosticsInput {
    file: string;
    source: string;
}

export interface DiDiagnostic {
    code:
        | "di-token-not-registered"
        | "di-factory-dependency-not-registered"
        | "di-registration-cycle";
    severity: "error";
    message: string;
    file: string;
    exportName: string;
    routePath?: string;
}

interface DiDiagnosticFileContext {
    file: string;
    sourceFile: ts.SourceFile;
    variables: ReadonlyMap<string, ts.Expression>;
    functions: ReadonlyMap<string, ts.Expression>;
    imports: ReadonlyMap<string, ImportedBinding>;
    exportedBindings: ReadonlyMap<string, ts.Expression>;
}

interface ImportedBinding {
    importedName: string;
    sourceFile: string;
}

interface DiTokenReference {
    key: string;
    name: string;
}

interface DiRegistration {
    token: DiTokenReference;
    lifetime: "singleton" | "transient";
    dependencies: readonly DiTokenReference[];
    file: string;
}

interface InjectionUsage {
    token: DiTokenReference;
    file: string;
    exportName: string;
}

export async function collectDiDiagnostics(
    files: readonly DiSourceDiagnosticsInput[],
    options?: {
        routePathsByOwner?: ReadonlyMap<string, string>;
    },
): Promise<readonly DiDiagnostic[]> {
    const fileContexts = createFileContexts(files);
    const registrations = collectProjectServiceRegistrations(fileContexts);
    const injections = collectProjectInjectionUsages(fileContexts);
    const diagnostics: DiDiagnostic[] = [];
    const registrationsByToken = new Map(registrations.map((registration) => [registration.token.key, registration]));
    const routePathsByOwner = options?.routePathsByOwner ?? new Map<string, string>();
    const seenInjectedDiagnostics = new Set<string>();
    const seenFactoryDiagnostics = new Set<string>();

    for (const injection of injections) {
        if (registrationsByToken.has(injection.token.key)) {
            continue;
        }

        const diagnosticKey = `${injection.file}::${injection.exportName}::${injection.token.key}`;
        if (seenInjectedDiagnostics.has(diagnosticKey)) {
            continue;
        }

        seenInjectedDiagnostics.add(diagnosticKey);
        diagnostics.push({
            code: "di-token-not-registered",
            severity: "error",
            message:
                `Class "${injection.exportName}" injects "${injection.token.name}" with mainz/di, ` +
                'but that token is not registered in app startup services.',
            file: injection.file,
            exportName: injection.exportName,
            routePath: routePathsByOwner.get(createOwnerKey(injection.file, injection.exportName)),
        });
    }

    for (const registration of registrations) {
        for (const dependency of registration.dependencies) {
            if (registrationsByToken.has(dependency.key)) {
                continue;
            }

            const diagnosticKey = `${registration.file}::${registration.token.key}::${dependency.key}`;
            if (seenFactoryDiagnostics.has(diagnosticKey)) {
                continue;
            }

            seenFactoryDiagnostics.add(diagnosticKey);
            diagnostics.push({
                code: "di-factory-dependency-not-registered",
                severity: "error",
                message:
                    `Service "${registration.token.name}" depends on "${dependency.name}" through get(...), ` +
                    "but that dependency is not registered in app startup services.",
                file: registration.file,
                exportName: registration.token.name,
            });
        }
    }

    diagnostics.push(...collectRegistrationCycleDiagnostics(registrations));
    return diagnostics.sort(compareDiDiagnostics);
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
            imports: collectImports(sourceFile, file.file),
            exportedBindings: collectExportedBindings(sourceFile),
        });
    }

    return contexts;
}

function collectProjectServiceRegistrations(
    fileContexts: ReadonlyMap<string, DiDiagnosticFileContext>,
): readonly DiRegistration[] {
    const registrations: DiRegistration[] = [];

    for (const fileContext of fileContexts.values()) {
        visitNode(fileContext.sourceFile, (node) => {
            if (!ts.isCallExpression(node)) {
                return;
            }

            const callee = readIdentifierLike(node.expression);
            if (callee !== "startApp" && callee !== "startApp" && callee !== "startNavigation") {
                return;
            }

            const [optionsArgument] = node.arguments;
            const servicesExpression = extractServicesExpression(optionsArgument);
            if (!servicesExpression) {
                return;
            }

            registrations.push(
                ...resolveServiceRegistrationsFromExpression(
                    servicesExpression,
                    fileContext,
                    fileContexts,
                    new Set<string>(),
                ),
            );
        });
    }

    const deduped = new Map<string, DiRegistration>();
    for (const registration of registrations) {
        deduped.set(`${registration.file}::${registration.token.key}`, registration);
    }

    return [...deduped.values()];
}

function collectProjectInjectionUsages(
    fileContexts: ReadonlyMap<string, DiDiagnosticFileContext>,
): readonly InjectionUsage[] {
    const usages: InjectionUsage[] = [];

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
): readonly DiRegistration[] {
    const normalizedExpression = unwrapExpression(expression);

    if (ts.isArrayLiteralExpression(normalizedExpression)) {
        const registrations: DiRegistration[] = [];
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
        const resolved = resolveIdentifierExpression(fileContext, fileContexts, normalizedExpression.text);
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

    const registration = resolveServiceRegistrationCall(normalizedExpression, fileContext, fileContexts);
    return registration ? [registration] : [];
}

function resolveServiceRegistrationCall(
    expression: ts.Expression,
    fileContext: DiDiagnosticFileContext,
    fileContexts: ReadonlyMap<string, DiDiagnosticFileContext>,
): DiRegistration | undefined {
    const normalizedExpression = unwrapExpression(expression);
    if (!ts.isCallExpression(normalizedExpression)) {
        return undefined;
    }

    const callee = readIdentifierLike(normalizedExpression.expression);
    if (callee !== "singleton" && callee !== "transient") {
        return undefined;
    }

    const [tokenExpression, factoryExpression] = normalizedExpression.arguments;
    const token = readTokenReference(tokenExpression);
    if (!token || !factoryExpression) {
        return undefined;
    }

    return {
        token,
        lifetime: callee,
        dependencies: collectFactoryDependencies(factoryExpression, fileContext, fileContexts),
        file: fileContext.file,
    };
}

function collectFactoryDependencies(
    expression: ts.Expression,
    fileContext: DiDiagnosticFileContext,
    fileContexts: ReadonlyMap<string, DiDiagnosticFileContext>,
    visitedReferences = new Set<string>(),
): readonly DiTokenReference[] {
    const callable = resolveCallableExpression(expression, fileContext, fileContexts, visitedReferences);
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

function collectRegistrationCycleDiagnostics(
    registrations: readonly DiRegistration[],
): readonly DiDiagnostic[] {
    const registrationsByToken = new Map(registrations.map((registration) => [registration.token.key, registration]));
    const diagnostics: DiDiagnostic[] = [];
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
        diagnostics.push({
            code: "di-registration-cycle",
            severity: "error",
            message:
                `Service registration cycle detected: ${
                    cycle.map((token) => token.name).join(" -> ")
                }.`,
            file: registration.file,
            exportName: registration.token.name,
        });
    }

    return diagnostics;
}

function detectCycleFromToken(
    tokenKey: string,
    registrationsByToken: ReadonlyMap<string, DiRegistration>,
): readonly DiTokenReference[] | undefined {
    return walkRegistrationGraph(tokenKey, registrationsByToken, [], new Set<string>());
}

function walkRegistrationGraph(
    tokenKey: string,
    registrationsByToken: ReadonlyMap<string, DiRegistration>,
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
        return cycleStartIndex >= 0 ? [...stack.slice(cycleStartIndex), registration.token] : currentStack;
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
        [...closedCycle.slice(startIndex), ...closedCycle.slice(0, startIndex)].map((token) => token.key).join("->")
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

function readMemberInjectionToken(node: ts.ClassElement): DiTokenReference | undefined {
    return readInjectInitializerToken(node);
}

function readInjectInitializerToken(node: ts.ClassElement): DiTokenReference | undefined {
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
): { expression: ts.Expression; fileContext: DiDiagnosticFileContext } | undefined {
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
        return resolveCallableExpression(localFunction, fileContext, fileContexts, visitedReferences);
    }

    const resolved = resolveIdentifierExpression(fileContext, fileContexts, normalizedExpression.text);
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

function collectTopLevelVariableExpressions(sourceFile: ts.SourceFile): ReadonlyMap<string, ts.Expression> {
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

function collectTopLevelFunctionExpressions(sourceFile: ts.SourceFile): ReadonlyMap<string, ts.Expression> {
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

function compareDiDiagnostics(a: DiDiagnostic, b: DiDiagnostic): number {
    if (a.code !== b.code) {
        return a.code.localeCompare(b.code);
    }

    if (a.file !== b.file) {
        return a.file.localeCompare(b.file);
    }

    if (a.exportName !== b.exportName) {
        return a.exportName.localeCompare(b.exportName);
    }

    return (a.routePath ?? "").localeCompare(b.routePath ?? "");
}

function createOwnerKey(file: string, exportName: string): string {
    return `${file}::${exportName}`;
}

function isExportedClassDeclaration(node: ts.ClassDeclaration): boolean {
    return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function hasExportModifier(node: ts.Node): boolean {
    return ts.canHaveModifiers(node) &&
        (ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false);
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
