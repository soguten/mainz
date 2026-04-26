import { dirname, relative, resolve } from "node:path";
import { denoToolingRuntime } from "../../tooling/runtime/deno.ts";
import type { MainzToolingRuntime } from "../../tooling/runtime/types.ts";
import { loadTemplate } from "./load-template.ts";

export interface MaterializedTemplateFile {
    path: string;
    content: string;
}

export interface MaterializedTemplatePlan {
    manifest: Record<string, unknown>;
    files: MaterializedTemplateFile[];
}

export async function instantiateTemplate(
    options: {
        runtime?: MainzToolingRuntime;
        templateRoot: string;
        params?: Record<string, string>;
    },
): Promise<MaterializedTemplatePlan> {
    const runtime = options.runtime ?? denoToolingRuntime;
    const template = await loadTemplate(options.templateRoot, runtime);
    const relativePaths = await collectTemplateFiles(runtime, template.filesRoot);
    const params = options.params ?? {};

    return {
        manifest: JSON.parse(replaceTemplateTokens(template.manifestSource, params)),
        files: await Promise.all(
            relativePaths.map(async (relativePath) => {
                const sourcePath = resolve(template.filesRoot, relativePath);
                const renderedPath = stripTemplateSuffix(
                    replaceTemplateTokens(relativePath, params),
                );
                const renderedContent = replaceTemplateTokens(
                    await runtime.readTextFile(sourcePath),
                    params,
                );

                return {
                    path: renderedPath,
                    content: renderedContent,
                };
            }),
        ),
    };
}

export async function materializeTemplate(
    options: {
        runtime?: MainzToolingRuntime;
        templateRoot: string;
        outputDir: string;
        params?: Record<string, string>;
        beforeWrite?: (path: string, file: MaterializedTemplateFile) => Promise<void>;
    },
): Promise<MaterializedTemplatePlan> {
    const runtime = options.runtime ?? denoToolingRuntime;
    const plan = await instantiateTemplate({
        runtime,
        templateRoot: options.templateRoot,
        params: options.params,
    });
    const filesWithAbsolutePaths = plan.files.map((file) => ({
        file,
        absolutePath: resolve(options.outputDir, file.path),
    }));

    for (const { file, absolutePath } of filesWithAbsolutePaths) {
        if (typeof options.beforeWrite === "function") {
            await options.beforeWrite(absolutePath, file);
        }
    }

    for (const { file, absolutePath } of filesWithAbsolutePaths) {
        await runtime.mkdir(dirname(absolutePath), { recursive: true });
        await runtime.writeTextFile(absolutePath, file.content);
    }

    return plan;
}

async function collectTemplateFiles(
    runtime: MainzToolingRuntime,
    root: string,
    current: string = root,
): Promise<string[]> {
    const files: string[] = [];

    for await (const entry of runtime.readDir(current)) {
        const absolutePath = resolve(current, entry.name);
        if (entry.isDirectory) {
            files.push(...await collectTemplateFiles(runtime, root, absolutePath));
            continue;
        }

        files.push(relative(root, absolutePath));
    }

    return files;
}

function replaceTemplateTokens(value: string, params: Record<string, string>): string {
    return value.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_match, key) => {
        if (!(key in params)) {
            throw new Error(`Missing template parameter "${key}".`);
        }

        const replacement = params[key];
        if (replacement === undefined || replacement === null) {
            throw new Error(`Missing template parameter "${key}".`);
        }

        return String(replacement);
    });
}

function stripTemplateSuffix(path: string): string {
    return path.endsWith(".tpl") ? path.slice(0, -".tpl".length) : path;
}
