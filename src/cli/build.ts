/// <reference lib="deno.ns" />

import { dirname, join, relative, resolve } from "node:path";
import {
    buildRouteHead,
    buildSsgOutputEntries,
    buildTargetRouteManifest,
    isDynamicRoutePath,
    materializeRoutePath,
    NavigationMode,
    RenderMode,
    ResolvedSsgRouteEntry,
    resolveLocaleRedirectPath,
    shouldPrefixLocaleForRoute,
    toLocalePathSegment,
    validateRouteEntryParams,
} from "../routing/index.ts";
import {
    MAINZ_HEAD_MANAGED_ATTR,
    type PageConstructor,
    type PageHeadDefinition,
} from "../components/page.ts";
import { pathToFileURL } from "node:url";
import {
    NormalizedMainzConfig,
    NormalizedMainzTarget,
    normalizeTargetBuildConfig,
    type TargetBuildDefinition,
} from "../config/index.ts";
import { ResourceAccessError } from "../resources/index.ts";
import { withHappyDom } from "../ssg/happy-dom.ts";
import { resolveTargetDiscoveredPages } from "./route-pages.ts";

export interface BuildCliOptions {
    target?: string;
    mode?: string;
    navigation?: string;
    profile?: string;
    configPath?: string;
}

export interface BuildJob {
    target: NormalizedMainzTarget;
    mode: RenderMode;
    profile: ResolvedTargetBuildProfile;
}

interface InitialRouteSnapshot {
    pageTagName: string;
    path: string;
    matchedPath: string;
    params: Record<string, string>;
    locale?: string;
    data?: unknown;
    head?: PageHeadDefinition;
}

export interface ResolvedTargetBuildProfile {
    name: string;
    basePath: string;
    overridePageMode?: RenderMode;
    overrideNavigation?: NavigationMode;
    siteUrl?: string;
}

export interface PublicationMetadata {
    target: string;
    profile: string;
    artifactDir: string;
    basePath: string;
    renderMode: RenderMode;
    navigationMode: NavigationMode;
    siteUrl?: string;
}

const DEFAULT_BUILD_PROFILE_NAME = "production";

export function resolveBuildJobs(
    config: NormalizedMainzConfig,
    options: BuildCliOptions,
): BuildJob[] {
    const targetSelection = options.target?.trim();
    const modeSelection = options.mode?.trim();

    const targets = targetSelection && targetSelection !== "all"
        ? config.targets.filter((target) => target.name === targetSelection)
        : config.targets;

    if (targets.length === 0) {
        throw new Error(
            `No targets matched "${targetSelection}". Available targets: ${
                config.targets.map((target) => target.name).join(", ")
            }`,
        );
    }

    const modes = modeSelection && modeSelection !== "all"
        ? config.renderModes.filter((mode) => mode === modeSelection)
        : config.renderModes;

    if (modes.length === 0) {
        throw new Error(
            `No render modes matched "${modeSelection}". Available modes: ${
                config.renderModes.join(", ")
            }`,
        );
    }

    const jobs: BuildJob[] = [];
    const profile: ResolvedTargetBuildProfile = {
        name: options.profile?.trim() || DEFAULT_BUILD_PROFILE_NAME,
        basePath: "/",
    };

    for (const target of targets) {
        for (const mode of modes) {
            if (!targetSupportsRenderMode(target, mode)) {
                continue;
            }

            jobs.push({ target, mode, profile });
        }
    }

    if (jobs.length === 0 && targetSelection && modeSelection) {
        const selectedTarget = config.targets.find((target) => target.name === targetSelection);
        if (
            selectedTarget && !targetSupportsRenderMode(selectedTarget, modeSelection as RenderMode)
        ) {
            throw new Error(
                `Target "${selectedTarget.name}" has no pages/routes and only supports csr app builds.`,
            );
        }
    }

    return jobs;
}

export async function resolveTargetBuildProfile(
    target: NormalizedMainzTarget,
    requestedProfile: string | undefined,
    cwd = Deno.cwd(),
): Promise<ResolvedTargetBuildProfile> {
    const profileName = requestedProfile?.trim() || DEFAULT_BUILD_PROFILE_NAME;
    const buildConfig = await loadTargetBuildConfig(target, cwd);
    const profile = buildConfig.profiles[profileName];

    if (!profile) {
        if (profileName === DEFAULT_BUILD_PROFILE_NAME) {
            return {
                name: profileName,
                basePath: "/",
                siteUrl: undefined,
            };
        }

        const availableProfiles = Object.keys(buildConfig.profiles);
        throw new Error(
            availableProfiles.length > 0
                ? `Target "${target.name}" does not define profile "${profileName}". Available profiles: ${
                    availableProfiles.join(", ")
                }`
                : `Target "${target.name}" does not define profile "${profileName}" and has no target build profiles.`,
        );
    }

    return {
        name: profileName,
        basePath: profile.basePath ?? "/",
        overridePageMode: profile.overridePageMode,
        overrideNavigation: profile.overrideNavigation,
        siteUrl: profile.siteUrl,
    };
}

