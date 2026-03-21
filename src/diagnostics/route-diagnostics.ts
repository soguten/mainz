import { isDynamicRoutePath, validateRouteEntryParams } from "../routing/index.ts";
import ts from "npm:typescript";

export type MainzDiagnosticSeverity = "warning" | "error";
export type MainzDiagnosticCode =
    | "missing-render-mode-decorator"
    | "dynamic-ssg-missing-entries"
    | "dynamic-ssg-missing-load"
    | "dynamic-ssg-invalid-entries"
    | "not-found-must-use-ssg"
    | "multiple-not-found-pages";

export interface MainzDiagnostic {
    code: MainzDiagnosticCode;
    severity: MainzDiagnosticSeverity;
    message: string;
    file: string;
    exportName: string;
    routePath?: string;
}

export interface RouteDiagnosticsPageInput {
    file: string;
    exportName: string;
    page: {
        path: string;
        mode: "csr" | "ssg";
        hasExplicitRenderMode?: boolean;
        notFound?: boolean;
        locales?: readonly string[];
    };
}

export async function collectRouteDiagnostics(
    pages: readonly RouteDiagnosticsPageInput[],
): Promise<readonly MainzDiagnostic[]> {
    const diagnostics: MainzDiagnostic[] = [];
    const notFoundPages = pages.filter((page) => page.page.notFound === true);
    const pageAnalyses = await collectRouteSourceAnalyses(pages);

    if (notFoundPages.length > 1) {
        for (const page of notFoundPages) {
            diagnostics.push({
                code: "multiple-not-found-pages",
                severity: "error",
                message:
                    `Only one notFound page may be declared per routing set. "${page.exportName}" conflicts with other notFound pages.`,
                file: page.file,
                exportName: page.exportName,
                routePath: page.page.path,
            });
        }
    }

    for (const page of pages) {
        if (page.page.hasExplicitRenderMode !== true) {
            diagnostics.push({
                code: "missing-render-mode-decorator",
                severity: "warning",
                message:
                    `Page "${page.exportName}" should declare @RenderMode("${page.page.mode}") explicitly instead of relying on the implicit default.`,
                file: page.file,
                exportName: page.exportName,
                routePath: page.page.path,
            });
        }

        if (page.page.notFound === true && page.page.mode !== "ssg") {
            diagnostics.push({
                code: "not-found-must-use-ssg",
                severity: "error",
                message: `notFound page "${page.exportName}" must use @RenderMode("ssg").`,
                file: page.file,
                exportName: page.exportName,
                routePath: page.page.path,
            });
        }

        if (page.page.mode !== "ssg" || !isDynamicRoutePath(page.page.path)) {
            continue;
        }

        const analysis = pageAnalyses.get(createPageAnalysisKey(page));
        const hasEntries = analysis?.hasEntries === true;
        const hasLoad = analysis?.hasLoad === true;

        if (!hasEntries) {
            diagnostics.push({
                code: "dynamic-ssg-missing-entries",
                severity: "error",
                message: `SSG route "${page.page.path}" must define entries() to expand dynamic params.`,
                file: page.file,
                exportName: page.exportName,
                routePath: page.page.path,
            });
            continue;
        }

        const entriesDiagnostics = collectEntriesDiagnostics(page, analysis);
        diagnostics.push(...entriesDiagnostics.diagnostics);

        if (!hasLoad && !entriesDiagnostics.hasInvalidEntries) {
            diagnostics.push({
                code: "dynamic-ssg-missing-load",
                severity: "warning",
                message:
                    `Dynamic SSG route "${page.page.path}" defines entries() but no load(). This is valid when route params are sufficient to render, but consider load.byParam(...) or load.byParams(...) if the page repeats route lookups.`,
                file: page.file,
                exportName: page.exportName,
                routePath: page.page.path,
            });
        }
    }

    return diagnostics;
}

