/// <reference lib="deno.ns" />

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
    isPageConstructor,
    type PageConstructor,
    type PageHeadDefinition,
    requirePageRoutePath,
} from "../components/page.ts";
import type { RenderMode } from "./types.ts";
import { isFilesystemPageFile } from "./filesystem.ts";

export interface DiscoveredPage {
    exportName: string;
    file: string;
    page: {
        path: string;
        mode: RenderMode;
        notFound?: boolean;
        locales?: readonly string[];
        head?: PageHeadDefinition;
    };
}

export async function discoverPagesFromFiles(filePaths: readonly string[]): Promise<DiscoveredPage[]> {
    const pages: DiscoveredPage[] = [];

    for (const filePath of filePaths) {
        if (!isFilesystemPageFile(filePath)) {
            continue;
        }

        const discovered = await discoverPagesFromFile(filePath);
        pages.push(...discovered);
    }

    return pages.sort((a, b) => {
        if (a.page.path !== b.page.path) {
            return a.page.path.localeCompare(b.page.path);
        }

        if (a.file !== b.file) {
            return a.file.localeCompare(b.file);
        }

        return a.exportName.localeCompare(b.exportName);
    });
}

export async function discoverPagesFromFile(filePath: string): Promise<DiscoveredPage[]> {
    const normalizedFilePath = normalizePath(resolve(filePath));
    const moduleUrl = `${pathToFileURL(normalizedFilePath).href}?page-discovery=${Date.now()}-${Math.random().toString(36).slice(2)}`;

    let moduleExports: Record<string, unknown>;
    try {
        moduleExports = await import(moduleUrl);
    } catch (error) {
        throw new Error(
            `Could not load page module "${normalizedFilePath}": ${toErrorMessage(error)}`,
        );
    }

    const pages = Object.entries(moduleExports)
        .filter(([, exportedValue]) => isPageConstructor(exportedValue))
        .map(([exportName, exportedValue]) => {
            const ctor = exportedValue as PageConstructor;
            return {
                exportName,
                file: normalizedFilePath,
                page: normalizePageDefinition(ctor, normalizedFilePath, exportName),
            };
        });

    return pages;
}

function normalizePageDefinition(
    ctor: PageConstructor,
    filePath: string,
    exportName: string,
): DiscoveredPage["page"] {
    const page = ctor.page ?? {};
    const path = requirePageRoutePath(
        ctor,
        `Page export "${exportName}" in "${filePath}" must define a route with @route(...).`,
    );

    return {
        path,
        mode: normalizeMode(page.mode),
        notFound: page.notFound === true ? true : undefined,
        locales: page.locales ? [...page.locales] : undefined,
        head: page.head ? cloneHead(page.head) : undefined,
    };
}

function normalizeMode(mode: RenderMode | undefined): RenderMode {
    return mode ?? "csr";
}

function cloneHead(head: PageHeadDefinition): PageHeadDefinition {
    return {
        title: head.title,
        meta: head.meta ? [...head.meta] : undefined,
        links: head.links ? [...head.links] : undefined,
    };
}

function normalizePath(value: string): string {
    return value.replaceAll("\\", "/");
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}
