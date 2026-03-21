import ts from "npm:typescript";

export interface ComponentSourceDiagnosticsInput {
    file: string;
    source: string;
}

export interface ComponentDiagnostic {
    code:
        | "resource-component-missing-render-strategy"
        | "resource-component-missing-fallback"
        | "resource-component-blocking-private-resource"
        | "resource-component-blocking-client-resource"
        | "component-resource-missing-render-strategy"
        | "component-resource-missing-fallback"
        | "component-resource-blocking-private-resource"
        | "component-resource-blocking-client-resource";
    severity: "error" | "warning";
    message: string;
    file: string;
    exportName: string;
}

export async function collectComponentDiagnostics(
    files: readonly ComponentSourceDiagnosticsInput[],
): Promise<readonly ComponentDiagnostic[]> {
    const diagnostics: ComponentDiagnostic[] = [];

    for (const file of files) {
        const localResources = collectLocalResourcePolicies(file.source);
        for (const component of collectDeclaredResourceComponentOwners(file.source)) {
            if (!component.renderStrategy) {
                diagnostics.push({
                    code: "resource-component-missing-render-strategy",
                    severity: "error",
                    message:
                        `ResourceComponent "${component.exportName}" must declare @RenderStrategy(...). ` +
                        "ResourceComponent requires a fixed component-level render strategy.",
                    file: file.file,
                    exportName: component.exportName,
                });
                continue;
            }

            if (
                (component.renderStrategy === "deferred" ||
                    component.renderStrategy === "client-only") &&
                !component.hasFallback
            ) {
                diagnostics.push({
                    code: "resource-component-missing-fallback",
                    severity: "warning",
                    message:
                        `ResourceComponent "${component.exportName}" uses @RenderStrategy("${component.renderStrategy}") without a fallback. ` +
                        "Add a fallback to make the component's async placeholder explicit.",
                    file: file.file,
                    exportName: component.exportName,
                });
            }

            if (component.renderStrategy !== "blocking" || !component.resourceName) {
                continue;
            }

            const resourcePolicy = localResources.get(component.resourceName);
            if (resourcePolicy?.visibility === "private") {
                diagnostics.push({
                    code: "resource-component-blocking-private-resource",
                    severity: "warning",
                    message:
                        `ResourceComponent "${component.exportName}" uses @RenderStrategy("blocking") with private resource "${resourcePolicy.resourceLabel}". ` +
                        "This is valid in CSR, but it will fail when the component is used in an SSG path.",
                    file: file.file,
                    exportName: component.exportName,
                });
            }

            if (resourcePolicy?.execution === "client") {
                diagnostics.push({
                    code: "resource-component-blocking-client-resource",
                    severity: "warning",
                    message:
                        `ResourceComponent "${component.exportName}" uses @RenderStrategy("blocking") with client-only resource "${resourcePolicy.resourceLabel}". ` +
                        "This is valid in CSR, but it will fail when the component is used in an SSG path.",
                    file: file.file,
                    exportName: component.exportName,
                });
            }
        }
    }

    return diagnostics.sort(compareComponentDiagnostics);
}

export async function collectComponentSourceDiagnostics(
    files: readonly ComponentSourceDiagnosticsInput[],
): Promise<readonly ComponentDiagnostic[]> {
    const diagnostics: ComponentDiagnostic[] = [];

    for (const file of files) {
        const localResources = collectLocalResourcePolicies(file.source);
        for (const component of collectDeclaredComponentResourceOwners(file.source)) {
            if (!component.renderStrategy) {
                diagnostics.push({
                    code: "component-resource-missing-render-strategy",
                    severity: "error",
                    message:
                        `Component "${component.exportName}" renders ComponentResource but does not declare @RenderStrategy(...). ` +
                        "ComponentResource requires a fixed component-level render strategy on its owner.",
                    file: file.file,
                    exportName: component.exportName,
                });
                continue;
            }

            if (
                (component.renderStrategy === "deferred" ||
                    component.renderStrategy === "client-only") &&
                !component.hasFallback
            ) {
                diagnostics.push({
                    code: "component-resource-missing-fallback",
                    severity: "warning",
                    message:
                        `Component "${component.exportName}" renders ComponentResource with @RenderStrategy("${component.renderStrategy}") without a fallback. ` +
                        "Add a fallback to make the component's async placeholder explicit.",
                    file: file.file,
                    exportName: component.exportName,
                });
            }

            if (component.renderStrategy === "blocking" && component.resourceName) {
                const resourcePolicy = localResources.get(component.resourceName);
                if (resourcePolicy?.visibility === "private") {
                    diagnostics.push({
                        code: "component-resource-blocking-private-resource",
                        severity: "warning",
                        message:
                            `Component "${component.exportName}" renders ComponentResource with @RenderStrategy("blocking") using private resource "${resourcePolicy.resourceLabel}". ` +
                            "This is valid in CSR, but it will fail when the component is used in an SSG path.",
                        file: file.file,
                        exportName: component.exportName,
                    });
                }

                if (resourcePolicy?.execution === "client") {
                    diagnostics.push({
                        code: "component-resource-blocking-client-resource",
                        severity: "warning",
                        message:
                            `Component "${component.exportName}" renders ComponentResource with @RenderStrategy("blocking") using client-only resource "${resourcePolicy.resourceLabel}". ` +
                            "This is valid in CSR, but it will fail when the component is used in an SSG path.",
                        file: file.file,
                        exportName: component.exportName,
                    });
                }
            }
        }
    }

    return diagnostics.sort(compareComponentDiagnostics);
}

