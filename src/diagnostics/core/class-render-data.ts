import { ts } from "../../compiler/typescript.ts";

export interface ClassRenderDataContractInfo {
  hasRenderDataParameter: boolean;
  renderDataParameterTypeIsUnknown: boolean;
  hasExplicitDataContract: boolean;
}

export function readClassRenderDataContractInfo(
  node: ts.ClassDeclaration,
  baseNames: readonly string[],
): ClassRenderDataContractInfo {
  const renderDataParameter = readRenderDataParameterInfo(node);

  return {
    hasRenderDataParameter: renderDataParameter.hasParameter,
    renderDataParameterTypeIsUnknown: renderDataParameter.typeIsUnknown,
    hasExplicitDataContract: classDeclaresExplicitDataContract(node, baseNames),
  };
}

function readRenderDataParameterInfo(node: ts.ClassDeclaration): {
  hasParameter: boolean;
  typeIsUnknown: boolean;
} {
  for (const member of node.members) {
    if (
      !ts.isMethodDeclaration(member) ||
      hasStaticModifier(member) ||
      !isNamedProperty(member.name, "render")
    ) {
      continue;
    }

    const [firstParameter] = member.parameters;
    if (!firstParameter) {
      return {
        hasParameter: false,
        typeIsUnknown: false,
      };
    }

    return {
      hasParameter: true,
      typeIsUnknown: isUnknownTypeNode(firstParameter.type),
    };
  }

  return {
    hasParameter: false,
    typeIsUnknown: false,
  };
}

function classDeclaresExplicitDataContract(
  node: ts.ClassDeclaration,
  baseNames: readonly string[],
): boolean {
  for (const clause of node.heritageClauses ?? []) {
    if (clause.token !== ts.SyntaxKind.ExtendsKeyword) {
      continue;
    }

    for (const type of clause.types) {
      if (
        !ts.isIdentifier(type.expression) ||
        !baseNames.includes(type.expression.text)
      ) {
        continue;
      }

      return (type.typeArguments?.length ?? 0) >= 3;
    }
  }

  return false;
}

function isUnknownTypeNode(type: ts.TypeNode | undefined): boolean {
  return type?.kind === ts.SyntaxKind.UnknownKeyword ||
    (
      !!type &&
      ts.isTypeReferenceNode(type) &&
      ts.isIdentifier(type.typeName) &&
      type.typeName.text === "unknown"
    );
}

function hasStaticModifier(
  member: {
    modifiers?: ts.NodeArray<ts.ModifierLike>;
  },
): boolean {
  return member.modifiers?.some((modifier) =>
    modifier.kind === ts.SyntaxKind.StaticKeyword
  ) ??
    false;
}

function isNamedProperty(
  name: ts.PropertyName | undefined,
  propertyName: string,
): boolean {
  return !!name &&
    ((ts.isIdentifier(name) || ts.isStringLiteral(name) ||
      ts.isNumericLiteral(name)) &&
      name.text === propertyName);
}
