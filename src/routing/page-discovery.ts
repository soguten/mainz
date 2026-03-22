/// <reference lib="deno.ns" />

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { PageAuthorizationMetadata } from "../authorization/index.ts";
import { resolvePageAuthorization } from "../authorization/index.ts";
import {
    isPageConstructor,
    type PageConstructor,
    type PageHeadDefinition,
    requirePageRoutePath,
    resolvePageLocales,
    resolvePageRenderMode,
} from "../components/page.ts";
import type { RenderMode } from "./types.ts";
import { isFilesystemPageFile } from "./filesystem.ts";

export interface DiscoveredPage {
    exportName: string;
    file: string;
    page: {
        path: string;
        mode: RenderMode;
        hasExplicitRenderMode?: boolean;
        notFound?: boolean;
        locales?: readonly string[];
        head?: PageHeadDefinition;
        authorization?: PageAuthorizationMetadata;
    };
}

export async function discoverPagesFromFiles(
    filePaths: readonly string[],
): Promise<DiscoveredPage[]> {
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
    const moduleUrl = `${pathToFileURL(normalizedFilePath).href}?page-discovery=${Date.now()}-${
        Math.random().toString(36).slice(2)
    }`;

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
    const locales = resolvePageLocales(ctor);
    const authorization = resolvePageAuthorization(ctor);
    const path = requirePageRoutePath(
        ctor,
        `Page export "${exportName}" in "${filePath}" must define a route with @Route(...).`,
    );

    return {
        path,
        ...resolveDiscoveryMode(ctor, page as Record<string, unknown>, filePath, exportName),
        notFound: page.notFound === true ? true : undefined,
        locales: locales ? [...locales] : undefined,
        head: page.head ? cloneHead(page.head) : undefined,
        authorization: authorization ? cloneAuthorization(authorization) : undefined,
    };
}

function resolveDiscoveryMode(
    ctor: PageConstructor,
    _page: Record<string, unknown>,
    filePath: string,
    exportName: string,
): { mode: RenderMode; hasExplicitRenderMode?: boolean } {
    const decoratorMode = resolvePageRenderMode(ctor);

    return {
        mode: normalizeMode(decoratorMode),
        hasExplicitRenderMode: decoratorMode !== undefined ? true : undefined,
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

function cloneAuthorization(
    authorization: NonNullable<DiscoveredPage["page"]["authorization"]>,
): NonNullable<DiscoveredPage["page"]["authorization"]> {
    return {
        allowAnonymous: authorization.allowAnonymous,
        requirement: authorization.requirement
            ? {
                authenticated: true,
                roles: authorization.requirement.roles
                    ? [...authorization.requirement.roles]
                    : undefined,
                policy: authorization.requirement.policy,
            }
            : undefined,
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
