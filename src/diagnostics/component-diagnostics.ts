import ts from "npm:typescript";

export interface ComponentSourceDiagnosticsInput {
    file: string;
    source: string;
}

export interface ComponentDiagnostic {
    code:
        | "authorization-policy-not-registered"
        | "component-authorization-ssg-warning"
        | "component-blocking-fallback-misleading"
        | "component-render-strategy-without-load"
        | "component-load-missing-fallback"
        | "component-allow-anonymous-not-supported";
    severity: "error" | "warning";
    message: string;
    file: string;
    exportName: string;
}

export async function collectComponentDiagnostics(
    files: readonly ComponentSourceDiagnosticsInput[],
    options?: {
        registeredPolicyNames?: readonly string[];
    },
): Promise<readonly ComponentDiagnostic[]> {
    const diagnostics: ComponentDiagnostic[] = [];
    const registeredPolicies = options?.registeredPolicyNames
        ? new Set(options.registeredPolicyNames)
        : undefined;

    for (const file of files) {
        for (const component of collectDeclaredSynchronousRenderStrategyOwners(file.source)) {
            diagnostics.push({
                code: "component-render-strategy-without-load",
                severity: "warning",
                message:
                    `Component "${component.exportName}" declares @RenderStrategy("${component.renderStrategy}") but does not declare load(). ` +
                    "@RenderStrategy(...) only affects Component.load() and has no effect on synchronous components.",
                file: file.file,
                exportName: component.exportName,
            });
        }

        for (const component of collectInvalidAllowAnonymousOwners(file.source)) {
            diagnostics.push({
                code: "component-allow-anonymous-not-supported",
                severity: "error",
                message:
                    `Component "${component.exportName}" declares @AllowAnonymous(). ` +
                    "@AllowAnonymous() is page-only; component authorization is always additive.",
                file: file.file,
                exportName: component.exportName,
            });
        }

        for (const component of collectProtectedComponentOwners(file.source)) {
            diagnostics.push({
                code: "component-authorization-ssg-warning",
                severity: "warning",
                message:
                    `Component "${component.exportName}" declares @Authorize(...). ` +
                    "Protected components cannot be rendered during SSG because shared prerender output must not include privileged content.",
                file: file.file,
                exportName: component.exportName,
            });
        }

        if (registeredPolicies) {
            for (const component of collectMissingAuthorizationPolicyOwners(file.source, registeredPolicies)) {
                diagnostics.push({
                    code: "authorization-policy-not-registered",
                    severity: "error",
                    message:
                        `Component "${component.exportName}" references @Authorize({ policy: "${component.policyName}" }), ` +
                        "but that policy name is not declared in target.authorization.policyNames for diagnostics.",
                    file: file.file,
                    exportName: component.exportName,
                });
            }
        }

        for (const component of collectDeclaredComponentLoadOwners(file.source)) {
            if (
                (component.renderStrategy === "deferred" ||
                    component.renderStrategy === "client-only") &&
                !component.hasFallback
            ) {
                diagnostics.push({
                    code: "component-load-missing-fallback",
                    severity: "warning",
                    message:
                        `Component "${component.exportName}" declares load() with @RenderStrategy("${component.renderStrategy}") without a fallback. ` +
                        "Add a fallback to make the component's async placeholder explicit.",
                    file: file.file,
                    exportName: component.exportName,
                });
            }

            if (component.renderStrategy === "blocking" && component.hasFallback) {
                diagnostics.push({
                    code: "component-blocking-fallback-misleading",
                    severity: "warning",
                    message:
                        `Component "${component.exportName}" declares @RenderStrategy("blocking") with a fallback. ` +
                        "Blocking components normally render resolved output instead of visible fallback UI, so this fallback may be misleading.",
                    file: file.file,
                    exportName: component.exportName,
                });
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

interface DeclaredComponentLoadOwner {
    exportName: string;
    renderStrategy: "blocking" | "deferred" | "client-only" | "forbidden-in-ssg";
    hasFallback: boolean;
}

interface DeclaredSynchronousRenderStrategyOwner {
    exportName: string;
    renderStrategy: "blocking" | "deferred" | "client-only" | "forbidden-in-ssg";
}

interface ParsedClassInfo {
    node: ts.ClassDeclaration;
    exportName: string;
    extendsName?: string;
    renderStrategy?: DeclaredComponentLoadOwner["renderStrategy"];
    hasFallback: boolean;
    hasAuthorize: boolean;
    authorizationPolicy?: string;
    hasAllowAnonymous: boolean;
    declaresComponentLoadMethod: boolean;
    isAbstract: boolean;
}

function collectDeclaredComponentLoadOwners(
    source: string,
): readonly DeclaredComponentLoadOwner[] {
    const sourceFile = createDiagnosticsSourceFile(source);
    const classes = collectParsedClassInfos(sourceFile);
    const parsedClasses = [...classes.values()];

    return parsedClasses
        .filter((candidate) => isExportedClassDeclaration(candidate.node))
        .filter((candidate) => extendsComponent(candidate, classes))
        .filter((candidate) => !extendsPage(candidate, classes))
        .filter((candidate) => resolveInheritedComponentLoad(candidate, classes))
        .map((candidate) => ({
            exportName: candidate.exportName,
            renderStrategy: resolveInheritedRenderStrategy(candidate, classes) ?? "blocking",
            hasFallback: resolveInheritedDecoratorFallback(candidate, classes),
        }));
}

function collectDeclaredSynchronousRenderStrategyOwners(
    source: string,
): readonly DeclaredSynchronousRenderStrategyOwner[] {
    const sourceFile = createDiagnosticsSourceFile(source);
    const classes = collectParsedClassInfos(sourceFile);
    const parsedClasses = [...classes.values()];

    return parsedClasses
        .filter((candidate) => isExportedClassDeclaration(candidate.node))
        .filter((candidate) => !candidate.isAbstract)
        .filter((candidate) => extendsComponent(candidate, classes))
        .filter((candidate) => !extendsPage(candidate, classes))
        .filter((candidate) => !resolveInheritedComponentLoad(candidate, classes))
        .map((candidate) => ({
            exportName: candidate.exportName,
            renderStrategy: resolveInheritedRenderStrategy(candidate, classes),
        }))
        .filter((candidate): candidate is DeclaredSynchronousRenderStrategyOwner =>
            candidate.renderStrategy !== undefined
        );
}

function collectInvalidAllowAnonymousOwners(source: string): readonly Pick<ParsedClassInfo, "exportName">[] {
    const sourceFile = createDiagnosticsSourceFile(source);
    const classes = collectParsedClassInfos(sourceFile);
    const parsedClasses = [...classes.values()];

    return parsedClasses
        .filter((candidate) => isExportedClassDeclaration(candidate.node))
        .filter((candidate) => candidate.hasAllowAnonymous)
        .filter((candidate) => extendsComponent(candidate, classes))
        .filter((candidate) => !extendsPage(candidate, classes))
        .map((candidate) => ({
            exportName: candidate.exportName,
        }));
}

function collectProtectedComponentOwners(source: string): readonly Pick<ParsedClassInfo, "exportName">[] {
    const sourceFile = createDiagnosticsSourceFile(source);
    const classes = collectParsedClassInfos(sourceFile);
    const parsedClasses = [...classes.values()];

    return parsedClasses
        .filter((candidate) => isExportedClassDeclaration(candidate.node))
        .filter((candidate) => candidate.hasAuthorize)
        .filter((candidate) => extendsComponent(candidate, classes))
        .filter((candidate) => !extendsPage(candidate, classes))
        .map((candidate) => ({
            exportName: candidate.exportName,
        }));
}

function collectMissingAuthorizationPolicyOwners(
    source: string,
    registeredPolicies: ReadonlySet<string>,
): ReadonlyArray<Pick<ParsedClassInfo, "exportName"> & { policyName: string }> {
    const sourceFile = createDiagnosticsSourceFile(source);
    const classes = collectParsedClassInfos(sourceFile);
    const parsedClasses = [...classes.values()];

    return parsedClasses
        .filter((candidate) => isExportedClassDeclaration(candidate.node))
        .filter((candidate) => candidate.authorizationPolicy !== undefined)
        .filter((candidate) => extendsComponent(candidate, classes))
        .filter((candidate) => !extendsPage(candidate, classes))
        .filter((candidate) => {
            const policyName = candidate.authorizationPolicy;
            return policyName !== undefined && !registeredPolicies.has(policyName);
        })
        .map((candidate) => ({
            exportName: candidate.exportName,
            policyName: candidate.authorizationPolicy!,
        }));
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
            hasAuthorize: hasDecorator(node, "Authorize"),
            authorizationPolicy: readAuthorizePolicy(node),
            hasAllowAnonymous: hasDecorator(node, "AllowAnonymous"),
            declaresComponentLoadMethod: classDeclaresMethod(node, "load"),
            isAbstract: isAbstractClassDeclaration(node),
        });
    });

    return classes;
}