export async function resolvePublicationMetadata(
    target: NormalizedMainzTarget,
    requestedProfile: string | undefined,
    cwd = Deno.cwd(),
    overrides?: Pick<BuildCliOptions, "mode" | "navigation">,
): Promise<PublicationMetadata> {
    const profile = applyBuildCliOverrides(
        await resolveTargetBuildProfile(target, requestedProfile, cwd),
        overrides,
    );
    const renderMode = overrides?.mode
        ? resolveExplicitRenderMode(overrides.mode)
        : resolvePublicationRenderMode(target, profile);
    const navigationMode = resolveEffectiveNavigationMode(target, profile);

    return {
        target: target.name,
        profile: profile.name,
        artifactDir: normalizePathSlashes(join(target.outDir, renderMode)),
        basePath: profile.basePath,
        renderMode,
        navigationMode,
        siteUrl: profile.siteUrl,
    };
}

export function applyBuildCliOverrides(
    profile: ResolvedTargetBuildProfile,
    options: Pick<BuildCliOptions, "navigation"> | undefined,
): ResolvedTargetBuildProfile {
    const explicitNavigation = resolveExplicitNavigationMode(options?.navigation);
    if (!explicitNavigation) {
        return profile;
    }

    return {
        ...profile,
        overrideNavigation: explicitNavigation,
    };
}

function targetSupportsRenderMode(target: NormalizedMainzTarget, mode: RenderMode): boolean {
    if (mode === "csr") {
        return true;
    }

    return hasRoutingInput(target);
}

function hasRoutingInput(target: NormalizedMainzTarget): boolean {
    return Boolean(target.pagesDir);
}

export async function runBuildJobs(
    config: NormalizedMainzConfig,
    jobs: BuildJob[],
    cwd = Deno.cwd(),
): Promise<void> {
    for (const job of jobs) {
        await runSingleBuild(config, job, cwd);
    }
}

export async function runSingleBuild(
    config: NormalizedMainzConfig,
    job: BuildJob,
    cwd = Deno.cwd(),
): Promise<void> {
    const modeOutDir = normalizePathSlashes(join(job.target.outDir, job.mode));
    const viteConfigPath = normalizePathSlashes(resolve(cwd, job.target.viteConfig));
    const navigationMode = resolveEffectiveNavigationMode(job.target, job.profile);
    const targetI18n = resolveTargetI18nConfig(job.target);

    await runViteBuild({
        cwd,
        viteConfigPath,
        modeOutDir,
        renderMode: job.mode,
        navigationMode,
        targetName: job.target.name,
        basePath: resolveViteBasePath(job.profile.basePath, navigationMode),
        targetLocales: job.target.locales ?? [],
        defaultLocale: targetI18n?.defaultLocale,
        localePrefix: targetI18n?.localePrefix ?? "auto",
        siteUrl: job.profile.siteUrl,
    });

    if (job.mode === "ssg") {
        await emitSsgArtifacts(config, job, modeOutDir, cwd);
        return;
    }

    if (job.mode === "csr" && navigationMode !== "spa") {
        await emitCsrRouteArtifacts(config, job, modeOutDir, cwd);
    }
}

async function runViteBuild(args: {
    cwd: string;
    viteConfigPath: string;
    modeOutDir: string;
    renderMode: RenderMode;
    navigationMode: NavigationMode;
    targetName: string;
    basePath: string;
    targetLocales: readonly string[];
    defaultLocale?: string;
    localePrefix: "auto" | "always";
    siteUrl?: string;
}): Promise<void> {
    const command = new Deno.Command("deno", {
        cwd: args.cwd,
        args: [
            "run",
            "-A",
            "npm:vite",
            "build",
            "--config",
            args.viteConfigPath,
        ],
        env: {
            MAINZ_OUT_DIR: args.modeOutDir,
            MAINZ_RENDER_MODE: args.renderMode,
            MAINZ_NAVIGATION_MODE: args.navigationMode,
            MAINZ_TARGET_NAME: args.targetName,
            MAINZ_BASE_PATH: args.basePath,
            MAINZ_TARGET_LOCALES: JSON.stringify(args.targetLocales),
            MAINZ_DEFAULT_LOCALE: args.defaultLocale ?? "",
            MAINZ_LOCALE_PREFIX: args.localePrefix,
            MAINZ_SITE_URL: args.siteUrl ?? "",
        },
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
    });

    const child = command.spawn();
    const status = await child.status;
    if (!status.success) {
        throw new Error(
            `Vite build failed for target "${args.targetName}" in "${args.renderMode}" mode.`,
        );
    }
}

