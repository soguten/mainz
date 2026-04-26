import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { denoToolingRuntime } from "../../tooling/runtime/deno.ts";
import type { MainzToolingRuntime } from "../../tooling/runtime/types.ts";

export interface LoadedTemplate {
    manifest: Record<string, unknown>;
    manifestSource: string;
    root: string;
    filesRoot: string;
}

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, "..", "..", "..");

export function resolveBuiltInTemplateRoot(kind: string, name: string): string {
    return resolve(repoRoot, "templates", kind, name);
}

export async function loadTemplate(
    templateRoot: string,
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<LoadedTemplate> {
    const manifestPath = resolve(templateRoot, "template.json");
    const manifestSource = await runtime.readTextFile(manifestPath);
    const manifest = JSON.parse(manifestSource) as Record<string, unknown>;

    if (!manifest.kind || !manifest.name) {
        throw new Error(`Invalid template manifest at "${manifestPath}".`);
    }

    return {
        manifest,
        manifestSource,
        root: templateRoot,
        filesRoot: resolve(templateRoot, "files"),
    };
}