function compareComponentDiagnostics(a: ComponentDiagnostic, b: ComponentDiagnostic): number {
    if (a.severity !== b.severity) {
        return a.severity.localeCompare(b.severity);
    }

    if (a.code !== b.code) {
        return a.code.localeCompare(b.code);
    }

    if (a.file !== b.file) {
        return a.file.localeCompare(b.file);
    }

    return a.exportName.localeCompare(b.exportName);
}

interface DeclaredComponentResourceOwner {
    exportName: string;
    renderStrategy?: "blocking" | "deferred" | "client-only" | "forbidden-in-ssg";
    hasFallback: boolean;
    resourceName?: string;
}

interface DeclaredResourceComponentOwner {
    exportName: string;
    renderStrategy?: "blocking" | "deferred" | "client-only" | "forbidden-in-ssg";
    hasFallback: boolean;
    resourceName?: string;
}

interface ParsedClassInfo {
    node: ts.ClassDeclaration;
    exportName: string;
    extendsName?: string;
    renderStrategy?: DeclaredResourceComponentOwner["renderStrategy"];
    hasFallback: boolean;
    declaresFallbackMethod: boolean;
    returnedResourceName?: string;
}

function collectDeclaredResourceComponentOwners(
    source: string,
): readonly DeclaredResourceComponentOwner[] {
    const sourceFile = createDiagnosticsSourceFile(source);
    const classes = collectParsedClassInfos(sourceFile);
    const parsedClasses = [...classes.values()];

    return parsedClasses
        .filter((candidate) => isExportedClassDeclaration(candidate.node))
        .filter((candidate) => extendsResourceComponent(candidate, classes))
        .map((candidate) => ({
            exportName: candidate.exportName,
            renderStrategy: resolveInheritedRenderStrategy(candidate, classes),
            hasFallback: resolveInheritedFallback(candidate, classes),
            resourceName: resolveInheritedResourceName(candidate, classes),
        }));
}

function collectDeclaredComponentResourceOwners(
    source: string,
): readonly DeclaredComponentResourceOwner[] {
    const diagnosticsTargets: DeclaredComponentResourceOwner[] = [];
    const sourceFile = createDiagnosticsSourceFile(source);

    visitSourceNode(sourceFile, (node) => {
        if (!ts.isClassDeclaration(node) || !isExportedClassDeclaration(node) || !node.name) {
            return;
        }

        const componentResourceUsage = findComponentResourceUsage(node);
        if (!componentResourceUsage.hasComponentResource) {
            return;
        }

        const renderStrategyConfig = findRenderStrategyConfig(node);

        diagnosticsTargets.push({
            exportName: node.name.text,
            renderStrategy: renderStrategyConfig.renderStrategy,
            hasFallback: renderStrategyConfig.hasFallback,
            resourceName: componentResourceUsage.resourceName,
        });
    });

    return diagnosticsTargets;
}

interface LocalResourcePolicy {
    resourceLabel: string;
    visibility: "public" | "private";
    execution: "build" | "client" | "either";
}

function collectLocalResourcePolicies(source: string): ReadonlyMap<string, LocalResourcePolicy> {
    const policies = new Map<string, LocalResourcePolicy>();
    const sourceFile = createDiagnosticsSourceFile(source);

    visitSourceNode(sourceFile, (node) => {
        if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name)) {
            return;
        }

        const resourceDefinition = resolveDefineResourceDefinition(node.name.text, node.initializer);
        if (!resourceDefinition) {
            return;
        }

        policies.set(node.name.text, resourceDefinition);
    });

    return policies;
}

