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
    resolvePageRenderConfig,
    resolvePageRenderMode,
    resolvePageRoutePath,
} from "../components/page.ts";
import type { RenderMode, RenderModeFallback } from "./types.ts";
import { isFilesystemPageFile } from "./filesystem.ts";

export interface DiscoveredPage {
    exportName: string;
    file: string;
    page: {
        path: string;
        mode: RenderMode;
        fallback?: RenderModeFallback;
        locales?: readonly string[];
        head?: PageHeadDefinition;
        authorization?: PageAuthorizationMetadata;
    };
}

interface DiscoverPageOptions {
    allowMissingRoute?: boolean;
    fallbackPath?: string;
    fallbackMode?: RenderMode;
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
    return await discoverPagesFromFileWithOptions(filePath);
}

export async function discoverPageExportFromFile(
    filePath: string,
    exportName: string,
    options: DiscoverPageOptions = {},
): Promise<DiscoveredPage | undefined> {
    const pages = await discoverPagesFromFileWithOptions(filePath, {
        ...options,
        exportNames: [exportName],
    });
    return pages.find((page) => page.exportName === exportName);
}

async function discoverPagesFromFileWithOptions(
    filePath: string,
    options: DiscoverPageOptions & { exportNames?: readonly string[] } = {},
): Promise<DiscoveredPage[]> {
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
        .filter(([exportName]) => !options.exportNames || options.exportNames.includes(exportName))
        .filter(([, exportedValue]) => isPageConstructor(exportedValue))
        .map(([exportName, exportedValue]) => {
            const ctor = exportedValue as PageConstructor;
            return {
                exportName,
                file: normalizedFilePath,
                page: normalizePageDefinition(ctor, normalizedFilePath, exportName, options),
            };
        });

    return pages;
}

function normalizePageDefinition(
    ctor: PageConstructor,
    filePath: string,
    exportName: string,
    options: DiscoverPageOptions = {},
): DiscoveredPage["page"] {
    const locales = resolvePageLocales(ctor);
    const authorization = resolvePageAuthorization(ctor);
    const routePath = resolvePageRoutePath(ctor);
    const path = routePath ?? options.fallbackPath ?? requirePageRoutePath(
        ctor,
        `Page export "${exportName}" in "${filePath}" must define a route with @Route(...).`,
    );

    if (!routePath && !options.allowMissingRoute) {
        requirePageRoutePath(
            ctor,
            `Page export "${exportName}" in "${filePath}" must define a route with @Route(...).`,
        );
    }

    return {
        path,
        ...resolveDiscoveryMode(ctor, options),
        locales: locales ? [...locales] : undefined,
        head: undefined,
        authorization: authorization ? cloneAuthorization(authorization) : undefined,
    };
}

function resolveDiscoveryMode(
    ctor: PageConstructor,
    options: DiscoverPageOptions = {},
): { mode: RenderMode; fallback?: RenderModeFallback } {
    const decoratorConfig = resolvePageRenderConfig(ctor);
    const decoratorMode = decoratorConfig?.mode ?? resolvePageRenderMode(ctor);

    return {
        mode: normalizeMode(decoratorMode ?? options.fallbackMode),
        fallback: decoratorConfig?.mode === "ssg" ? decoratorConfig.fallback : undefined,
    };
}

function normalizeMode(mode: RenderMode | undefined): RenderMode {
    return mode ?? "csr";
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
