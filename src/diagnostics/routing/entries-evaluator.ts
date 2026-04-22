import { ts } from "../../compiler/typescript.ts";
import type {
    RouteEntriesEvaluationFact,
    RouteEntriesFact,
    RouteEntryDefinition,
} from "./facts.ts";
import {
    collectLocalConstBindings,
    findReturnedExpression,
    hasStaticModifier,
    isNamedProperty,
    readCallableIdentifier,
    readPropertyName,
    readStringLiteralLike,
    resolveRouteCallableExpression,
    type RouteLocalBindings,
    type RouteSourceContext,
    unwrapExpression,
} from "./entries-support.ts";

export function analyzeEntriesMember(
    node: ts.ClassDeclaration,
    context: RouteSourceContext,
): RouteEntriesFact["evaluation"] | undefined {
    for (const member of node.members) {
        if (!hasStaticModifier(member)) {
            continue;
        }

        if (ts.isMethodDeclaration(member) && isNamedProperty(member.name, "entries")) {
            return analyzeEntriesExpression(
                member.body ? findReturnedExpression(member.body) : undefined,
                context,
            );
        }

        if (ts.isPropertyDeclaration(member) && isNamedProperty(member.name, "entries")) {
            return analyzeEntriesExpression(member.initializer, context);
        }
    }

    return undefined;
}

function analyzeEntriesExpression(
    expression: ts.Expression | undefined,
    context: RouteSourceContext,
): RouteEntriesEvaluationFact {
    return analyzeEntriesExpressionWithVisited(expression, context, new Set<string>());
}

function analyzeEntriesExpressionWithVisited(
    expression: ts.Expression | undefined,
    context: RouteSourceContext,
    visitedCallables: Set<string>,
): RouteEntriesEvaluationFact {
    if (!expression) {
        return { kind: "unknown" };
    }

    if (
        ts.isAwaitExpression(expression) ||
        ts.isParenthesizedExpression(expression) ||
        ts.isAsExpression(expression) ||
        ts.isSatisfiesExpression(expression)
    ) {
        return analyzeEntriesExpressionWithVisited(
            expression.expression,
            context,
            visitedCallables,
        );
    }

    if (ts.isIdentifier(expression)) {
        const callableExpression = context.callableValues.get(expression.text);
        if (callableExpression) {
            if (visitedCallables.has(expression.text)) {
                return { kind: "unknown" };
            }

            visitedCallables.add(expression.text);
            return analyzeCallableEntriesExpression(callableExpression, context, visitedCallables);
        }
    }

    if (ts.isCallExpression(expression)) {
        const callableResult = analyzeCallableEntriesCall(expression, context, visitedCallables);
        if (callableResult) {
            return callableResult;
        }
    }

    if (
        ts.isObjectLiteralExpression(expression) ||
        ts.isStringLiteral(expression) ||
        ts.isNoSubstitutionTemplateLiteral(expression) ||
        ts.isNumericLiteral(expression) ||
        expression.kind === ts.SyntaxKind.TrueKeyword ||
        expression.kind === ts.SyntaxKind.FalseKeyword ||
        expression.kind === ts.SyntaxKind.NullKeyword
    ) {
        return { kind: "non-array" };
    }

    if (!ts.isArrayLiteralExpression(expression)) {
        return { kind: "unknown" };
    }

    const entries: RouteEntryDefinition[] = [];
    for (const element of expression.elements) {
        if (!ts.isObjectLiteralExpression(element)) {
            return { kind: "unknown" };
        }

        entries.push({
            params: readEntryParams(element),
        });
    }

    return {
        kind: "array",
        entries,
    };
}

function analyzeCallableEntriesExpression(
    expression: ts.Expression,
    context: RouteSourceContext,
    visitedCallables: Set<string>,
): RouteEntriesEvaluationFact {
    const normalizedExpression = unwrapExpression(expression);
    if (
        !ts.isArrowFunction(normalizedExpression) && !ts.isFunctionExpression(normalizedExpression)
    ) {
        return { kind: "unknown" };
    }

    const returnedExpression = ts.isBlock(normalizedExpression.body)
        ? findReturnedExpression(normalizedExpression.body)
        : normalizedExpression.body;

    return analyzeEntriesExpressionWithVisited(returnedExpression, context, visitedCallables);
}