async function emitSsgArtifacts(
    config: NormalizedMainzConfig,
    job: BuildJob,
    modeOutDir: string,
    cwd: string,
): Promise<void> {
    const { templateHtml, manifest, outputEntries, routeById, targetI18n } =
        await resolveStaticRouteBuildContext(
            config,
            job,
            modeOutDir,
            cwd,
            "SSG",
        );

    for (const entry of outputEntries) {
        const absoluteOutputPath = resolve(cwd, entry.outputHtmlPath);
        const relativeFromOutputDir = relative(
            dirname(absoluteOutputPath),
            resolve(cwd, modeOutDir),
        );
        const normalizedRelative = normalizePathSlashes(relativeFromOutputDir || ".");
        let html = rewriteAssetPaths(templateHtml, normalizedRelative);
        if (isRootFallbackOutput(entry.outputHtmlPath, modeOutDir)) {
            html = rewriteFallbackAssetPaths(html, job.profile.basePath);
        }

        const route = routeById.get(entry.routeId);
        if (!route) {
            throw new Error(
                `Missing route "${entry.routeId}" in manifest for target "${manifest.target}".`,
            );
        }

        let renderedApp: Awaited<ReturnType<typeof renderSsgAppHtml>>;
        try {
            renderedApp = await renderSsgAppHtml({
                html,
                absoluteOutputPath,
                modeOutDir: resolve(cwd, modeOutDir),
                locale: entry.locale,
                basePath: toViteBasePath(job.profile.basePath),
                renderPath: entry.renderPath,
            });
        } catch (error) {
            throw new Error(formatSsgPrerenderError({
                routePath: route.path,
                renderPath: entry.renderPath,
                locale: entry.locale,
                error,
            }));
        }
        for (const warning of renderedApp.warnings) {
            console.warn(formatSsgPrerenderWarning({
                routePath: route.path,
                renderPath: entry.renderPath,
                locale: entry.locale,
                warning,
            }));
        }
        html = injectAppHtml(html, renderedApp.appHtml);
        try {
            html = injectRouteSnapshot(html, renderedApp.routeSnapshot);
        } catch (error) {
            throw new Error(
                `SSG route snapshot for "${entry.renderPath}" (route "${route.path}", locale "${entry.locale}") contains non-public or non-serializable data: ${
                    toErrorMessage(error)
                }`,
            );
        }
        html = setHtmlLang(html, entry.locale);
        const routeHead = buildRouteHead({
            path: entry.params ? materializeRoutePath(route.path, entry.params) : route.path,
            locale: entry.locale,
            locales: route.locales,
            head: renderedApp.routeSnapshot?.head ?? route.head,
            localePrefix: targetI18n?.localePrefix,
            defaultLocale: targetI18n?.defaultLocale,
            basePath: job.profile.basePath,
            siteUrl: job.profile.siteUrl,
        });
        html = applyRouteHead(html, { head: routeHead });

        await Deno.mkdir(dirname(absoluteOutputPath), { recursive: true });
        await Deno.writeTextFile(absoluteOutputPath, html);
    }

    const routesManifestPath = resolve(cwd, modeOutDir, "routes.json");
    await Deno.writeTextFile(routesManifestPath, JSON.stringify(manifest, null, 2));

    const hydrationManifestPath = resolve(cwd, modeOutDir, "hydration.json");
    await Deno.writeTextFile(
        hydrationManifestPath,
        JSON.stringify(
            {
                target: job.target.name,
                hydration: "full-page",
                navigation: resolveEffectiveNavigationMode(job.target, job.profile),
            },
            null,
            2,
        ),
    );

    const localeRedirectHtml = buildDefaultLocaleRedirectHtml(
        manifest,
        targetI18n?.defaultLocale,
        targetI18n?.localePrefix,
        job.profile.basePath,
        job.profile.siteUrl,
    );
    if (localeRedirectHtml) {
        await Deno.writeTextFile(resolve(cwd, modeOutDir, "index.html"), localeRedirectHtml);
    }
}

async function emitCsrRouteArtifacts(
    config: NormalizedMainzConfig,
    job: BuildJob,
    modeOutDir: string,
    cwd: string,
): Promise<void> {
    const { templateHtml, manifest, outputEntries, routeById, targetI18n } =
        await resolveStaticRouteBuildContext(
            config,
            job,
            modeOutDir,
            cwd,
            "CSR document",
        );

    for (const entry of outputEntries) {
        const absoluteOutputPath = resolve(cwd, entry.outputHtmlPath);
        const relativeFromOutputDir = relative(
            dirname(absoluteOutputPath),
            resolve(cwd, modeOutDir),
        );
        const normalizedRelative = normalizePathSlashes(relativeFromOutputDir || ".");
        let html = rewriteAssetPaths(templateHtml, normalizedRelative);
        if (isRootFallbackOutput(entry.outputHtmlPath, modeOutDir)) {
            html = rewriteFallbackAssetPaths(html, job.profile.basePath);
        }

        const route = routeById.get(entry.routeId);
        if (!route) {
            throw new Error(
                `Missing route "${entry.routeId}" in manifest for target "${manifest.target}".`,
            );
        }

        const routeHead = buildRouteHead({
            path: entry.params ? materializeRoutePath(route.path, entry.params) : route.path,
            locale: entry.locale,
            locales: route.locales,
            head: route.head,
            localePrefix: targetI18n?.localePrefix,
            defaultLocale: targetI18n?.defaultLocale,
            basePath: job.profile.basePath,
            siteUrl: job.profile.siteUrl,
        });

        html = setHtmlLang(html, entry.locale);
        html = applyRouteHead(html, { head: routeHead });

        await Deno.mkdir(dirname(absoluteOutputPath), { recursive: true });
        await Deno.writeTextFile(absoluteOutputPath, html);
    }

    const routesManifestPath = resolve(cwd, modeOutDir, "routes.json");
    await Deno.writeTextFile(routesManifestPath, JSON.stringify(manifest, null, 2));

    const hydrationManifestPath = resolve(cwd, modeOutDir, "hydration.json");
    await Deno.writeTextFile(
        hydrationManifestPath,
        JSON.stringify(
            {
                target: job.target.name,
                hydration: "full-page",
                navigation: resolveEffectiveNavigationMode(job.target, job.profile),
            },
            null,
            2,
        ),
    );

    const localeRedirectHtml = buildDefaultLocaleRedirectHtml(
        manifest,
        targetI18n?.defaultLocale,
        targetI18n?.localePrefix,
        job.profile.basePath,
        job.profile.siteUrl,
    );
    if (localeRedirectHtml) {
        await Deno.writeTextFile(resolve(cwd, modeOutDir, "index.html"), localeRedirectHtml);
    }
}

