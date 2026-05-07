import { dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildRouteHead,
  buildSsgOutputEntries,
  buildTargetRouteManifest,
  materializeRoutePath,
  type RenderMode,
  resolveLocaleRedirectPath,
  shouldPrefixLocaleForRoute,
  toLocalePathSegment,
} from "../routing/index.ts";
import {
  MAINZ_HEAD_MANAGED_ATTR,
  type PageHeadDefinition,
} from "../components/page.ts";
import {
  type NormalizedMainzConfig,
  type NormalizedMainzTarget,
} from "../config/index.ts";
import { ResourceAccessError } from "../resources/index.ts";
import { withHappyDom } from "../ssg/happy-dom.ts";
import { resolveTargetAppFile } from "../routing/target-page-discovery.ts";
import {
  type ResolvedBuildProfile,
  resolveEffectiveNavigationMode,
} from "./profiles.ts";
import { denoToolingRuntime } from "../tooling/runtime/index.ts";
import type { MainzToolingRuntime } from "../tooling/runtime/index.ts";
import {
  resolveRoutePrerenderContext,
  resolveTargetI18nConfig,
} from "./prerender-context.ts";

export { resolveTargetI18nConfig } from "./prerender-context.ts";

export interface ArtifactBuildJob {
  target: NormalizedMainzTarget;
  mode: RenderMode;
  profile: ResolvedBuildProfile;
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

export async function emitSsgArtifacts(
  config: NormalizedMainzConfig,
  job: ArtifactBuildJob,
  modeOutDir: string,
  cwd: string,
  runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<void> {
  const { templateHtml, manifest, outputEntries, routeById, targetI18n } =
    await resolveStaticRouteBuildContext(
      config,
      job,
      modeOutDir,
      cwd,
      "SSG",
      runtime,
    );

  for (const entry of outputEntries) {
    const absoluteOutputPath = resolve(cwd, entry.outputHtmlPath);
    const relativeFromOutputDir = relative(
      dirname(absoluteOutputPath),
      resolve(cwd, modeOutDir),
    );
    const normalizedRelative = normalizePathSlashes(
      relativeFromOutputDir || ".",
    );
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
      path: entry.params
        ? materializeRoutePath(route.path, entry.params)
        : route.path,
      locale: entry.locale,
      locales: route.locales,
      head: renderedApp.routeSnapshot?.head ?? route.head,
      localePrefix: targetI18n?.localePrefix,
      defaultLocale: targetI18n?.defaultLocale,
      basePath: job.profile.basePath,
      siteUrl: job.profile.siteUrl,
    });
    html = applyRouteHead(html, { head: routeHead });

    await runtime.mkdir(dirname(absoluteOutputPath), { recursive: true });
    await runtime.writeTextFile(absoluteOutputPath, html);
  }

  const routesManifestPath = resolve(cwd, modeOutDir, "routes.json");
  await runtime.writeTextFile(
    routesManifestPath,
    JSON.stringify(manifest, null, 2),
  );