function createDiagnosticsSourceFile(source: string): ts.SourceFile {
    return ts.createSourceFile(
        "component-diagnostics.tsx",
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
    );
}

function collectParsedClassInfos(sourceFile: ts.SourceFile): ReadonlyMap<string, ParsedClassInfo> {
    const classes = new Map<string, ParsedClassInfo>();

    visitSourceNode(sourceFile, (node) => {
        if (!ts.isClassDeclaration(node) || !node.name) {
            return;
        }

        const renderStrategyConfig = findRenderStrategyConfig(node);
        classes.set(node.name.text, {
            node,
            exportName: node.name.text,
            extendsName: resolveHeritageClauseName(node),
            renderStrategy: renderStrategyConfig.renderStrategy,
            hasFallback: renderStrategyConfig.hasFallback,
            declaresFallbackMethod: classDeclaresMethod(node, "renderResourceFallback"),
            returnedResourceName: findReturnedResourceName(node),
        });
    });

    return classes;
}

function isExportedClassDeclaration(node: ts.ClassDeclaration): boolean {
    return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function resolveHeritageClauseName(node: ts.ClassDeclaration): string | undefined {
    for (const clause of node.heritageClauses ?? []) {
        if (clause.token !== ts.SyntaxKind.ExtendsKeyword) {
            continue;
        }

        for (const type of clause.types) {
            const expression = type.expression;
            if (ts.isIdentifier(expression)) {
                return expression.text;
            }
        }
    }

    return undefined;
}

function findRenderStrategyConfig(node: ts.ClassDeclaration): {
    renderStrategy?: DeclaredComponentResourceOwner["renderStrategy"];
    hasFallback: boolean;
} {
    for (const decorator of ts.getDecorators(node) ?? []) {
        if (!ts.isCallExpression(decorator.expression)) {
            continue;
        }

        const expression = decorator.expression.expression;
        if (!ts.isIdentifier(expression) || expression.text !== "RenderStrategy") {
            continue;
        }

        const [strategyArgument, optionsArgument] = decorator.expression.arguments;
        const renderStrategy = ts.isStringLiteral(strategyArgument)
            ? strategyArgument.text as DeclaredComponentResourceOwner["renderStrategy"]
            : undefined;

        return {
            renderStrategy,
            hasFallback: objectLiteralHasProperty(optionsArgument, "fallback"),
        };
    }

    return {
        renderStrategy: undefined,
        hasFallback: false,
    };
}

function classDeclaresMethod(node: ts.ClassDeclaration, methodName: string): boolean {
    return node.members.some((member) =>
        ts.isMethodDeclaration(member) &&
        isNamedProperty(member.name, methodName)
    );
}

function findReturnedResourceName(node: ts.ClassDeclaration): string | undefined {
    for (const member of node.members) {
        if (!ts.isMethodDeclaration(member) || !isNamedProperty(member.name, "getResource")) {
            continue;
        }

        const body = member.body;
        if (!body) {
            return undefined;
        }

        for (const statement of body.statements) {
            if (
                ts.isReturnStatement(statement) &&
                statement.expression &&
                ts.isIdentifier(statement.expression)
            ) {
                return statement.expression.text;
            }
        }
    }

    return undefined;
}

function extendsResourceComponent(
    candidate: ParsedClassInfo,
    classes: ReadonlyMap<string, ParsedClassInfo>,
): boolean {
    let current: ParsedClassInfo | undefined = candidate;
    const visited = new Set<string>();

    while (current?.extendsName && !visited.has(current.exportName)) {
        visited.add(current.exportName);
        if (current.extendsName === "ResourceComponent") {
            return true;
        }

        current = classes.get(current.extendsName);
    }

    return false;
}

function resolveInheritedRenderStrategy(
    candidate: ParsedClassInfo,
    classes: ReadonlyMap<string, ParsedClassInfo>,
): DeclaredResourceComponentOwner["renderStrategy"] | undefined {
    return walkClassHierarchy(candidate, classes, (current) => current.renderStrategy);
}

function resolveInheritedFallback(
    candidate: ParsedClassInfo,
    classes: ReadonlyMap<string, ParsedClassInfo>,
): boolean {
    return walkClassHierarchy(candidate, classes, (current) =>
        current.hasFallback || current.declaresFallbackMethod ? true : undefined
    ) ?? false;
}

function resolveInheritedResourceName(
    candidate: ParsedClassInfo,
    classes: ReadonlyMap<string, ParsedClassInfo>,
): string | undefined {
    return walkClassHierarchy(candidate, classes, (current) => current.returnedResourceName);
}

function walkClassHierarchy<T>(
    candidate: ParsedClassInfo,
    classes: ReadonlyMap<string, ParsedClassInfo>,
    reader: (current: ParsedClassInfo) => T | undefined,
): T | undefined {
    let current: ParsedClassInfo | undefined = candidate;
    const visited = new Set<string>();

    while (current && !visited.has(current.exportName)) {
        visited.add(current.exportName);
        const value = reader(current);
        if (value !== undefined) {
            return value;
        }

        current = current.extendsName ? classes.get(current.extendsName) : undefined;
    }

    return undefined;
}

function findComponentResourceUsage(node: ts.ClassDeclaration): {
    hasComponentResource: boolean;
    resourceName?: string;
} {
    let hasComponentResource = false;
    let resourceName: string | undefined;

    visitSourceNode(node, (candidate) => {
        const jsxAttributes = resolveComponentResourceAttributes(candidate);
        if (!jsxAttributes) {
            return;
        }

        hasComponentResource = true;
        resourceName ??= jsxAttributes.resourceName;
    });

    return {
        hasComponentResource,
        resourceName,
    };
}

function resolveComponentResourceAttributes(node: ts.Node): {
    resourceName?: string;
} | undefined {
    if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) {
        return undefined;
    }

    const tagName = node.tagName;
    if (!ts.isIdentifier(tagName) || tagName.text !== "ComponentResource") {
        return undefined;
    }

    for (const attributeLike of node.attributes.properties) {
        if (!ts.isJsxAttribute(attributeLike) || !ts.isIdentifier(attributeLike.name) ||
            attributeLike.name.text !== "resource") {
            continue;
        }

        const initializer = attributeLike.initializer;
        if (
            initializer &&
            ts.isJsxExpression(initializer) &&
            initializer.expression &&
            ts.isIdentifier(initializer.expression)
        ) {
            return {
                resourceName: initializer.expression.text,
            };
        }

        return {};
    }

    return {};
}