function collectEntriesDiagnostics(
    page: RouteDiagnosticsPageInput,
    analysis: RouteSourceAnalysis | undefined,
): {
    diagnostics: readonly MainzDiagnostic[];
    hasInvalidEntries: boolean;
} {
    if (!analysis?.entries) {
        return {
            diagnostics: [],
            hasInvalidEntries: false,
        };
    }

    const diagnostics: MainzDiagnostic[] = [];
    const locales = page.page.locales?.length ? page.page.locales : [undefined];

    if (analysis.entries.kind === "non-array") {
        diagnostics.push({
            code: "dynamic-ssg-invalid-entries",
            severity: "error",
            message:
                `entries() for dynamic SSG route "${page.page.path}" returned a non-array result. Expected an array of entry definitions.`,
            file: page.file,
            exportName: page.exportName,
            routePath: page.page.path,
        });
        return {
            diagnostics,
            hasInvalidEntries: true,
        };
    }

    if (analysis.entries.kind !== "array") {
        return {
            diagnostics,
            hasInvalidEntries: false,
        };
    }

    for (const locale of locales) {
        for (const [entryIndex, entry] of analysis.entries.entries.entries()) {
            try {
                validateRouteEntryParams(page.page.path, entry.params);
            } catch (error) {
                diagnostics.push({
                    code: "dynamic-ssg-invalid-entries",
                    severity: "error",
                    message:
                        `entries() for dynamic SSG route "${page.page.path}" returned an invalid entry at index ${entryIndex}${locale ? ` for locale "${locale}"` : ""}: ${toErrorMessage(error)}`,
                    file: page.file,
                    exportName: page.exportName,
                    routePath: page.page.path,
                });
            }
        }
    }

    return {
        diagnostics,
        hasInvalidEntries: diagnostics.length > 0,
    };
}

interface ParsedRouteEntryDefinition {
    params: Record<string, string>;
}

interface RouteSourceAnalysis {
    hasEntries: boolean;
    hasLoad: boolean;
    entries?:
        | { kind: "unknown" }
        | { kind: "non-array" }
        | { kind: "array"; entries: readonly ParsedRouteEntryDefinition[] };
}

interface RouteSourceContext {
    readonly constValues: ReadonlyMap<string, RouteConstValue>;
    readonly callableValues: ReadonlyMap<string, ts.Expression>;
    readonly paramsObjectValues: ReadonlyMap<string, Record<string, string>>;
}

type RouteConstValue = string | readonly Record<string, string>[];
type RouteLocalBindings = ReadonlyMap<string, ts.Expression>;

async function collectRouteSourceAnalyses(
    pages: readonly RouteDiagnosticsPageInput[],
): Promise<ReadonlyMap<string, RouteSourceAnalysis>> {
    const sourceCache = new Map<string, string>();
    const analyses = new Map<string, RouteSourceAnalysis>();

    for (const page of pages) {
        const source = sourceCache.get(page.file) ?? await Deno.readTextFile(page.file);
        sourceCache.set(page.file, source);

        const fileAnalyses = parseRouteSourceAnalyses(source);
        const analysis = fileAnalyses.get(page.exportName) ?? {
            hasEntries: false,
            hasLoad: false,
        };

        analyses.set(createPageAnalysisKey(page), analysis);
    }

    return analyses;
}

function createPageAnalysisKey(page: RouteDiagnosticsPageInput): string {
    return `${page.file}::${page.exportName}`;
}

function parseRouteSourceAnalyses(source: string): ReadonlyMap<string, RouteSourceAnalysis> {
    const sourceFile = ts.createSourceFile(
        "route-diagnostics.tsx",
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
    );
    const analyses = new Map<string, RouteSourceAnalysis>();
    const context: RouteSourceContext = {
        constValues: collectRouteConstValues(sourceFile),
        callableValues: collectRouteCallableValues(sourceFile),
        paramsObjectValues: collectRouteParamsObjectValues(sourceFile),
    };

    visitSourceNode(sourceFile, (node) => {
        if (!ts.isClassDeclaration(node) || !node.name || !isExportedClassDeclaration(node)) {
            return;
        }

        analyses.set(node.name.text, {
            hasEntries: classHasStaticMember(node, "entries"),
            hasLoad: classHasStaticMember(node, "load"),
            entries: analyzeEntriesMember(node, context),
        });
    });

    return analyses;
}