  const hydrationManifestPath = resolve(cwd, modeOutDir, "hydration.json");
  await runtime.writeTextFile(
    hydrationManifestPath,
    JSON.stringify(
      {
        target: job.target.name,
        hydration: "full-page",
        navigation: await resolveEffectiveNavigationMode(
          job.target,
          job.profile,
          cwd,
        ),
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
    await runtime.writeTextFile(
      resolve(cwd, modeOutDir, "index.html"),
      localeRedirectHtml,
    );
  }
}

export async function emitCsrRouteArtifacts(
  config: NormalizedMainzConfig,
  job: ArtifactBuildJob,
  modeOutDir: string,
  cwd: string,
  runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<void> {
  const { templateHtml, manifest, outputEntries, routeById, targetI18n } =
    await resolveStaticRouteBuildContext(
      config,
      job,
      modeOutDir,
      cwd,
      "CSR document",
      runtime,
    );

  for (const entry of outputEntries) {
    const absoluteOutputPath = resolve(cwd, entry.outputHtmlPath);
    const relativeFromOutputDir = relative(
      dirname(absoluteOutputPath),
      resolve(cwd, modeOutDir),
    );
    const normalizedRelative = normalizePathSlashes(
      relativeFromOutputDir || ".",
    );
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
      throw new Error(
        `Failed to evaluate CSR document route "${route.path}" for output "${entry.renderPath}" (locale "${entry.locale}"): ${
          toErrorMessage(error)
        }`,
      );
    }

    for (const warning of renderedApp.warnings) {
      console.warn(
        `CSR document evaluation warning for route "${route.path}" and output "${entry.renderPath}" (locale "${entry.locale}"): ${warning}`,
      );
    }

    const routeHead = buildRouteHead({
      path: entry.params
        ? materializeRoutePath(route.path, entry.params)
        : route.path,
      locale: entry.locale,
      locales: route.locales,
      head: renderedApp.routeSnapshot?.head ?? route.head,
      localePrefix: targetI18n?.localePrefix,
      defaultLocale: targetI18n?.defaultLocale,
      basePath: job.profile.basePath,
      siteUrl: job.profile.siteUrl,
    });

    html = setHtmlLang(html, entry.locale);
    html = applyRouteHead(html, { head: routeHead });

    await runtime.mkdir(dirname(absoluteOutputPath), { recursive: true });
    await runtime.writeTextFile(absoluteOutputPath, html);
  }

  const routesManifestPath = resolve(cwd, modeOutDir, "routes.json");
  await runtime.writeTextFile(
    routesManifestPath,
    JSON.stringify(manifest, null, 2),
  );

  const hydrationManifestPath = resolve(cwd, modeOutDir, "hydration.json");
  await runtime.writeTextFile(
    hydrationManifestPath,
    JSON.stringify(
      {
        target: job.target.name,
        hydration: "full-page",
        navigation: await resolveEffectiveNavigationMode(
          job.target,
          job.profile,
          cwd,
        ),
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
    await runtime.writeTextFile(
      resolve(cwd, modeOutDir, "index.html"),
      localeRedirectHtml,
    );
  }
}

export async function emitCsrSpaAppShellMetadata(args: {
  runtime?: MainzToolingRuntime;
  modeOutDir: string;
  cwd: string;
  documentLanguage?: string;
}): Promise<void> {
  const normalizedDocumentLanguage = args.documentLanguage?.trim();
  if (!normalizedDocumentLanguage) {
    return;
  }

  const indexHtmlPath = resolve(args.cwd, args.modeOutDir, "index.html");
  const runtime = args.runtime ?? denoToolingRuntime;
  const html = await runtime.readTextFile(indexHtmlPath);
  await runtime.writeTextFile(
    indexHtmlPath,
    setHtmlLang(html, normalizedDocumentLanguage),
  );
}

async function resolveStaticRouteBuildContext(
  config: NormalizedMainzConfig,
  job: ArtifactBuildJob,
  modeOutDir: string,
  cwd: string,
  buildLabel: string,
  runtime: MainzToolingRuntime,
): Promise<{
  templateHtml: string;
  manifest: ReturnType<typeof buildTargetRouteManifest>;
  outputEntries: ReturnType<typeof buildSsgOutputEntries>;
  routeById: Map<
    string,
    ReturnType<typeof buildTargetRouteManifest>["routes"][number]
  >;
  targetI18n: ReturnType<typeof resolveTargetI18nConfig>;
}> {
  const templateHtml = await readBuildTemplateHtml(
    modeOutDir,
    cwd,
    job.target.name,
    buildLabel,
    runtime,
  );
  const prerenderContext = await resolveRoutePrerenderContext(
    config,
    job,
    cwd,
    runtime,
  );
  const outputEntries = buildSsgOutputEntries(
    prerenderContext.manifest,
    modeOutDir,
    {
      ...(job.mode === "csr"
        ? { includeAllModes: true }
        : { renderMode: job.mode }),
      localePrefix: prerenderContext.targetI18n?.localePrefix,
      defaultLocale: prerenderContext.targetI18n?.defaultLocale,
      routeEntriesByRouteId: prerenderContext.routeEntriesByRouteId,
    },
  );

  return {
    templateHtml,
    manifest: prerenderContext.manifest,
    outputEntries,
    routeById: new Map(prerenderContext.routeById),
    targetI18n: prerenderContext.targetI18n,
  };
}

async function readBuildTemplateHtml(
  modeOutDir: string,
  cwd: string,
  targetName: string,
  buildLabel: string,
  runtime: MainzToolingRuntime,
): Promise<string> {
  const indexHtmlPath = resolve(cwd, modeOutDir, "index.html");

  try {
    return await runtime.readTextFile(indexHtmlPath);
  } catch {
    throw new Error(
      `${buildLabel} build for target "${targetName}" requires "${indexHtmlPath}" to exist.`,
    );
  }
}

function toViteBasePath(basePath: string): string {
  return basePath === "/" ? "./" : basePath;
}

export async function renderSsgAppHtml(args: {
  html: string;
  absoluteOutputPath: string;
  modeOutDir: string;
  locale: string;
  basePath: string;
  renderPath: string;
  loadModule?: (specifier: string) => Promise<unknown>;
}): Promise<
  { appHtml: string; routeSnapshot?: InitialRouteSnapshot; warnings: string[] }
> {
  const moduleScriptSrcs = Array.from(
    args.html.matchAll(/<script[^>]*type=["']module["'][^>]*>/gi),
  ).map((match) => match[0])
    .map((tag) => tag.match(/src=["']([^"']+)["']/i)?.[1] ?? null)
    .filter((src): src is string => Boolean(src));
  if (moduleScriptSrcs.length === 0) {
    throw new Error(
      `Could not find module script in prerender template "${args.absoluteOutputPath}".`,
    );
  }

  const moduleScriptUrls = moduleScriptSrcs
    .filter((src) => {
      const normalizedSrc = stripModuleScriptQuery(src.trim());
      return normalizedSrc !== "/@vite/client" &&
        !normalizedSrc.endsWith("/@vite/client");
    })
    .map((moduleScriptSrc) => {
      const normalizedSrc = moduleScriptSrc.trim();
      const srcQuery = args.loadModule
        ? stripViteTimestampQuery(extractModuleScriptQuery(normalizedSrc))
        : extractModuleScriptQuery(normalizedSrc);
      const cacheBustQuery = args.loadModule
        ? "ssg=mainz-dev"
        : `ssg=${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const importQuery = srcQuery
        ? `${srcQuery}&${cacheBustQuery}`
        : cacheBustQuery;

      if (args.loadModule) {
        const srcPath = stripModuleScriptQuery(normalizedSrc);
        return `${srcPath}?${importQuery}`;
      }

      const resolvedSrc = stripModuleScriptQuery(normalizedSrc);
      const moduleScriptPath = normalizedSrc.startsWith("/")
        ? (() => {
          const normalizedBasePath = args.basePath === "/"
            ? "/"
            : args.basePath.replace(/\/+$/, "/");
          const srcWithoutBasePath = normalizedBasePath !== "/" &&
              resolvedSrc.startsWith(normalizedBasePath)
            ? resolvedSrc.slice(normalizedBasePath.length - 1)
            : resolvedSrc;
          return resolve(args.modeOutDir, `.${srcWithoutBasePath}`);
        })()
        : resolve(dirname(args.absoluteOutputPath), resolvedSrc);

      return `${toFileUrl(moduleScriptPath)}?${importQuery}`;
    });
  if (moduleScriptUrls.length === 0) {
    throw new Error(
      `Could not find an application module script in prerender template "${args.absoluteOutputPath}".`,
    );
  }

  const normalizedRenderPath = args.renderPath.trim() || "/";
  const withLeadingSlash = normalizedRenderPath.startsWith("/")
    ? normalizedRenderPath
    : `/${normalizedRenderPath}`;
  const pathname = withLeadingSlash === "/" || withLeadingSlash === ""
    ? "/"
    : withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
  const pageUrl = `https://mainz.local${pathname}`;
  const htmlWithoutScripts = args.html.replace(
    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
    "",
  );

  return await withHappyDom(async (window) => {
    const navigatorLike = window.navigator as object;

    try {
      Object.defineProperty(navigatorLike, "language", {
        configurable: true,
        value: args.locale,
        writable: true,
      });

      Object.defineProperty(navigatorLike, "languages", {
        configurable: true,
        value: [args.locale],
        writable: true,
      });

      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: navigatorLike,
        writable: true,
      });
    } catch {
      // Ignore locale override failures; the app may use other locale resolution strategies.
    }
    const warnings: string[] = [];
    const errors: unknown[] = [];
    const originalWarn = console.warn;
    const originalError = console.error;
    console.warn = (...entries: unknown[]) => {
      warnings.push(entries.map((entry) => String(entry)).join(" "));
    };
    console.error = (...entries: unknown[]) => {
      const [firstEntry, secondEntry] = entries;
      const mainzNavigationError =
        firstEntry === "[mainz] SPA navigation failed." &&
          typeof secondEntry !== "undefined"
          ? secondEntry
          : undefined;
      errors.push(
        mainzNavigationError ?? entries.map((entry) => String(entry)).join(" "),
      );
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

      for (const moduleScriptUrl of moduleScriptUrls) {
        if (args.loadModule) {
          await args.loadModule(moduleScriptUrl);
          continue;
        }

        await import(moduleScriptUrl);
      }
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

      const appHtml = hydratedContainer.innerHTML;
      const routeSnapshot = extractInitialRouteSnapshot(hydratedContainer);

      return {
        appHtml,
        routeSnapshot,
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
  if (
    firstEntry === "[mainz] SPA navigation failed." &&
    typeof secondEntry !== "undefined"
  ) {
    return secondEntry;
  }

  return undefined;
}

function extractInitialRouteSnapshot(
  appContainer: Element,
): InitialRouteSnapshot | undefined {
  const routeElement = [
    appContainer,
    ...Array.from(appContainer.querySelectorAll("*")),
  ].find(
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
  const propsHead = routeElement.props.head;

  return {
    pageTagName: routeElement.tagName.toLowerCase(),
    path: String(routeRecord.path ?? ""),
    matchedPath: String(routeRecord.matchedPath ?? ""),
    params: isStringRecord(params) ? params : {},
    locale: typeof routeRecord.locale === "string"
      ? routeRecord.locale
      : undefined,
    data: routeElement.props.data,
    head: isPageHeadDefinition(propsHead) ? propsHead : undefined,
  };
}

function extractModuleScriptSrcs(html: string): string[] {
  const moduleScriptTags = Array.from(
    html.matchAll(/<script[^>]*type=["']module["'][^>]*>/gi),
  ).map((match) => match[0]);

  return moduleScriptTags
    .map((tag) => tag.match(/src=["']([^"']+)["']/i)?.[1] ?? null)
    .filter((src): src is string => Boolean(src));
}

function isDevHmrClientScript(moduleScriptSrc: string): boolean {
  const normalizedSrc = stripModuleScriptQuery(moduleScriptSrc.trim());
  return normalizedSrc === "/@vite/client" ||
    normalizedSrc.endsWith("/@vite/client");
}

function stripModuleScriptQuery(moduleScriptSrc: string): string {
  const [pathWithoutQuery] = moduleScriptSrc.split(/[?#]/, 1);
  return pathWithoutQuery ?? moduleScriptSrc;
}

function extractModuleScriptQuery(moduleScriptSrc: string): string {
  const queryIndex = moduleScriptSrc.indexOf("?");
  if (queryIndex === -1) {
    return "";
  }

  const hashIndex = moduleScriptSrc.indexOf("#", queryIndex);
  return hashIndex === -1
    ? moduleScriptSrc.slice(queryIndex + 1)
    : moduleScriptSrc.slice(queryIndex + 1, hashIndex);
}

function stripViteTimestampQuery(query: string): string {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams(query);
  params.delete("t");
  return params.toString();
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
    const normalizedBasePath = args.basePath === "/"
      ? "/"
      : args.basePath.replace(/\/+$/, "/");
    const srcWithoutBasePath =
      normalizedBasePath !== "/" && normalizedSrc.startsWith(normalizedBasePath)
        ? normalizedSrc.slice(normalizedBasePath.length - 1)
        : normalizedSrc;
    return resolve(args.modeOutDir, `.${srcWithoutBasePath}`);
  }

  return resolve(dirname(args.absoluteOutputPath), normalizedSrc);
}

function setNavigatorLocale(
  windowLike: { navigator: unknown },
  locale: string,
): void {
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

export function rewriteAssetPaths(
  html: string,
  relativeFromOutputDir: string,
): string {
  if (relativeFromOutputDir === ".") {
    return html;
  }

  const prefix = `${normalizePathSlashes(relativeFromOutputDir)}/`;

  return html
    .replace(/(["'])\.\/assets\//g, `$1${prefix}assets/`)
    .replace(/(["'])\/assets\//g, `$1${prefix}assets/`);
}

export function rewriteFallbackAssetPaths(
  html: string,
  basePath: string,
): string {
  const normalizedBasePath = normalizeFallbackBasePath(basePath);
  return html
    .replace(/(["'])\.\/assets\//g, `$1${normalizedBasePath}assets/`)
    .replace(/(["'])\/assets\//g, `$1${normalizedBasePath}assets/`);
}

function normalizeFallbackBasePath(basePath: string): string {
  if (!basePath || basePath === "/") {
    return "/";
  }

  const trimmed = basePath.endsWith("/") ? basePath : `${basePath}/`;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function isRootFallbackOutput(
  outputHtmlPath: string,
  modeOutDir: string,
): boolean {
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
        return `${error.message} Move this resource behind a defer strategy or an SSG-safe render policy.`;
      case "client-in-ssg":
        return `${error.message} Read it on the client or replace it with a build-compatible resource.`;
      case "forbidden-in-ssg":
        return `${error.message} Remove it from the SSG path or render this route in a non-SSG mode.`;
    }
  }

  const message = toErrorMessage(error);
  if (
    message.includes('@RenderPolicy("forbidden-in-ssg")') &&
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
      throw new Error(
        `${path} must contain JSON-serializable plain data only.`,
      );
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

      const normalizedEntry = normalizePublicSnapshotValue(
        value[index],
        `${path}[${index}]`,
      );
      normalizedArray.push(normalizedEntry ?? null);
    }
    return normalizedArray;
  }

  if (!isPlainObject(value)) {
    throw new Error(`${path} must contain plain objects only.`);
  }

  const normalizedObject: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    const normalizedNested = normalizePublicSnapshotValue(
      nested,
      `${path}.${key}`,
    );
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
    return html.replace(
      /(<html[^>]*\slang=")[^"]*(")/,
      `$1${normalizedLocale}$2`,
    );
  }

  return html.replace(/<html([^>]*)>/, `<html$1 lang="${normalizedLocale}">`);
}

function buildDefaultLocaleRedirectHtml(
  manifest: {
    routes: Array<{ path: string; mode: RenderMode; locales: string[] }>;
  },
  defaultLocale: string | undefined,
  localePrefix: "except-default" | "always" | undefined,
  basePath: string,
  siteUrl?: string,
): string | null {
  if (localePrefix !== "always") {
    return null;
  }

  const rootRoute = manifest.routes.find((route) => {
    return route.path === "/" &&
      route.mode === "ssg" &&
      shouldPrefixLocaleForRoute(route.locales, localePrefix);
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
  const canonicalTarget = siteUrl
    ? new URL(targetPath, `${siteUrl}/`).toString()
    : targetPath;
  const supportedLocaleSegmentsJson = JSON.stringify(supportedLocaleSegments);
  const fallbackPathJson = JSON.stringify(targetPath);
  const redirectDocumentLanguage = defaultLocale?.trim() ||
    rootRoute.locales[0]?.trim() || "";
  const htmlOpenTag = redirectDocumentLanguage
    ? `<html lang="${escapeHtmlAttribute(redirectDocumentLanguage)}">`
    : "<html>";

  return [
    "<!doctype html>",
    htmlOpenTag,
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
  return isPlainObject(value) &&
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
  const normalizedBasePath = normalizeAbsoluteBasePath(basePath);
  if (normalizedBasePath === "/") {
    return pathname;
  }

  const normalizedPath = pathname.startsWith("/")
    ? pathname.slice(1)
    : pathname;
  return `${normalizedBasePath}${normalizedPath}`;
}

export function applyRouteHead(
  html: string,
  route: { head?: PageHeadDefinition },
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

function normalizeAbsoluteBasePath(basePath: string): string {
  const trimmed = basePath.trim();
  if (!trimmed || trimmed === "." || trimmed === "./") {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

function normalizePathSlashes(path: string): string {
  return path.replaceAll("\\", "/");
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