async function resolveStaticRouteBuildContext(
    config: NormalizedMainzConfig,
    job: BuildJob,
    modeOutDir: string,
    cwd: string,
    buildLabel: string,
): Promise<{
    templateHtml: string;
    manifest: ReturnType<typeof buildTargetRouteManifest>;
    outputEntries: ReturnType<typeof buildSsgOutputEntries>;
    routeById: Map<string, ReturnType<typeof buildTargetRouteManifest>["routes"][number]>;
    targetI18n: ReturnType<typeof resolveTargetI18nConfig>;
}> {
    const templateHtml = await readBuildTemplateHtml(modeOutDir, cwd, job.target.name, buildLabel);
    const manifest = await resolveTargetRouteBuildContext(config, job, cwd);
    const targetI18n = resolveTargetI18nConfig(job.target);
    const routeEntriesByRouteId = await resolveSsgRouteEntriesByRouteId(manifest, cwd);
    const outputEntries = buildSsgOutputEntries(manifest, modeOutDir, {
        localePrefix: targetI18n?.localePrefix,
        defaultLocale: targetI18n?.defaultLocale,
        routeEntriesByRouteId,
    });
    const routeById = new Map(manifest.routes.map((route) => [route.id, route]));

    return {
        templateHtml,
        manifest,
        outputEntries,
        routeById,
        targetI18n,
    };
}

