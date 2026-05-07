/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { relative, resolve } from "node:path";
import { ts } from "@/compiler/typescript.ts";

interface ImportReference {
  file: string;
  line: number;
  specifier: string;
}

Deno.test("diagnostics/boundary: core modules should not import diagnostics", async () => {
  const srcDir = resolve(Deno.cwd(), "src");
  const files = await collectSourceFiles(srcDir);
  const violations: ImportReference[] = [];

  for (const file of files) {
    if (isAllowedDiagnosticsImporter(file)) {
      continue;
    }

    const source = await Deno.readTextFile(file);
    const sourceFile = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    for (const importReference of collectImportReferences(sourceFile)) {
      if (referencesDiagnostics(importReference.specifier)) {
        violations.push({
          ...importReference,
          file: normalizePathSlashes(relative(Deno.cwd(), file)),
        });
      }
    }
  }

  assertEquals(violations, []);
});

async function collectSourceFiles(directory: string): Promise<string[]> {
  const files: string[] = [];

  for await (const entry of Deno.readDir(directory)) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory) {
      files.push(...await collectSourceFiles(path));
      continue;
    }

    if (!entry.isFile || !/\.(ts|tsx)$/.test(path)) {
      continue;
    }

    files.push(path);
  }

  return files;
}

function collectImportReferences(sourceFile: ts.SourceFile): ImportReference[] {
  const references: ImportReference[] = [];

  visitNode(sourceFile, (node) => {
    const specifier = readModuleSpecifier(node);
    if (!specifier) {
      return;
    }

    references.push({
      file: sourceFile.fileName,
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
        .line + 1,
      specifier,
    });
  });

  return references;
}

function readModuleSpecifier(node: ts.Node): string | undefined {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier &&
    ts.isStringLiteralLike(node.moduleSpecifier)
  ) {
    return node.moduleSpecifier.text;
  }

  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments.length === 1
  ) {
    const [argument] = node.arguments;
    return argument && ts.isStringLiteralLike(argument)
      ? argument.text
      : undefined;
  }

  return undefined;
}

function referencesDiagnostics(specifier: string): boolean {
  return specifier === "mainz/diagnostics" ||
    specifier.includes("/diagnostics") ||
    specifier.includes("diagnostics/");
}

function isAllowedDiagnosticsImporter(file: string): boolean {
  const normalized = normalizePathSlashes(file);
  return normalized.includes("/diagnostics/") ||
    normalized.endsWith("/src/diagnostics.ts") ||
    normalized.includes("/src/cli/") ||
    normalized.includes("/tests/") ||
    /\.test\.(ts|tsx)$/.test(normalized) ||
    /\.fixture\.(ts|tsx)$/.test(normalized);
}

function visitNode(node: ts.Node, visitor: (node: ts.Node) => void): void {
  visitor(node);
  node.forEachChild((child) => visitNode(child, visitor));
}

function normalizePathSlashes(path: string): string {
  return path.replaceAll("\\", "/");
}
