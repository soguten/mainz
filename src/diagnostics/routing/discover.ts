import { ts } from "../../compiler/typescript.ts";
import { readClassRenderDataContractInfo } from "../core/class-render-data.ts";
import type { RouteDiagnosticsPageInput, RoutePageFacts } from "./facts.ts";
import { analyzeEntriesMember } from "./entries-evaluator.ts";
import {
    createRouteSourceContext,
    hasStaticModifier,
    isNamedProperty,
    visitSourceNode,
} from "./entries-support.ts";

export async function collectRoutePageFacts(
    pages: readonly RouteDiagnosticsPageInput[],
): Promise<ReadonlyMap<string, RoutePageFacts>> {
    const sourceCache = new Map<string, string>();
    const pageFactsByPage = new Map<string, RoutePageFacts>();

    for (const page of pages) {
        const source = sourceCache.get(page.file) ?? await Deno.readTextFile(page.file);
        sourceCache.set(page.file, source);

        const filePageFacts = parseRoutePageFacts(source);
        const pageFacts = filePageFacts.get(page.exportName) ?? {
            staticMembers: {
                hasEntriesMember: false,
                hasStaticLoadMember: false,
                hasInstanceLoadMember: false,
            },
            entriesFact: {
                hasEntriesMember: false,
            },
            hasRenderDataParameter: false,
            renderDataParameterTypeIsUnknown: false,
            hasExplicitDataContract: false,
        };

        pageFactsByPage.set(createPageFactsKey(page), pageFacts);
    }

    return pageFactsByPage;
}

function createPageFactsKey(page: RouteDiagnosticsPageInput): string {
    return `${page.file}::${page.exportName}`;
}

function parseRoutePageFacts(source: string): ReadonlyMap<string, RoutePageFacts> {
    const sourceFile = ts.createSourceFile(
        "route-diagnostics.tsx",
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
    );
    const pageFactsByExportName = new Map<string, RoutePageFacts>();
    const context = createRouteSourceContext(sourceFile);

    visitSourceNode(sourceFile, (node) => {
        if (!ts.isClassDeclaration(node) || !node.name || !isExportedClassDeclaration(node)) {
            return;
        }

        const staticMembers = {
            hasEntriesMember: classHasStaticMember(node, "entries"),
            hasStaticLoadMember: classHasStaticMember(node, "load"),
            hasInstanceLoadMember: classHasInstanceMember(node, "load"),
        };
        const renderDataContractInfo = readClassRenderDataContractInfo(node, ["Page"]);
        const entriesFact = {
            hasEntriesMember: staticMembers.hasEntriesMember,
            evaluation: analyzeEntriesMember(node, context),
        };

        pageFactsByExportName.set(node.name.text, {
            staticMembers,
            entriesFact,
            hasRenderDataParameter: renderDataContractInfo.hasRenderDataParameter,
            renderDataParameterTypeIsUnknown:
                renderDataContractInfo.renderDataParameterTypeIsUnknown,
            hasExplicitDataContract: renderDataContractInfo.hasExplicitDataContract,
        });
    });

    return pageFactsByExportName;
}

function isExportedClassDeclaration(node: ts.ClassDeclaration): boolean {
    return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ??
        false;
}

function classHasStaticMember(node: ts.ClassDeclaration, memberName: string): boolean {
    return node.members.some((member) => {
        if (!hasStaticModifier(member)) {
            return false;
        }

        return (
            (ts.isMethodDeclaration(member) || ts.isPropertyDeclaration(member)) &&
            isNamedProperty(member.name, memberName)
        );
    });
}

function classHasInstanceMember(node: ts.ClassDeclaration, memberName: string): boolean {
    return node.members.some((member) => {
        if (hasStaticModifier(member)) {
            return false;
        }

        return (
            (ts.isMethodDeclaration(member) || ts.isPropertyDeclaration(member)) &&
            isNamedProperty(member.name, memberName)
        );
    });
}