function isExportedClassDeclaration(node: ts.ClassDeclaration): boolean {
    return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ??
        false;
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
    renderStrategy?: DeclaredComponentLoadOwner["renderStrategy"];
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
            ? strategyArgument.text as DeclaredComponentLoadOwner["renderStrategy"]
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

function hasDecorator(node: ts.ClassDeclaration, decoratorName: string): boolean {
    for (const decorator of ts.getDecorators(node) ?? []) {
        if (ts.isCallExpression(decorator.expression)) {
            if (
                ts.isIdentifier(decorator.expression.expression) &&
                decorator.expression.expression.text === decoratorName
            ) {
                return true;
            }

            continue;
        }

        if (ts.isIdentifier(decorator.expression) && decorator.expression.text === decoratorName) {
            return true;
        }
    }

    return false;
}

function readAuthorizePolicy(node: ts.ClassDeclaration): string | undefined {
    for (const decorator of ts.getDecorators(node) ?? []) {
        if (!ts.isCallExpression(decorator.expression)) {
            continue;
        }

        const expression = decorator.expression.expression;
        if (!ts.isIdentifier(expression) || expression.text !== "Authorize") {
            continue;
        }

        const [optionsArgument] = decorator.expression.arguments;
        if (!optionsArgument || !ts.isObjectLiteralExpression(optionsArgument)) {
            return undefined;
        }

        for (const property of optionsArgument.properties) {
            if (
                ts.isPropertyAssignment(property) &&
                isNamedProperty(property.name, "policy") &&
                ts.isStringLiteral(property.initializer)
            ) {
                const policyName = property.initializer.text.trim();
                return policyName || undefined;
            }
        }
    }

    return undefined;
}

function classDeclaresMethod(node: ts.ClassDeclaration, methodName: string): boolean {
    return node.members.some((member) =>
        ts.isMethodDeclaration(member) &&
        !(member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) ??
            false) &&
        isNamedProperty(member.name, methodName)
    );
}

