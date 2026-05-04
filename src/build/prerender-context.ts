import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { type PageConstructor } from "../components/page.ts";
import { type NormalizedMainzConfig, type NormalizedMainzTarget } from "../config/index.ts";
import { withServiceContainer } from "../di/context.ts";
import { createServiceContainer, type ServiceContainer } from "../di/container.ts";
import { type RoutedAppDefinition } from "../navigation/index.ts";
import {
    buildTargetRouteManifest,
    isDynamicRoutePath,
    type RenderMode,
    type ResolvedSsgRouteEntry,
    validateRouteEntryParams,
} from "../routing/index.ts";
import { resolveTargetDiscoveredPagesForTarget } from "../routing/target-page-discovery.ts";
import { denoToolingRuntime } from "../tooling/runtime/index.ts";
import type { MainzToolingRuntime } from "../tooling/runtime/index.ts";
import { loadTargetBuildRoutedAppDefinition } from "./app-definition.ts";
import { type ResolvedBuildProfile } from "./profiles.ts";
import { resolveRouteManifestBuildInput } from "./route-manifest-input.ts";

export interface RoutePrerenderBuildJob {
    target: NormalizedMainzTarget;
    mode: RenderMode;
    profile: ResolvedBuildProfile;
}

export interface ResolvedRoutePrerenderContext {
    appDefinition?: RoutedAppDefinition;
    manifest: ReturnType<typeof buildTargetRouteManifest>;
    targetI18n: ReturnType<typeof resolveTargetI18nConfig>;
    buildServiceContainer?: ServiceContainer;
    routeEntriesByRouteId: ReadonlyMap<string, readonly ResolvedSsgRouteEntry[]>;
    routeById: ReadonlyMap<string, ReturnType<typeof buildTargetRouteManifest>["routes"][number]>;
}