function isExportedClassDeclaration(node: ts.ClassDeclaration): boolean {
    return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function classHasStaticMember(node: ts.ClassDeclaration, memberName: string): boolean {
    return node.members.some((member) => {
        if (!hasStaticModifier(member)) {
            return false;
        }

        if (
            (ts.isMethodDeclaration(member) || ts.isPropertyDeclaration(member)) &&
            isNamedProperty(member.name, memberName)
        ) {
            return true;
        }

        return false;
    });
}

function analyzeEntriesMember(
    node: ts.ClassDeclaration,
    context: RouteSourceContext,
): RouteSourceAnalysis["entries"] | undefined {
    for (const member of node.members) {
        if (!hasStaticModifier(member)) {
            continue;
        }

        if (ts.isMethodDeclaration(member) && isNamedProperty(member.name, "entries")) {
            return analyzeEntriesExpression(member.body ? findReturnedExpression(member.body) : undefined, context);
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
): RouteSourceAnalysis["entries"] {
    return analyzeEntriesExpressionWithVisited(expression, context, new Set<string>());
}

function analyzeEntriesExpressionWithVisited(
    expression: ts.Expression | undefined,
    context: RouteSourceContext,
    visitedCallables: Set<string>,
): RouteSourceAnalysis["entries"] {
    if (!expression) {
        return { kind: "unknown" };
    }

    if (ts.isAwaitExpression(expression)) {
        return analyzeEntriesExpressionWithVisited(expression.expression, context, visitedCallables);
    }

    if (ts.isParenthesizedExpression(expression)) {
        return analyzeEntriesExpressionWithVisited(expression.expression, context, visitedCallables);
    }

    if (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) {
        return analyzeEntriesExpressionWithVisited(expression.expression, context, visitedCallables);
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
        const helperResult = analyzeEntriesHelperCall(expression, context);
        if (helperResult) {
            return helperResult;
        }

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

    const entries: ParsedRouteEntryDefinition[] = [];
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
): RouteSourceAnalysis["entries"] {
    const normalizedExpression = unwrapExpression(expression);
    if (!ts.isArrowFunction(normalizedExpression) && !ts.isFunctionExpression(normalizedExpression)) {
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
): RouteSourceAnalysis["entries"] | undefined {
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

function analyzeEntriesHelperCall(
    expression: ts.CallExpression,
    context: RouteSourceContext,
): RouteSourceAnalysis["entries"] | undefined {
    if (!ts.isPropertyAccessExpression(expression.expression)) {
        return undefined;
    }

    const target = expression.expression.expression;
    const helper = expression.expression.name.text;
    if (!ts.isIdentifier(target) || target.text !== "entries") {
        return undefined;
    }

    if (helper === "from") {
        return analyzeEntriesFromCall(expression.arguments, context);
    }

    if (helper === "fromAsync") {
        return analyzeEntriesFromAsyncCall(expression.arguments, context);
    }

    return undefined;
}

function analyzeEntriesFromCall(
    args: ts.NodeArray<ts.Expression>,
    context: RouteSourceContext,
): RouteSourceAnalysis["entries"] {
    const [itemsExpression, mapperExpression] = args;
    if (!itemsExpression || !mapperExpression) {
        return { kind: "unknown" };
    }

    const items = readLiteralItems(itemsExpression, context);
    if (!items) {
        return { kind: "unknown" };
    }

    const mapper = readEntriesMapper(mapperExpression, context);
    if (!mapper) {
        return { kind: "unknown" };
    }

    const entries: ParsedRouteEntryDefinition[] = [];
    for (const item of items) {
        const mappedEntry = mapper(item);
        if (!mappedEntry) {
            return { kind: "unknown" };
        }

        entries.push(mappedEntry);
    }

    return {
        kind: "array",
        entries,
    };
}

function analyzeEntriesFromAsyncCall(
    args: ts.NodeArray<ts.Expression>,
    context: RouteSourceContext,
): RouteSourceAnalysis["entries"] {
    const [loaderExpression, mapperExpression] = args;
    if (!loaderExpression) {
        return { kind: "unknown" };
    }

    const loadedItems = readAsyncEntriesLoaderItems(loaderExpression, context);
    if (!loadedItems) {
        return { kind: "unknown" };
    }

    if (!mapperExpression) {
        const entries = loadedItems.map((item) => ({
            params: item,
        }));
        return {
            kind: "array",
            entries,
        };
    }

    const mapper = readEntriesMapper(mapperExpression, context);
    if (!mapper) {
        return { kind: "unknown" };
    }

    const entries: ParsedRouteEntryDefinition[] = [];
    for (const item of loadedItems) {
        const mappedEntry = mapper(item);
        if (!mappedEntry) {
            return { kind: "unknown" };
        }

        entries.push(mappedEntry);
    }

    return {
        kind: "array",
        entries,
    };
}

function findReturnedExpression(body: ts.Block): ts.Expression | undefined {
    for (const statement of body.statements) {
        if (ts.isReturnStatement(statement)) {
            return statement.expression;
        }
    }

    return undefined;
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

function readLiteralItems(
    expression: ts.Expression,
    context: RouteSourceContext,
): readonly Record<string, string>[] | undefined {
    const normalizedExpression = unwrapExpression(expression);
    if (ts.isIdentifier(normalizedExpression)) {
        const resolved = context.constValues.get(normalizedExpression.text);
        return Array.isArray(resolved) ? resolved : undefined;
    }

    if (!ts.isArrayLiteralExpression(normalizedExpression)) {
        return undefined;
    }

    const items: Record<string, string>[] = [];
    for (const element of normalizedExpression.elements) {
        const item = readStringRecordLiteral(element);
        if (!item) {
            return undefined;
        }

        items.push(item);
    }

    return items;
}

function readAsyncEntriesLoaderItems(
    expression: ts.Expression,
    context: RouteSourceContext,
): readonly Record<string, string>[] | undefined {
    const normalizedExpression = resolveRouteCallableExpression(unwrapExpression(expression), context);
    if (!ts.isArrowFunction(normalizedExpression) && !ts.isFunctionExpression(normalizedExpression)) {
        return undefined;
    }

    const returnedExpression = ts.isBlock(normalizedExpression.body)
        ? findReturnedExpression(normalizedExpression.body)
        : normalizedExpression.body;

    return returnedExpression ? readLiteralItems(returnedExpression, context) : undefined;
}

function readEntriesMapper(
    expression: ts.Expression,
    context: RouteSourceContext,
): ((item: Record<string, string>) => ParsedRouteEntryDefinition | undefined) | undefined {
    const normalizedExpression = resolveRouteCallableExpression(unwrapExpression(expression), context);
    if (!ts.isArrowFunction(normalizedExpression) && !ts.isFunctionExpression(normalizedExpression)) {
        return undefined;
    }

    const [itemParam] = normalizedExpression.parameters;
    if (itemParam && !ts.isIdentifier(itemParam.name)) {
        return undefined;
    }

    const paramName = itemParam && ts.isIdentifier(itemParam.name) ? itemParam.name.text : undefined;
    const localBindings = ts.isBlock(normalizedExpression.body)
        ? collectLocalConstBindings(normalizedExpression.body)
        : new Map<string, ts.Expression>();
    const returnedExpression = ts.isBlock(normalizedExpression.body)
        ? findReturnedExpression(normalizedExpression.body)
        : normalizedExpression.body;
    if (!returnedExpression) {
        return undefined;
    }

    return (item) => readMappedEntryDefinition(returnedExpression, paramName, item, localBindings, context);
}

function readMappedEntryDefinition(
    expression: ts.Expression,
    paramName: string | undefined,
    item: Record<string, string>,
    localBindings: RouteLocalBindings,
    context: RouteSourceContext,
): ParsedRouteEntryDefinition | undefined {
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

    const paramsProperty = normalizedExpression.properties.find((property): property is ts.PropertyAssignment =>
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

    const shorthandParamsProperty = normalizedExpression.properties.find((property): property is ts.ShorthandPropertyAssignment =>
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

    const directParams = readMappedParamsObject(normalizedExpression, paramName, item, localBindings, context);
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
            const key = property.name.text;
            const value = readMappedStringValue(property.name, paramName, item, localBindings, context);
            if (value === undefined) {
                return undefined;
            }

            params[key] = value;
            continue;
        }

        if (!ts.isPropertyAssignment(property) || !isNamedProperty(property.name)) {
            return undefined;
        }

        const key = readPropertyName(property.name);
        const value = readMappedStringValue(property.initializer, paramName, item, localBindings, context);
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
            return readMappedStringValue(localBinding, paramName, item, localBindings, context, visitedBindings);
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
): ParsedRouteEntryDefinition | undefined {
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
): ParsedRouteEntryDefinition | undefined {
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

    const directResult = readMappedEntryDefinition(returnedExpression, paramName, item, mergedBindings, context);
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

    const directResult = readMappedParamsObject(returnedExpression, paramName, item, mergedBindings, context);
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

function readStringRecordLiteral(
    expression: ts.Expression,
    knownParamsObjects: ReadonlyMap<string, Record<string, string>> = new Map(),
): Record<string, string> | undefined {
    const normalizedExpression = unwrapExpression(expression);
    if (ts.isIdentifier(normalizedExpression)) {
        const knownParams = knownParamsObjects.get(normalizedExpression.text);
        return knownParams ? { ...knownParams } : undefined;
    }

    if (!ts.isObjectLiteralExpression(normalizedExpression)) {
        return undefined;
    }

    const record: Record<string, string> = {};
    for (const property of normalizedExpression.properties) {
        if (ts.isSpreadAssignment(property)) {
            const spreadRecord = readStringRecordLiteral(property.expression, knownParamsObjects);
            if (!spreadRecord) {
                return undefined;
            }

            Object.assign(record, spreadRecord);
            continue;
        }

        if (!ts.isPropertyAssignment(property) || !isNamedProperty(property.name)) {
            return undefined;
        }

        const key = readPropertyName(property.name);
        const value = readStringLiteralLike(unwrapExpression(property.initializer));
        if (!key || value === undefined) {
            return undefined;
        }

        record[key] = value;
    }

    return record;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
    let current = expression;

    while (
        ts.isParenthesizedExpression(current) ||
        ts.isAsExpression(current) ||
        ts.isSatisfiesExpression(current) ||
        ts.isAwaitExpression(current)
    ) {
        current = current.expression;
    }

    return current;
}

function collectRouteConstValues(sourceFile: ts.SourceFile): ReadonlyMap<string, RouteConstValue> {
    const values = new Map<string, RouteConstValue>();

    visitSourceNode(sourceFile, (node) => {
        if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name)) {
            return;
        }

        const initializer = node.initializer;
        if (!initializer) {
            return;
        }

        const arrayValue = readStringRecordArrayLiteral(initializer);
        if (arrayValue) {
            values.set(node.name.text, arrayValue);
            return;
        }

        const stringValue = readStringLiteralLike(unwrapExpression(initializer));
        if (stringValue !== undefined) {
            values.set(node.name.text, stringValue);
        }
    });

    return values;
}

function collectRouteCallableValues(sourceFile: ts.SourceFile): ReadonlyMap<string, ts.Expression> {
    const values = new Map<string, ts.Expression>();

    visitSourceNode(sourceFile, (node) => {
        if (ts.isFunctionDeclaration(node) && node.name) {
            values.set(
                node.name.text,
                ts.factory.createFunctionExpression(
                    undefined,
                    node.asteriskToken,
                    undefined,
                    node.typeParameters,
                    node.parameters,
                    node.type,
                    node.body ?? ts.factory.createBlock([]),
                ),
            );
            return;
        }

        if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer) {
            return;
        }

        const initializer = unwrapExpression(node.initializer);
        if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
            values.set(node.name.text, initializer);
        }
    });

    return values;
}

function collectRouteParamsObjectValues(
    sourceFile: ts.SourceFile,
): ReadonlyMap<string, Record<string, string>> {
    const values = new Map<string, Record<string, string>>();

    visitSourceNode(sourceFile, (node) => {
        if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer) {
            return;
        }

        const paramsObject = readStringRecordLiteral(node.initializer, values);
        if (!paramsObject) {
            return;
        }

        values.set(node.name.text, paramsObject);
    });

    return values;
}

function collectLocalConstBindings(
    body: ts.Block,
): RouteLocalBindings {
    const bindings = new Map<string, ts.Expression>();

    for (const statement of body.statements) {
        if (ts.isReturnStatement(statement)) {
            break;
        }

        if (!ts.isVariableStatement(statement)) {
            continue;
        }

        for (const declaration of statement.declarationList.declarations) {
            if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
                continue;
            }

            bindings.set(declaration.name.text, declaration.initializer);
        }
    }

    return bindings;
}

function readStringRecordArrayLiteral(
    expression: ts.Expression,
): readonly Record<string, string>[] | undefined {
    const normalizedExpression = unwrapExpression(expression);
    if (!ts.isArrayLiteralExpression(normalizedExpression)) {
        return undefined;
    }

    const items: Record<string, string>[] = [];
    for (const element of normalizedExpression.elements) {
        const item = readStringRecordLiteral(element);
        if (!item) {
            return undefined;
        }

        items.push(item);
    }

    return items;
}

function resolveRouteCallableExpression(
    expression: ts.Expression,
    context: RouteSourceContext,
): ts.Expression {
    if (!ts.isIdentifier(expression)) {
        return expression;
    }

    return context.callableValues.get(expression.text) ?? expression;
}

function readCallableIdentifier(expression: ts.Expression): string | undefined {
    const normalizedExpression = unwrapExpression(expression);
    return ts.isIdentifier(normalizedExpression) ? normalizedExpression.text : undefined;
}

function hasStaticModifier(node: ts.Node): boolean {
    return ts.canHaveModifiers(node) &&
        (ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) ?? false);
}

function isNamedProperty(name: ts.PropertyName | undefined, expectedName?: string): boolean {
    const propertyName = readPropertyName(name);
    return propertyName !== undefined && (expectedName ? propertyName === expectedName : true);
}

function readPropertyName(name: ts.PropertyName | undefined): string | undefined {
    if (!name) {
        return undefined;
    }

    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
        return name.text;
    }

    return undefined;
}

function readStringLiteralLike(node: ts.Expression): string | undefined {
    return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : undefined;
}

function visitSourceNode(node: ts.Node, visitor: (node: ts.Node) => void): void {
    visitor(node);
    node.forEachChild((child) => visitSourceNode(child, visitor));
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}
