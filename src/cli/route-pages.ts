/// <reference lib="deno.ns" />

import { resolve } from "node:path";
import { discoverPagesFromFile } from "../routing/server.ts";
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

export interface CliPageDiscoveryError {
    file: string;
    message: string;
}

export async function resolveTargetDiscoveredPages(
    pagesDir: string | undefined,
    cwd = Deno.cwd(),
): Promise<{
    filesystemPageFiles: string[] | undefined;
    discoveredPages: CliDiscoveredPage[] | undefined;
    discoveryErrors: CliPageDiscoveryError[] | undefined;
}> {
    const filesystemPageFiles = pagesDir
        ? await collectFilesystemPageFiles(resolve(cwd, pagesDir))
        : undefined;
    const discoveredPages: CliDiscoveredPage[] = [];
    const discoveryErrors: CliPageDiscoveryError[] = [];

    for (const filePath of filesystemPageFiles ?? []) {
        try {
            const entries = await discoverPagesFromFile(filePath);
            discoveredPages.push(...entries.map((entry) => ({
                file: entry.file,
                exportName: entry.exportName,
                ...entry.page,
            })));
        } catch (error) {
            discoveryErrors.push({
                file: normalizePathSlashes(filePath),
                message: toErrorMessage(error),
            });
        }
    }

    discoveredPages.sort((a, b) => {
        if (a.path !== b.path) {
            return a.path.localeCompare(b.path);
        }

        if (a.file !== b.file) {
            return a.file.localeCompare(b.file);
        }

        return a.exportName.localeCompare(b.exportName);
    });

    return {
        filesystemPageFiles,
        discoveredPages: discoveredPages.length > 0 ? discoveredPages : undefined,
        discoveryErrors: discoveryErrors.length > 0 ? discoveryErrors : undefined,
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

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}
