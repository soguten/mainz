import { renderEmptyProjectConfig } from "./base.ts";
import { renderEmptyDenoProjectConfig } from "./deno.ts";

/**
 * Files generated for an empty Mainz project scaffold.
 */
export interface ProjectEmptyScaffold {
    /** Files that should be written for the scaffolded project. */
    files: Map<string, string>;
}

/**
 * Input required to scaffold an empty Mainz project.
 */
export interface CreateProjectEmptyScaffoldOptions {
    /** Mainz package specifier used in generated imports or dependencies. */
    mainzSpecifier: string;
    /** Output path for the generated Mainz config file. */
    configPath?: string;
    /** Output path for the generated Deno config file. */
    denoConfigPath?: string;
}

/**
 * Creates an empty Mainz project scaffold for the selected runtime.
 */
export function createProjectEmptyScaffold(
    options: CreateProjectEmptyScaffoldOptions,
): ProjectEmptyScaffold {
    const configPath = options.configPath ?? "mainz.config.ts";
    const files = new Map<string, string>([
        [configPath, renderEmptyProjectConfig()],
    ]);
    const denoConfigPath = options.denoConfigPath ?? "deno.json";
    files.set(
        denoConfigPath,
        renderEmptyDenoProjectConfig(options.mainzSpecifier, denoConfigPath),
    );
    return { files };
}

export type { EmptyProjectRuntime } from "./base.ts";
