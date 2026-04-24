import { type EmptyProjectPlatform, renderEmptyProjectConfig } from "./base.ts";
import { renderEmptyDenoProjectConfig } from "./deno.ts";
import {
    renderEmptyNodeNpmrc,
    renderEmptyNodePackageJson,
    renderEmptyNodeTsconfig,
} from "./node.ts";

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
    /** Target tooling platform for the generated project. */
    platform: EmptyProjectPlatform;
    /** Mainz package specifier used in generated imports or dependencies. */
    mainzSpecifier: string;
    /** Output path for the generated Mainz config file. */
    configPath?: string;
    /** Output path for the generated Deno config file. */
    denoConfigPath?: string;
}

/**
 * Creates an empty Mainz project scaffold for the selected platform.
 */
export function createProjectEmptyScaffold(
    options: CreateProjectEmptyScaffoldOptions,
): ProjectEmptyScaffold {
    const configPath = options.configPath ?? "mainz.config.ts";
    const files = new Map<string, string>([
        [configPath, renderEmptyProjectConfig(options.platform)],
    ]);

    if (options.platform === "deno") {
        const denoConfigPath = options.denoConfigPath ?? "deno.json";
        files.set(
            denoConfigPath,
            renderEmptyDenoProjectConfig(options.mainzSpecifier, denoConfigPath),
        );
        return { files };
    }

    files.set("package.json", renderEmptyNodePackageJson(options.mainzSpecifier));
    files.set(".npmrc", renderEmptyNodeNpmrc());
    files.set("tsconfig.json", renderEmptyNodeTsconfig());
    return { files };
}

export type { EmptyProjectPlatform } from "./base.ts";