function isAbstractClassDeclaration(node: ts.ClassDeclaration): boolean {
    return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AbstractKeyword) ??
        false;
}

function extendsComponent(
    candidate: ParsedClassInfo,
    classes: ReadonlyMap<string, ParsedClassInfo>,
): boolean {
    return extendsNamedBase(candidate, classes, "Component");
}

function extendsPage(
    candidate: ParsedClassInfo,
    classes: ReadonlyMap<string, ParsedClassInfo>,
): boolean {
    return extendsNamedBase(candidate, classes, "Page");
}

function extendsNamedBase(
    candidate: ParsedClassInfo,
    classes: ReadonlyMap<string, ParsedClassInfo>,
    baseName: string,
): boolean {
    let current: ParsedClassInfo | undefined = candidate;
    const visited = new Set<string>();

    while (current?.extendsName && !visited.has(current.exportName)) {
        visited.add(current.exportName);
        if (current.extendsName === baseName) {
            return true;
        }

        current = classes.get(current.extendsName);
    }

    return false;
}

function resolveInheritedRenderStrategy(
    candidate: ParsedClassInfo,
    classes: ReadonlyMap<string, ParsedClassInfo>,
): DeclaredComponentLoadOwner["renderStrategy"] | undefined {
    return walkClassHierarchy(candidate, classes, (current) => current.renderStrategy);
}

function resolveInheritedDecoratorFallback(
    candidate: ParsedClassInfo,
    classes: ReadonlyMap<string, ParsedClassInfo>,
): boolean {
    return walkClassHierarchy(
        candidate,
        classes,
        (current) => current.hasFallback ? true : undefined,
    ) ?? false;
}

function resolveInheritedComponentLoad(
    candidate: ParsedClassInfo,
    classes: ReadonlyMap<string, ParsedClassInfo>,
): boolean {
    return walkClassHierarchy(
        candidate,
        classes,
        (current) => current.declaresComponentLoadMethod ? true : undefined,
    ) ?? false;
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

function visitSourceNode(node: ts.Node, visitor: (node: ts.Node) => void): void {
    visitor(node);
    node.forEachChild((child) => visitSourceNode(child, visitor));
}
