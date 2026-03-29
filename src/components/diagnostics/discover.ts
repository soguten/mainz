import { ts } from "@/compiler/typescript.ts";
import type {
    ComponentFact,
    ComponentRenderStrategy,
    ComponentSourceDiagnosticsInput,
} from "./facts.ts";

interface ParsedClassInfo {
    node: ts.ClassDeclaration;
    exportName: string;
    extendsName?: string;
    renderStrategy?: ComponentRenderStrategy;
    hasFallback: boolean;
    hasAuthorize: boolean;
    authorizationPolicy?: string;
    hasAllowAnonymous: boolean;
    declaresComponentLoadMethod: boolean;
    isAbstract: boolean;
}

export async function discoverComponentFacts(
    files: readonly ComponentSourceDiagnosticsInput[],
): Promise<readonly ComponentFact[]> {
    const facts: ComponentFact[] = [];

    for (const file of files) {
        const sourceFile = createDiagnosticsSourceFile(file.source);
        const classes = collectParsedClassInfos(sourceFile);

        for (const candidate of classes.values()) {
            if (!isExportedClassDeclaration(candidate.node)) {
                continue;
            }

            const extendsComponentValue = extendsNamedBase(candidate, classes, "Component");
            const extendsPageValue = extendsNamedBase(candidate, classes, "Page");
            if (!extendsComponentValue || extendsPageValue) {
                continue;
            }

            facts.push({
                file: file.file,
                exportName: candidate.exportName,
                isAbstract: candidate.isAbstract,
                extendsComponent: extendsComponentValue,
                extendsPage: extendsPageValue,
                hasLoad: resolveInheritedComponentLoad(candidate, classes),
                renderStrategy: resolveInheritedRenderStrategy(candidate, classes),
                hasFallback: resolveInheritedDecoratorFallback(candidate, classes),
                hasAuthorize: candidate.hasAuthorize,
                authorizationPolicy: candidate.authorizationPolicy,
                hasAllowAnonymous: candidate.hasAllowAnonymous,
            });
        }
    }

    return facts;
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
            if (ts.isIdentifier(type.expression)) {
                return type.expression.text;
            }
        }
    }

    return undefined;
}

function findRenderStrategyConfig(node: ts.ClassDeclaration): {
    renderStrategy?: ComponentRenderStrategy;
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
            ? strategyArgument.text as ComponentRenderStrategy
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
): ComponentRenderStrategy | undefined {
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