export async function resolveRoutePrerenderContext(
    _config: NormalizedMainzConfig,
    job: RoutePrerenderBuildJob,
    cwd: string,
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<ResolvedRoutePrerenderContext> {
    const appDefinition = await loadTargetBuildRoutedAppDefinition(job.target, cwd, runtime);
    const manifest = await resolveTargetRouteBuildContext(
        _config,
        job,
        cwd,
        appDefinition,
        runtime,
    );
    const targetI18n = resolveTargetI18nConfig(appDefinition);
    const buildServiceContainer = await resolveTargetBuildServiceContainer(job.target, cwd, runtime);
    const routeEntriesByRouteId = await resolveSsgRouteEntriesByRouteId(
        manifest,
        cwd,
        buildServiceContainer,
        job.profile,
        runtime,
    );
    const routeById = new Map(manifest.routes.map((route) => [route.id, route]));

    return {
        appDefinition,
        manifest,
        targetI18n,
        buildServiceContainer,
        routeEntriesByRouteId,
        routeById,
    };
}

export function resolveTargetI18nConfig(
    appDefinition?: Pick<RoutedAppDefinition, "documentLanguage" | "i18n">,
): {
    defaultLocale?: string;
    localePrefix?: "except-default" | "always";
    fallbackLocale?: string;
} | undefined {
    const appI18n = appDefinition?.i18n;
    if (appI18n) {
        return {
            defaultLocale: appI18n.defaultLocale,
            localePrefix: appI18n.localePrefix,
            fallbackLocale: appI18n.defaultLocale,
        };
    }

    const documentLanguage = appDefinition?.documentLanguage?.trim();
    if (documentLanguage) {
        return {
            defaultLocale: documentLanguage,
            localePrefix: "except-default",
            fallbackLocale: documentLanguage,
        };
    }

    return undefined;
}

async function resolveTargetRouteBuildContext(
    _config: NormalizedMainzConfig,
    job: RoutePrerenderBuildJob,
    cwd: string,
    appDefinition?: RoutedAppDefinition,
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<ReturnType<typeof buildTargetRouteManifest>> {
    const { discoveredPages, discoveryErrors } = await resolveTargetDiscoveredPagesForTarget(
        job.target,
        cwd,
        runtime,
    );
    if (discoveryErrors?.length) {
        throw new Error(
            discoveryErrors.map((entry) => `${entry.file}: ${entry.message}`).join("\n"),
        );
    }

    return buildTargetRouteManifest({
        ...resolveRouteManifestBuildInput({
            target: job.target,
            appDefinition,
            discoveredPages,
        }),
    });
}

async function resolveTargetBuildServiceContainer(
    target: NormalizedMainzTarget,
    cwd: string,
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<ServiceContainer | undefined> {
    const appDefinition = await loadTargetBuildRoutedAppDefinition(target, cwd, runtime);
    return appDefinition?.services?.length
        ? createServiceContainer(appDefinition.services)
        : undefined;
}

async function resolveSsgRouteEntriesByRouteId(
    manifest: ReturnType<typeof buildTargetRouteManifest>,
    cwd: string,
    buildServiceContainer?: ServiceContainer,
    profile?: ResolvedBuildProfile,
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<ReadonlyMap<string, readonly ResolvedSsgRouteEntry[]>> {
    const routeEntriesByRouteId = new Map<string, readonly ResolvedSsgRouteEntry[]>();

    for (const route of manifest.routes) {
        if (route.mode !== "ssg" || !isDynamicRoutePath(route.path)) {
            continue;
        }

        const pageCtor = await loadRoutePageConstructor(route, cwd, runtime);
        if (typeof pageCtor.entries !== "function") {
            throw new Error(
                `SSG route "${route.path}" must define static entries() to expand dynamic params.`,
            );
        }

        const resolvedEntries: ResolvedSsgRouteEntry[] = [];
        for (const locale of route.locales) {
            const localizedEntries = await withServiceContainer(
                buildServiceContainer,
                () =>
                    pageCtor.entries!({
                        locale,
                        profile: profile
                            ? {
                                name: profile.name,
                                basePath: profile.basePath,
                                siteUrl: profile.siteUrl,
                            }
                            : undefined,
                    }),
            );
            for (const [entryIndex, entry] of localizedEntries.entries()) {
                const normalizedParams = normalizeStaticEntryParams(entry.params, route.path);
                try {
                    validateRouteEntryParams(route.path, normalizedParams);
                } catch (error) {
                    throw new Error(
                        `entries() for route "${route.path}" returned an invalid entry at index ${entryIndex} for locale "${locale}": ${
                            toErrorMessage(error)
                        }`,
                    );
                }

                resolvedEntries.push({
                    locale,
                    params: normalizedParams,
                });
            }
        }

        routeEntriesByRouteId.set(route.id, resolvedEntries);
    }

    return routeEntriesByRouteId;
}

async function loadRoutePageConstructor(
    route: ReturnType<typeof buildTargetRouteManifest>["routes"][number],
    cwd: string,
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<PageConstructor> {
    if (!route.file || !route.exportName) {
        throw new Error(
            `Route "${route.path}" must include file and export metadata to resolve dynamic entries().`,
        );
    }

    const moduleUrl = `${pathToFileURL(resolve(cwd, route.file)).href}?route-page=${Date.now()}-${
        Math.random().toString(36).slice(2)
    }`;
    const moduleExports = await runtime.importModule<Record<string, unknown>>(moduleUrl);
    const exportedValue = moduleExports[route.exportName];

    if (typeof exportedValue !== "function") {
        throw new Error(
            `Route "${route.path}" export "${route.exportName}" could not be resolved as a Page constructor.`,
        );
    }

    return exportedValue as PageConstructor;
}

function normalizeStaticEntryParams(
    params: Record<string, string>,
    routePath: string,
): Record<string, string> {
    if (typeof params !== "object" || params === null || Array.isArray(params)) {
        throw new Error(
            `entries() for route "${routePath}" must return objects with a params record.`,
        );
    }

    const normalizedParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
        if (typeof value !== "string") {
            throw new Error(
                `entries() for route "${routePath}" must return string params only. Received "${key}".`,
            );
        }

        normalizedParams[key] = value;
    }

    return normalizedParams;
}

function toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
