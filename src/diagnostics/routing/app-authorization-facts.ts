import { resolve } from "node:path";
import { ts } from "../../compiler/typescript.ts";

export async function readStaticAppAuthorizationPolicyNames(args: {
    appFile: string;
    appId?: string;
}): Promise<readonly string[] | undefined> {
    if (!args.appId) {
        return undefined;
    }

    const appFile = resolve(args.appFile);
    let source: string;
    try {
        source = await Deno.readTextFile(appFile);
    } catch {
        return undefined;
    }

    const sourceFile = ts.createSourceFile(
        appFile,
        source,
        ts.ScriptTarget.Latest,
        true,
        appFile.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const policyNames: string[] = [];

    visitNode(sourceFile, (node) => {
        if (
            !ts.isObjectLiteralExpression(node) ||
            !isAppDefinitionObjectLiteral(node) ||
            readAppDefinitionId(node) !== args.appId
        ) {
            return;
        }

        policyNames.push(...readAppAuthorizationPolicyNames(node));
    });

    if (policyNames.length === 0) {
        return undefined;
    }

    return [...new Set(policyNames)].sort((left, right) => left.localeCompare(right));
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
): readonly string[] {
    const authorizationExpression = readNamedPropertyInitializer(appDefinition, "authorization");
    const authorization = authorizationExpression
        ? unwrapExpression(authorizationExpression)
        : undefined;
    if (!authorization || !ts.isObjectLiteralExpression(authorization)) {
        return [];
    }

    const policyNamesExpression = readNamedPropertyInitializer(authorization, "policyNames");
    const policyNames = policyNamesExpression ? unwrapExpression(policyNamesExpression) : undefined;
    if (!policyNames || !ts.isArrayLiteralExpression(policyNames)) {
        return [];
    }

    return policyNames.elements.flatMap((element) => {
        if (!ts.isStringLiteralLike(element)) {
            return [];
        }

        const policyName = element.text.trim();
        return policyName.length > 0 ? [policyName] : [];
    });
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

function isAppDefinitionObjectLiteral(
    objectLiteral: ts.ObjectLiteralExpression,
): boolean {
    return Boolean(
        readNamedPropertyInitializer(objectLiteral, "pages") ||
            readNamedPropertyInitializer(objectLiteral, "root"),
    );
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