function analyzeCallableEntriesCall(
    expression: ts.CallExpression,
    context: RouteSourceContext,
    visitedCallables: Set<string>,
): RouteEntriesEvaluationFact | undefined {
    const calleeIdentifier = readCallableIdentifier(expression.expression);
    if (!calleeIdentifier) {
        return undefined;
    }

    const callableExpression = context.callableValues.get(calleeIdentifier);
    if (!callableExpression) {
        return undefined;
    }

    if (visitedCallables.has(calleeIdentifier)) {
        return { kind: "unknown" };
    }

    visitedCallables.add(calleeIdentifier);
    return analyzeCallableEntriesExpression(callableExpression, context, visitedCallables);
}

function readEntryParams(entry: ts.ObjectLiteralExpression): Record<string, string> {
    const normalized: Record<string, string> = {};
    const paramsProperty = entry.properties.find((property): property is ts.PropertyAssignment =>
        ts.isPropertyAssignment(property) && isNamedProperty(property.name, "params")
    );

    if (!paramsProperty || !ts.isObjectLiteralExpression(paramsProperty.initializer)) {
        return normalized;
    }

    for (const property of paramsProperty.initializer.properties) {
        if (!ts.isPropertyAssignment(property) || !isNamedProperty(property.name)) {
            continue;
        }

        const value = readStringLiteralLike(property.initializer);
        if (value !== undefined) {
            normalized[readPropertyName(property.name)!] = value;
        }
    }

    return normalized;
}

function readMappedEntryDefinition(
    expression: ts.Expression,
    paramName: string | undefined,
    item: Record<string, string>,
    localBindings: RouteLocalBindings,
    context: RouteSourceContext,
): RouteEntryDefinition | undefined {
    const normalizedExpression = unwrapExpression(expression);
    if (ts.isCallExpression(normalizedExpression)) {
        const helperResult = resolveMappedEntryCall(
            normalizedExpression,
            paramName,
            item,
            localBindings,
            context,
        );
        if (helperResult) {
            return helperResult;
        }
    }

    if (!ts.isObjectLiteralExpression(normalizedExpression)) {
        return undefined;
    }

    const paramsProperty = normalizedExpression.properties.find((
        property,
    ): property is ts.PropertyAssignment =>
        ts.isPropertyAssignment(property) && isNamedProperty(property.name, "params")
    );
    if (paramsProperty) {
        const params = readMappedParamsObject(
            paramsProperty.initializer,
            paramName,
            item,
            localBindings,
            context,
        );
        return params ? { params } : undefined;
    }

    const shorthandParamsProperty = normalizedExpression.properties.find((
        property,
    ): property is ts.ShorthandPropertyAssignment =>
        ts.isShorthandPropertyAssignment(property) && property.name.text === "params"
    );
    if (shorthandParamsProperty) {
        const params = readMappedParamsObject(
            shorthandParamsProperty.name,
            paramName,
            item,
            localBindings,
            context,
        );
        return params ? { params } : undefined;
    }

    const directParams = readMappedParamsObject(
        normalizedExpression,
        paramName,
        item,
        localBindings,
        context,
    );
    return directParams ? { params: directParams } : undefined;
}