function resolveDefineResourceDefinition(
    variableName: string,
    initializer: ts.Expression | undefined,
): LocalResourcePolicy | undefined {
    if (!initializer || !ts.isCallExpression(initializer)) {
        return undefined;
    }

    if (!ts.isIdentifier(initializer.expression) || initializer.expression.text !== "defineResource") {
        return undefined;
    }

    const [definitionArgument] = initializer.arguments;
    if (!definitionArgument || !ts.isObjectLiteralExpression(definitionArgument)) {
        return undefined;
    }

    const definedName = readObjectLiteralStringProperty(definitionArgument, "name");
    const visibility = readObjectLiteralStringProperty(definitionArgument, "visibility") as LocalResourcePolicy["visibility"] ??
        "private";
    const execution = readObjectLiteralStringProperty(definitionArgument, "execution") as LocalResourcePolicy["execution"] ??
        "either";

    return {
        resourceLabel: definedName ?? variableName,
        visibility,
        execution,
    };
}

function readObjectLiteralStringProperty(
    node: ts.ObjectLiteralExpression,
    propertyName: string,
): string | undefined {
    for (const property of node.properties) {
        if (!ts.isPropertyAssignment(property) || !isNamedProperty(property.name, propertyName)) {
            continue;
        }

        return readStringLiteralLike(property.initializer);
    }

    return undefined;
}

function objectLiteralHasProperty(node: ts.Expression | undefined, propertyName: string): boolean {
    if (!node || !ts.isObjectLiteralExpression(node)) {
        return false;
    }

    return node.properties.some((property) =>
        (ts.isPropertyAssignment(property) || ts.isMethodDeclaration(property) ||
            ts.isShorthandPropertyAssignment(property)) &&
        isNamedProperty(property.name, propertyName)
    );
}

function isNamedProperty(name: ts.PropertyName | undefined, propertyName: string): boolean {
    return !!name &&
        ((ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) &&
            name.text === propertyName);
}

function readStringLiteralLike(node: ts.Expression): string | undefined {
    return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : undefined;
}

function visitSourceNode(node: ts.Node, visitor: (node: ts.Node) => void): void {
    visitor(node);
    node.forEachChild((child) => visitSourceNode(child, visitor));
}
