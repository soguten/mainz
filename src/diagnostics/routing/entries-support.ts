import { ts } from "../../compiler/typescript.ts";

export interface RouteSourceContext {
  readonly constValues: ReadonlyMap<string, RouteConstValue>;
  readonly callableValues: ReadonlyMap<string, ts.Expression>;
  readonly paramsObjectValues: ReadonlyMap<string, Record<string, string>>;
}

type RouteConstValue = string | readonly Record<string, string>[];
export type RouteLocalBindings = ReadonlyMap<string, ts.Expression>;

export function createRouteSourceContext(
  sourceFile: ts.SourceFile,
): RouteSourceContext {
  return {
    constValues: collectRouteConstValues(sourceFile),
    callableValues: collectRouteCallableValues(sourceFile),
    paramsObjectValues: collectRouteParamsObjectValues(sourceFile),
  };
}

export function findReturnedExpression(
  body: ts.Block,
): ts.Expression | undefined {
  for (const statement of body.statements) {
    if (ts.isReturnStatement(statement)) {
      return statement.expression;
    }
  }

  return undefined;
}

export function collectLocalConstBindings(body: ts.Block): RouteLocalBindings {
  const bindings = new Map<string, ts.Expression>();

  for (const statement of body.statements) {
    if (ts.isReturnStatement(statement)) {
      break;
    }

    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer) {
        bindings.set(declaration.name.text, declaration.initializer);
      }
    }
  }

  return bindings;
}

export function readStringRecordLiteral(
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
      const spreadRecord = readStringRecordLiteral(
        property.expression,
        knownParamsObjects,
      );
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

export function unwrapExpression(expression: ts.Expression): ts.Expression {
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

export function resolveRouteCallableExpression(
  expression: ts.Expression,
  context: RouteSourceContext,
): ts.Expression {
  if (!ts.isIdentifier(expression)) {
    return expression;
  }

  return context.callableValues.get(expression.text) ?? expression;
}

export function readCallableIdentifier(
  expression: ts.Expression,
): string | undefined {
  const normalizedExpression = unwrapExpression(expression);
  return ts.isIdentifier(normalizedExpression)
    ? normalizedExpression.text
    : undefined;
}

export function hasStaticModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node) &&
    (ts.getModifiers(node)?.some((modifier) =>
      modifier.kind === ts.SyntaxKind.StaticKeyword
    ) ??
      false);
}

export function isNamedProperty(
  name: ts.PropertyName | undefined,
  expectedName?: string,
): boolean {
  const propertyName = readPropertyName(name);
  return propertyName !== undefined &&
    (expectedName ? propertyName === expectedName : true);
}

export function readPropertyName(
  name: ts.PropertyName | undefined,
): string | undefined {
  if (!name) {
    return undefined;
  }

  if (
    ts.isIdentifier(name) || ts.isStringLiteral(name) ||
    ts.isNumericLiteral(name)
  ) {
    return name.text;
  }

  return undefined;
}

export function readStringLiteralLike(node: ts.Expression): string | undefined {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    ? node.text
    : undefined;
}

export function visitSourceNode(
  node: ts.Node,
  visitor: (node: ts.Node) => void,
): void {
  visitor(node);
  node.forEachChild((child) => visitSourceNode(child, visitor));
}

function collectRouteConstValues(
  sourceFile: ts.SourceFile,
): ReadonlyMap<string, RouteConstValue> {
  const values = new Map<string, RouteConstValue>();

  visitSourceNode(sourceFile, (node) => {
    if (
      !ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) ||
      !node.initializer
    ) {
      return;
    }

    const arrayValue = readStringRecordArrayLiteral(node.initializer);
    if (arrayValue) {
      values.set(node.name.text, arrayValue);
      return;
    }

    const stringValue = readStringLiteralLike(
      unwrapExpression(node.initializer),
    );
    if (stringValue !== undefined) {
      values.set(node.name.text, stringValue);
    }
  });

  return values;
}

function collectRouteCallableValues(
  sourceFile: ts.SourceFile,
): ReadonlyMap<string, ts.Expression> {
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

    if (
      !ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) ||
      !node.initializer
    ) {
      return;
    }

    const initializer = unwrapExpression(node.initializer);
    if (
      ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)
    ) {
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
    if (
      !ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) ||
      !node.initializer
    ) {
      return;
    }

    const paramsObject = readStringRecordLiteral(node.initializer, values);
    if (paramsObject) {
      values.set(node.name.text, paramsObject);
    }
  });

  return values;
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