function readMappedParamsObject(
    expression: ts.Expression,
    paramName: string | undefined,
    item: Record<string, string>,
    localBindings: RouteLocalBindings,
    context: RouteSourceContext,
): Record<string, string> | undefined {
    const normalizedExpression = unwrapExpression(expression);
    if (ts.isIdentifier(normalizedExpression)) {
        const localBinding = localBindings.get(normalizedExpression.text);
        if (localBinding) {
            return readMappedParamsObject(localBinding, paramName, item, localBindings, context);
        }

        const sharedParams = context.paramsObjectValues.get(normalizedExpression.text);
        if (sharedParams) {
            return { ...sharedParams };
        }
    }

    if (ts.isCallExpression(normalizedExpression)) {
        const helperResult = resolveMappedParamsCall(
            normalizedExpression,
            paramName,
            item,
            localBindings,
            context,
        );
        if (helperResult) {
            return helperResult;
        }
    }

    if (!ts.isObjectLiteralExpression(normalizedExpression)) {
        return undefined;
    }

    const params: Record<string, string> = {};
    for (const property of normalizedExpression.properties) {
        if (ts.isSpreadAssignment(property)) {
            const spreadParams = readMappedParamsObject(
                property.expression,
                paramName,
                item,
                localBindings,
                context,
            );
            if (!spreadParams) {
                return undefined;
            }

            Object.assign(params, spreadParams);
            continue;
        }

        if (ts.isShorthandPropertyAssignment(property)) {
            const value = readMappedStringValue(
                property.name,
                paramName,
                item,
                localBindings,
                context,
            );
            if (value === undefined) {
                return undefined;
            }

            params[property.name.text] = value;
            continue;
        }

        if (!ts.isPropertyAssignment(property) || !isNamedProperty(property.name)) {
            return undefined;
        }

        const key = readPropertyName(property.name);
        const value = readMappedStringValue(
            property.initializer,
            paramName,
            item,
            localBindings,
            context,
        );
        if (!key || value === undefined) {
            return undefined;
        }

        params[key] = value;
    }

    return params;
}

function readMappedStringValue(
    expression: ts.Expression,
    paramName: string | undefined,
    item: Record<string, string>,
    localBindings: RouteLocalBindings,
    context: RouteSourceContext,
    visitedBindings = new Set<string>(),
): string | undefined {
    const normalizedExpression = unwrapExpression(expression);
    const literal = readStringLiteralLike(normalizedExpression);
    if (literal !== undefined) {
        return literal;
    }

    if (ts.isIdentifier(normalizedExpression)) {
        const localBinding = localBindings.get(normalizedExpression.text);
        if (localBinding && !visitedBindings.has(normalizedExpression.text)) {
            visitedBindings.add(normalizedExpression.text);
            return readMappedStringValue(
                localBinding,
                paramName,
                item,
                localBindings,
                context,
                visitedBindings,
            );
        }

        const constValue = context.constValues.get(normalizedExpression.text);
        if (typeof constValue === "string") {
            return constValue;
        }

        return item[normalizedExpression.text];
    }

    if (
        paramName &&
        ts.isPropertyAccessExpression(normalizedExpression) &&
        ts.isIdentifier(normalizedExpression.expression) &&
        normalizedExpression.expression.text === paramName
    ) {
        return item[normalizedExpression.name.text];
    }

    if (ts.isTemplateExpression(normalizedExpression)) {
        let resolved = normalizedExpression.head.text;
        for (const span of normalizedExpression.templateSpans) {
            const value = readMappedStringValue(
                span.expression,
                paramName,
                item,
                localBindings,
                context,
                new Set(visitedBindings),
            );
            if (value === undefined) {
                return undefined;
            }

            resolved += value;
            resolved += span.literal.text;
        }

        return resolved;
    }

    return undefined;
}

function resolveMappedParamsCall(
    expression: ts.CallExpression,
    paramName: string | undefined,
    item: Record<string, string>,
    localBindings: RouteLocalBindings,
    context: RouteSourceContext,
): Record<string, string> | undefined {
    return resolveMappedParamsCallWithVisited(
        expression,
        paramName,
        item,
        localBindings,
        context,
        new Set<string>(),
    );
}

function resolveMappedEntryCall(
    expression: ts.CallExpression,
    paramName: string | undefined,
    item: Record<string, string>,
    localBindings: RouteLocalBindings,
    context: RouteSourceContext,
): RouteEntryDefinition | undefined {
    return resolveMappedEntryCallWithVisited(
        expression,
        paramName,
        item,
        localBindings,
        context,
        new Set<string>(),
    );
}