async function resolveSsgRouteEntriesByRouteId(
    manifest: ReturnType<typeof buildTargetRouteManifest>,
    cwd: string,
): Promise<ReadonlyMap<string, readonly ResolvedSsgRouteEntry[]>> {
    const routeEntriesByRouteId = new Map<string, readonly ResolvedSsgRouteEntry[]>();

    for (const route of manifest.routes) {
        if (route.mode !== "ssg" || !isDynamicRoutePath(route.path)) {
            continue;
        }

        const pageCtor = await loadRoutePageConstructor(route, cwd);
        if (typeof pageCtor.entries !== "function") {
            throw new Error(
                `SSG route "${route.path}" must define static entries() to expand dynamic params.`,
            );
        }

        const resolvedEntries: ResolvedSsgRouteEntry[] = [];
        for (const locale of route.locales) {
            const localizedEntries = await pageCtor.entries({ locale });
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
): Promise<PageConstructor> {
    if (!route.file || !route.exportName) {
        throw new Error(
            `Route "${route.path}" must include file and export metadata to resolve dynamic entries().`,
        );
    }

    const moduleUrl = `${pathToFileURL(resolve(cwd, route.file)).href}?route-page=${Date.now()}-${
        Math.random().toString(36).slice(2)
    }`;
    const moduleExports = await import(moduleUrl) as Record<string, unknown>;
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

async function readBuildTemplateHtml(
    modeOutDir: string,
    cwd: string,
    targetName: string,
    buildLabel: string,
): Promise<string> {
    const indexHtmlPath = resolve(cwd, modeOutDir, "index.html");

    try {
        return await Deno.readTextFile(indexHtmlPath);
    } catch (_error) {
        throw new Error(
            `${buildLabel} build for target "${targetName}" requires "${indexHtmlPath}" to exist.`,
        );
    }
}

async function resolveTargetRouteBuildContext(
    config: NormalizedMainzConfig,
    job: BuildJob,
    cwd: string,
): Promise<ReturnType<typeof buildTargetRouteManifest>> {
    const { filesystemPageFiles, discoveredPages, discoveryErrors } =
        await resolveTargetDiscoveredPages(
            job.target.pagesDir,
            cwd,
        );
    if (discoveryErrors?.length) {
        throw new Error(
            discoveryErrors.map((entry) => `${entry.file}: ${entry.message}`).join("\n"),
        );
    }

    return buildTargetRouteManifest({
        target: {
            ...job.target,
            defaultMode: job.profile.overridePageMode ?? job.target.defaultMode ?? job.mode,
        },
        filesystemPageFiles,
        discoveredPages: applyDiscoveredPageModeOverride(
            discoveredPages,
            job.profile.overridePageMode,
        ),
    });
}

function applyDiscoveredPageModeOverride(
    discoveredPages:
        | Array<{
            file: string;
            exportName: string;
            path: string;
            mode: RenderMode;
            notFound?: boolean;
            locales?: readonly string[];
            head?: PageHeadDefinition;
        }>
        | undefined,
    overridePageMode: RenderMode | undefined,
): typeof discoveredPages {
    if (!discoveredPages || !overridePageMode) {
        return discoveredPages;
    }

    return discoveredPages.map((page) => ({
        ...page,
        mode: overridePageMode,
    }));
}

function resolveTargetI18nConfig(
    target: {
        locales?: readonly string[];
        i18n?: {
            defaultLocale?: string;
            localePrefix?: "auto" | "always";
            fallbackLocale?: string;
        };
    },
): {
    defaultLocale?: string;
    localePrefix?: "auto" | "always";
    fallbackLocale?: string;
} | undefined {
    const defaultLocale = target.i18n?.defaultLocale ??
        target.locales?.[0];
    const localePrefix = target.i18n?.localePrefix;
    const fallbackLocale = target.i18n?.fallbackLocale ?? defaultLocale;

    if (!defaultLocale && !localePrefix && !fallbackLocale) {
        return undefined;
    }

    return {
        defaultLocale,
        localePrefix,
        fallbackLocale,
    };
}

async function loadTargetBuildConfig(
    target: NormalizedMainzTarget,
    cwd: string,
) {
    const buildConfigPath = await resolveTargetBuildConfigPath(target, cwd);
    if (!buildConfigPath) {
        return normalizeTargetBuildConfig(undefined);
    }

    let module: Record<string, unknown>;
    try {
        module = await import(`${pathToFileURL(buildConfigPath).href}?t=${Date.now()}`);
    } catch (error) {
        throw new Error(
            `Could not load target build config at "${buildConfigPath}": ${toErrorMessage(error)}`,
        );
    }

    const exported = module.default;
    if (!exported || typeof exported !== "object") {
        throw new Error(`Target build config "${buildConfigPath}" must export a default object.`);
    }

    return normalizeTargetBuildConfig(exported as TargetBuildDefinition);
}

async function resolveTargetBuildConfigPath(
    target: NormalizedMainzTarget,
    cwd: string,
): Promise<string | undefined> {
    if (target.buildConfig?.trim()) {
        return resolve(cwd, target.buildConfig);
    }

    const defaultPath = resolve(cwd, target.rootDir, "mainz.build.ts");
    try {
        await Deno.stat(defaultPath);
        return defaultPath;
    } catch {
        return undefined;
    }
}

function resolvePublicationRenderMode(
    target: NormalizedMainzTarget,
    profile: ResolvedTargetBuildProfile,
): RenderMode {
    if (profile.overridePageMode) {
        return profile.overridePageMode;
    }

    if (target.defaultMode) {
        return target.defaultMode;
    }

    return hasRoutingInput(target) ? "ssg" : "csr";
}

function resolveExplicitRenderMode(mode: string): RenderMode {
    const normalizedMode = mode.trim();
    if (normalizedMode === "csr" || normalizedMode === "ssg") {
        return normalizedMode;
    }

    throw new Error(`Invalid render mode "${mode}". Expected one of: csr, ssg.`);
}

function resolveEffectiveNavigationMode(
    target: NormalizedMainzTarget,
    profile: ResolvedTargetBuildProfile,
): NavigationMode {
    if (profile.overrideNavigation) {
        return profile.overrideNavigation;
    }

    if (target.defaultNavigation) {
        return target.defaultNavigation;
    }

    return hasRoutingInput(target) ? "enhanced-mpa" : "spa";
}

function resolveExplicitNavigationMode(mode: string | undefined): NavigationMode | undefined {
    const normalizedMode = mode?.trim();
    if (!normalizedMode) {
        return undefined;
    }

    if (normalizedMode === "spa" || normalizedMode === "mpa" || normalizedMode === "enhanced-mpa") {
        return normalizedMode;
    }

    throw new Error(`Invalid navigation mode "${mode}". Expected one of: spa, mpa, enhanced-mpa.`);
}

function toViteBasePath(basePath: string): string {
    return basePath === "/" ? "./" : basePath;
}

function resolveViteBasePath(basePath: string, navigationMode: NavigationMode): string {
    if (navigationMode === "spa") {
        return normalizeAbsoluteBasePath(basePath);
    }

    return toViteBasePath(basePath);
}

function normalizeAbsoluteBasePath(basePath: string): string {
    const trimmed = basePath.trim();
    if (!trimmed || trimmed === "." || trimmed === "./") {
        return "/";
    }

    const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

async function renderSsgAppHtml(args: {
    html: string;
    absoluteOutputPath: string;
    modeOutDir: string;
    locale: string;
    basePath: string;
    renderPath: string;
}): Promise<{ appHtml: string; routeSnapshot?: InitialRouteSnapshot; warnings: string[] }> {
    const moduleScriptSrc = extractModuleScriptSrc(args.html);
    if (!moduleScriptSrc) {
        throw new Error(
            `Could not find module script in prerender template "${args.absoluteOutputPath}".`,
        );
    }

    const moduleScriptPath = resolveModuleScriptPath({
        moduleScriptSrc,
        absoluteOutputPath: args.absoluteOutputPath,
        modeOutDir: args.modeOutDir,
        basePath: args.basePath,
    });
    const moduleScriptUrl = `${toFileUrl(moduleScriptPath)}?ssg=${Date.now()}-${
        Math.random().toString(36).slice(2)
    }`;
    const pageUrl = buildRenderPageUrl(args.renderPath);
    const htmlWithoutScripts = stripScriptTags(args.html);

    return await withHappyDom(async (window) => {
        setNavigatorLocale(window, args.locale);
        const warnings: string[] = [];
        const errors: unknown[] = [];
        const originalWarn = console.warn;
        const originalError = console.error;
        console.warn = (...entries: unknown[]) => {
            warnings.push(entries.map((entry) => String(entry)).join(" "));
        };
        console.error = (...entries: unknown[]) => {
            const mainzNavigationError = resolveCapturedMainzNavigationError(entries);
            errors.push(mainzNavigationError ?? entries.map((entry) => String(entry)).join(" "));
            originalError(...entries);
        };

        try {
            document.write(htmlWithoutScripts);
            document.close();

            const appContainer = document.querySelector("#app");
            if (!appContainer) {
                throw new Error(
                    `Template "${args.absoluteOutputPath}" must include an #app container for SSG.`,
                );
            }

            await import(moduleScriptUrl);
            await Promise.resolve();
            await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));

            if (errors.length > 0) {
                throw errors[0];
            }

            const hydratedContainer = document.querySelector("#app");
            if (!hydratedContainer) {
                throw new Error(
                    `Hydration removed #app while rendering "${args.absoluteOutputPath}".`,
                );
            }

            return {
                appHtml: hydratedContainer.innerHTML,
                routeSnapshot: extractInitialRouteSnapshot(hydratedContainer),
                warnings,
            };
        } finally {
            console.warn = originalWarn;
            console.error = originalError;
        }
    }, { url: pageUrl });
}

function resolveCapturedMainzNavigationError(entries: unknown[]): unknown {
    const [firstEntry, secondEntry] = entries;
    if (firstEntry === "[mainz] SPA navigation failed." && typeof secondEntry !== "undefined") {
        return secondEntry;
    }

    return undefined;
}

function extractInitialRouteSnapshot(appContainer: Element): InitialRouteSnapshot | undefined {
    const routeElement = [appContainer, ...Array.from(appContainer.querySelectorAll("*"))].find(
        (element) => {
            const props = (element as Element & { props?: unknown }).props;
            if (!props || typeof props !== "object") {
                return false;
            }

            const propsRecord = props as Record<string, unknown>;
            const route = propsRecord.route;
            return typeof route === "object" && route !== null;
        },
    ) as (Element & { props?: Record<string, unknown> }) | undefined;

    if (!routeElement?.props || typeof routeElement.props !== "object") {
        return undefined;
    }

    const route = routeElement.props.route;
    if (!route || typeof route !== "object") {
        return undefined;
    }

    const routeRecord = route as Record<string, unknown>;
    const params = routeRecord.params;

    return {
        pageTagName: routeElement.tagName.toLowerCase(),
        path: String(routeRecord.path ?? ""),
        matchedPath: String(routeRecord.matchedPath ?? ""),
        params: isStringRecord(params) ? params : {},
        locale: typeof routeRecord.locale === "string" ? routeRecord.locale : undefined,
        data: routeElement.props.data,
        head: isPageHeadDefinition(routeRecord.head) ? routeRecord.head : undefined,
    };
}

function extractModuleScriptSrc(html: string): string | null {
    const moduleScriptTag = html.match(/<script[^>]*type=["']module["'][^>]*>/i)?.[0];
    if (!moduleScriptTag) {
        return null;
    }

    const srcMatch = moduleScriptTag.match(/src=["']([^"']+)["']/i);
    return srcMatch?.[1] ?? null;
}

function stripScriptTags(html: string): string {
    return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

function buildRenderPageUrl(renderPath: string): string {
    const normalizedRenderPath = renderPath.trim() || "/";
    const withLeadingSlash = normalizedRenderPath.startsWith("/")
        ? normalizedRenderPath
        : `/${normalizedRenderPath}`;
    const pathname = withLeadingSlash === "/" || withLeadingSlash === ""
        ? "/"
        : withLeadingSlash.endsWith("/")
        ? withLeadingSlash
        : `${withLeadingSlash}/`;

    return `https://mainz.local${pathname}`;
}

function resolveModuleScriptPath(args: {
    moduleScriptSrc: string;
    absoluteOutputPath: string;
    modeOutDir: string;
    basePath: string;
}): string {
    const normalizedSrc = args.moduleScriptSrc.trim();

    if (/^https?:\/\//i.test(normalizedSrc)) {
        throw new Error(
            `External module script is not supported for SSG prerender: ${normalizedSrc}`,
        );
    }

    if (normalizedSrc.startsWith("/")) {
        const normalizedBasePath = args.basePath === "/" ? "/" : args.basePath.replace(/\/+$/, "/");
        const srcWithoutBasePath =
            normalizedBasePath !== "/" && normalizedSrc.startsWith(normalizedBasePath)
                ? normalizedSrc.slice(normalizedBasePath.length - 1)
                : normalizedSrc;
        return resolve(args.modeOutDir, `.${srcWithoutBasePath}`);
    }

    return resolve(dirname(args.absoluteOutputPath), normalizedSrc);
}

function setNavigatorLocale(windowLike: { navigator: unknown }, locale: string): void {
    const navigatorLike = windowLike.navigator as object;

    try {
        const navigatorProxy = Object.create(navigatorLike);

        Object.defineProperty(navigatorProxy, "language", {
            configurable: true,
            value: locale,
            writable: true,
        });

        Object.defineProperty(navigatorProxy, "languages", {
            configurable: true,
            value: [locale],
            writable: true,
        });

        Object.defineProperty(globalThis, "navigator", {
            configurable: true,
            value: navigatorProxy,
            writable: true,
        });
    } catch {
        // Ignore locale override failures; the app may use other locale resolution strategies.
    }
}

export function rewriteAssetPaths(html: string, relativeFromOutputDir: string): string {
    if (relativeFromOutputDir === ".") {
        return html;
    }

    const prefix = `${normalizePathSlashes(relativeFromOutputDir)}/`;

    return html
        .replace(/(["'])\.\/assets\//g, `$1${prefix}assets/`)
        .replace(/(["'])\/assets\//g, `$1${prefix}assets/`);
}

export function rewriteFallbackAssetPaths(html: string, basePath: string): string {
    const normalizedBasePath = normalizeFallbackBasePath(basePath);
    return html
        .replace(/(["'])\.\/assets\//g, `$1${normalizedBasePath}assets/`)
        .replace(/(["'])\/assets\//g, `$1${normalizedBasePath}assets/`);
}

function normalizeFallbackBasePath(basePath: string): string {
    const trimmed = basePath.trim();
    if (!trimmed || trimmed === "." || trimmed === "./") {
        return "/";
    }

    const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function isRootFallbackOutput(outputHtmlPath: string, modeOutDir: string): boolean {
    const relativeOutputPath = normalizePathSlashes(
        relative(resolve(modeOutDir), resolve(outputHtmlPath)),
    );
    return relativeOutputPath === "404.html";
}

export function injectAppHtml(html: string, appHtml: string): string {
    const replacedMain = html.replace(
        /<main id="app"><\/main>/,
        `<main id="app">${appHtml}</main>`,
    );

    if (replacedMain !== html) {
        return replacedMain;
    }

    return html.replace(
        /<div id="app"><\/div>/,
        `<div id="app">${appHtml}</div>`,
    );
}

export function injectRouteSnapshot(
    html: string,
    snapshot: InitialRouteSnapshot | undefined,
): string {
    if (!snapshot) {
        return html;
    }

    const serializedSnapshot = serializeRouteSnapshot(snapshot)
        .replace(/</g, "\\u003c")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
    const scriptTag =
        `<script id="mainz-route-snapshot" type="application/json">${serializedSnapshot}</script>`;

    if (html.includes('id="mainz-route-snapshot"')) {
        return html.replace(
            /<script id="mainz-route-snapshot" type="application\/json">[\s\S]*?<\/script>/,
            scriptTag,
        );
    }

    if (html.includes("</body>")) {
        return html.replace("</body>", `${scriptTag}\n</body>`);
    }

    return `${html}\n${scriptTag}`;
}

export function formatSsgPrerenderError(args: {
    routePath: string;
    renderPath: string;
    locale: string;
    error: unknown;
}): string {
    return `Failed to prerender SSG route "${args.routePath}" for output "${args.renderPath}" (locale "${args.locale}"): ${
        formatSsgPrerenderCause(args.error)
    }`;
}

export function formatSsgPrerenderWarning(args: {
    routePath: string;
    renderPath: string;
    locale: string;
    warning: string;
}): string {
    return `SSG prerender warning for route "${args.routePath}" and output "${args.renderPath}" (locale "${args.locale}"): ${args.warning}`;
}

function formatSsgPrerenderCause(error: unknown): string {
    if (error instanceof ResourceAccessError) {
        switch (error.code) {
            case "private-in-ssg":
                return `${error.message} Move this resource behind a deferred or client-only boundary.`;
            case "client-in-ssg":
                return `${error.message} Read it on the client or replace it with a build-compatible resource.`;
            case "forbidden-in-ssg":
                return `${error.message} Remove it from the SSG path or render this route in a non-SSG mode.`;
        }
    }

    const message = toErrorMessage(error);
    if (
        message.includes('@RenderStrategy("forbidden-in-ssg")') &&
        message.includes("cannot be rendered during SSG.")
    ) {
        return appendSsgGuidance(
            message,
            "Remove it from the SSG path or render this route in a non-SSG mode.",
        );
    }

    return message;
}

function appendSsgGuidance(message: string, guidance: string): string {
    return message.includes(guidance) ? message : `${message} ${guidance}`;
}

function serializeRouteSnapshot(snapshot: InitialRouteSnapshot): string {
    return JSON.stringify(normalizePublicSnapshotValue(snapshot, "$"));
}

function normalizePublicSnapshotValue(value: unknown, path: string): unknown {
    if (value === null) {
        return null;
    }

    switch (typeof value) {
        case "string":
        case "boolean":
            return value;
        case "number":
            if (!Number.isFinite(value)) {
                throw new Error(`${path} must not contain non-finite numbers.`);
            }
            return value;
        case "undefined":
            return undefined;
        case "bigint":
        case "function":
        case "symbol":
            throw new Error(`${path} must contain JSON-serializable plain data only.`);
        case "object":
            break;
    }

    if (Array.isArray(value)) {
        const normalizedArray: unknown[] = [];
        for (let index = 0; index < value.length; index += 1) {
            if (!(index in value)) {
                normalizedArray.push(null);
                continue;
            }

            const normalizedEntry = normalizePublicSnapshotValue(value[index], `${path}[${index}]`);
            normalizedArray.push(normalizedEntry ?? null);
        }
        return normalizedArray;
    }

    if (!isPlainObject(value)) {
        throw new Error(`${path} must contain plain objects only.`);
    }

    const normalizedObject: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
        const normalizedNested = normalizePublicSnapshotValue(nested, `${path}.${key}`);
        if (typeof normalizedNested !== "undefined") {
            normalizedObject[key] = normalizedNested;
        }
    }

    return normalizedObject;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

export function setHtmlLang(html: string, locale: string): string {
    const normalizedLocale = locale.trim();
    if (!normalizedLocale) {
        return html;
    }

    if (/<html[^>]*\slang=/.test(html)) {
        return html.replace(/(<html[^>]*\slang=")[^"]*(")/, `$1${normalizedLocale}$2`);
    }

    return html.replace(/<html([^>]*)>/, `<html$1 lang="${normalizedLocale}">`);
}

function buildDefaultLocaleRedirectHtml(
    manifest: { routes: Array<{ path: string; mode: RenderMode; locales: string[] }> },
    defaultLocale: string | undefined,
    localePrefix: "auto" | "always" | undefined,
    basePath: string,
    siteUrl?: string,
): string | null {
    const rootRoute = manifest.routes.find((route) => {
        return route.path === "/" &&
            route.mode === "ssg" &&
            shouldPrefixLocaleForRoute(route.locales, localePrefix ?? "auto");
    });

    if (!rootRoute) {
        return null;
    }

    const supportedLocaleSegments = Array.from(
        new Set(rootRoute.locales.map((locale) => toLocalePathSegment(locale))),
    );
    if (supportedLocaleSegments.length === 0) {
        return null;
    }

    const localizedTargetPath = resolveLocaleRedirectPath({
        supportedLocales: supportedLocaleSegments,
        defaultLocale,
    });
    const targetPath = prependBuildBasePath(localizedTargetPath, basePath);
    const canonicalTarget = siteUrl ? new URL(targetPath, `${siteUrl}/`).toString() : targetPath;
    const supportedLocaleSegmentsJson = JSON.stringify(supportedLocaleSegments);
    const fallbackPathJson = JSON.stringify(targetPath);

    return [
        "<!doctype html>",
        '<html lang="en">',
        "  <head>",
        '    <meta charset="UTF-8" />',
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        "    <title>Redirecting...</title>",
        `    <link rel="canonical" href="${canonicalTarget}" />`,
        "    <script>",
        "      (function () {",
        `        var supported = ${supportedLocaleSegmentsJson};`,
        `        var fallbackPath = ${fallbackPathJson};`,
        "        var candidates = [];",
        "        if (typeof navigator !== 'undefined') {",
        "          if (Array.isArray(navigator.languages)) candidates = candidates.concat(navigator.languages);",
        "          if (navigator.language) candidates.push(navigator.language);",
        "        }",
        "        function normalize(value) {",
        "          return String(value || '').trim().replace(/_/g, '-').toLowerCase();",
        "        }",
        "        var exact = Object.create(null);",
        "        var base = Object.create(null);",
        "        for (var i = 0; i < supported.length; i += 1) {",
        "          var locale = normalize(supported[i]);",
        "          if (!locale) continue;",
        "          exact[locale] = supported[i];",
        "          var baseLocale = locale.split('-')[0];",
        "          if (baseLocale && !base[baseLocale]) base[baseLocale] = supported[i];",
        "        }",
        "        var selected = null;",
        "        for (var j = 0; j < candidates.length; j += 1) {",
        "          var candidate = normalize(candidates[j]);",
        "          if (!candidate) continue;",
        "          if (exact[candidate]) { selected = exact[candidate]; break; }",
        "          var candidateBase = candidate.split('-')[0];",
        "          if (candidateBase && base[candidateBase]) { selected = base[candidateBase]; break; }",
        "        }",
        "        var targetPath = selected ? ('/' + selected + '/') : fallbackPath;",
        "        location.replace(targetPath);",
        "      })();",
        "    </script>",
        `    <noscript><meta http-equiv="refresh" content="0; url=${targetPath}" /></noscript>`,
        "  </head>",
        "  <body>",
        `    <p>Redirecting to <a href="${targetPath}">${targetPath}</a>...</p>`,
        "  </body>",
        "</html>",
        "",
    ].join("\n");
}

function isStringRecord(value: unknown): value is Record<string, string> {
    return typeof value === "object" && value !== null &&
        Object.values(value).every((entry) => typeof entry === "string");
}

function isPageHeadDefinition(value: unknown): value is PageHeadDefinition {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return "title" in candidate || "meta" in candidate || "links" in candidate;
}

function prependBuildBasePath(pathname: string, basePath: string): string {
    const normalizedBasePath = normalizeFallbackBasePath(basePath);
    if (normalizedBasePath === "/") {
        return pathname;
    }

    if (pathname === "/") {
        return normalizedBasePath;
    }

    return `${normalizedBasePath.slice(0, -1)}${
        pathname.startsWith("/") ? pathname : `/${pathname}`
    }`;
}

export function applyRouteHead(
    html: string,
    route: {
        head?: PageHeadDefinition;
    },
): string {
    if (!route.head) {
        return html;
    }

    let nextHtml = html;

    if (route.head.title) {
        if (/<title>[\s\S]*?<\/title>/i.test(nextHtml)) {
            nextHtml = nextHtml.replace(
                /<title>[\s\S]*?<\/title>/i,
                `<title>${escapeHtml(route.head.title)}</title>`,
            );
        } else {
            nextHtml = nextHtml.replace(
                "</head>",
                `  <title>${escapeHtml(route.head.title)}</title>\n</head>`,
            );
        }
    }

    const tags: string[] = [];

    for (const meta of route.head.meta ?? []) {
        const attributes = [
            meta.name ? ` name="${escapeHtmlAttribute(meta.name)}"` : "",
            meta.property ? ` property="${escapeHtmlAttribute(meta.property)}"` : "",
            ` content="${escapeHtmlAttribute(meta.content)}"`,
            ` ${MAINZ_HEAD_MANAGED_ATTR}="true"`,
        ].join("");
        tags.push(`<meta${attributes} />`);
    }

    for (const link of route.head.links ?? []) {
        const attributes = [
            ` rel="${escapeHtmlAttribute(link.rel)}"`,
            ` href="${escapeHtmlAttribute(link.href)}"`,
            link.hreflang ? ` hreflang="${escapeHtmlAttribute(link.hreflang)}"` : "",
            ` ${MAINZ_HEAD_MANAGED_ATTR}="true"`,
        ].join("");
        tags.push(`<link${attributes} />`);
    }

    if (tags.length > 0) {
        nextHtml = nextHtml.replace("</head>", `  ${tags.join("\n  ")}\n</head>`);
    }

    return nextHtml;
}

function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function escapeHtmlAttribute(value: string): string {
    return escapeHtml(value).replaceAll('"', "&quot;");
}

function toFileUrl(absolutePath: string): string {
    return pathToFileURL(absolutePath).href;
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

