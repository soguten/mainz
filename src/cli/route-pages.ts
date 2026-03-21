/// <reference lib="deno.ns" />

import { resolve } from "node:path";
import { discoverPagesFromFiles } from "../routing/server.ts";
import type { RenderMode } from "../routing/index.ts";
import type { PageHeadDefinition } from "../components/page.ts";

export interface CliDiscoveredPage {
    file: string;
    exportName: string;
    path: string;
    mode: RenderMode;
    hasExplicitRenderMode?: boolean;
    notFound?: boolean;
    locales?: readonly string[];
    head?: PageHeadDefinition;
}

export async function resolveTargetDiscoveredPages(
    pagesDir: string | undefined,
    cwd = Deno.cwd(),
): Promise<{
    filesystemPageFiles: string[] | undefined;
    discoveredPages: CliDiscoveredPage[] | undefined;
}> {
    const filesystemPageFiles = pagesDir
        ? await collectFilesystemPageFiles(resolve(cwd, pagesDir))
        : undefined;
    const discoveredPages = filesystemPageFiles?.length
        ? (await discoverPagesFromFiles(filesystemPageFiles)).map((entry) => ({
            file: entry.file,
            exportName: entry.exportName,
            ...entry.page,
        }))
        : undefined;

    return {
        filesystemPageFiles,
        discoveredPages,
    };
}

export async function collectFilesystemFiles(directory: string): Promise<string[]> {
    const filePaths: string[] = [];

    for await (const entry of Deno.readDir(directory)) {
        const absolutePath = resolve(directory, entry.name);

        if (entry.isDirectory) {
            const nested = await collectFilesystemFiles(absolutePath);
            filePaths.push(...nested);
            continue;
        }

        if (!entry.isFile) continue;
        filePaths.push(normalizePathSlashes(absolutePath));
    }

    return filePaths;
}

async function collectFilesystemPageFiles(pagesDir: string): Promise<string[]> {
    return await collectFilesystemFiles(pagesDir);
}

function normalizePathSlashes(path: string): string {
    return path.replaceAll("\\", "/");
}