function resolveMappedEntryCallWithVisited(
    expression: ts.CallExpression,
    paramName: string | undefined,
    item: Record<string, string>,
    localBindings: RouteLocalBindings,
    context: RouteSourceContext,
    visitedCallables: Set<string>,
): RouteEntryDefinition | undefined {
    const callee = resolveRouteCallableExpression(unwrapExpression(expression.expression), context);
    if (!ts.isArrowFunction(callee) && !ts.isFunctionExpression(callee)) {
        return undefined;
    }

    const mergedBindings = buildResolvedCallBindings(callee, expression.arguments, localBindings);
    if (!mergedBindings) {
        return undefined;
    }

    const returnedExpression = ts.isBlock(callee.body)
        ? findReturnedExpression(callee.body)
        : callee.body;
    if (!returnedExpression) {
        return undefined;
    }

    const directResult = readMappedEntryDefinition(
        returnedExpression,
        paramName,
        item,
        mergedBindings,
        context,
    );
    if (directResult) {
        return directResult;
    }

    const normalizedReturnedExpression = unwrapExpression(returnedExpression);
    if (!ts.isCallExpression(normalizedReturnedExpression)) {
        return undefined;
    }

    const nestedCallableName = readCallableIdentifier(normalizedReturnedExpression.expression);
    if (nestedCallableName) {
        if (visitedCallables.has(nestedCallableName)) {
            return undefined;
        }

        visitedCallables.add(nestedCallableName);
    }

    return resolveMappedEntryCallWithVisited(
        normalizedReturnedExpression,
        paramName,
        item,
        mergedBindings,
        context,
        visitedCallables,
    );
}

function resolveMappedParamsCallWithVisited(
    expression: ts.CallExpression,
    paramName: string | undefined,
    item: Record<string, string>,
    localBindings: RouteLocalBindings,
    context: RouteSourceContext,
    visitedCallables: Set<string>,
): Record<string, string> | undefined {
    const callee = resolveRouteCallableExpression(unwrapExpression(expression.expression), context);
    if (!ts.isArrowFunction(callee) && !ts.isFunctionExpression(callee)) {
        return undefined;
    }

    const mergedBindings = buildResolvedCallBindings(callee, expression.arguments, localBindings);
    if (!mergedBindings) {
        return undefined;
    }

    const returnedExpression = ts.isBlock(callee.body)
        ? findReturnedExpression(callee.body)
        : callee.body;
    if (!returnedExpression) {
        return undefined;
    }

    const directResult = readMappedParamsObject(
        returnedExpression,
        paramName,
        item,
        mergedBindings,
        context,
    );
    if (directResult) {
        return directResult;
    }

    const normalizedReturnedExpression = unwrapExpression(returnedExpression);
    if (!ts.isCallExpression(normalizedReturnedExpression)) {
        return undefined;
    }

    const nestedCallableName = readCallableIdentifier(normalizedReturnedExpression.expression);
    if (nestedCallableName) {
        if (visitedCallables.has(nestedCallableName)) {
            return undefined;
        }

        visitedCallables.add(nestedCallableName);
    }

    return resolveMappedParamsCallWithVisited(
        normalizedReturnedExpression,
        paramName,
        item,
        mergedBindings,
        context,
        visitedCallables,
    );
}

function buildResolvedCallBindings(
    callee: ts.ArrowFunction | ts.FunctionExpression,
    args: ts.NodeArray<ts.Expression>,
    localBindings: RouteLocalBindings,
): Map<string, ts.Expression> | undefined {
    const callBindings = new Map<string, ts.Expression>();
    for (const [index, parameter] of callee.parameters.entries()) {
        if (!ts.isIdentifier(parameter.name)) {
            return undefined;
        }

        const argument = args[index];
        if (!argument) {
            return undefined;
        }

        const normalizedArgument = unwrapExpression(argument);
        const resolvedArgument = ts.isIdentifier(normalizedArgument)
            ? localBindings.get(normalizedArgument.text) ?? argument
            : argument;
        callBindings.set(parameter.name.text, resolvedArgument);
    }

    const bodyBindings = ts.isBlock(callee.body)
        ? collectLocalConstBindings(callee.body)
        : new Map<string, ts.Expression>();

    return new Map<string, ts.Expression>([
        ...localBindings.entries(),
        ...callBindings.entries(),
        ...bodyBindings.entries(),
    ]);
}
