import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { PageHeadDefinition } from "../components/page.ts";
import { withHappyDom } from "../ssg/happy-dom.ts";

export interface InitialRouteSnapshot {
  pageTagName: string;
  path: string;
  matchedPath: string;
  params: Record<string, string>;
  locale?: string;
  data?: unknown;
  head?: PageHeadDefinition;
}

export async function renderRouteAppHtml(args: {
  html: string;
  absoluteOutputPath: string;
  outputDir: string;
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
          return resolve(args.outputDir, `.${srcWithoutBasePath}`);
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function toFileUrl(absolutePath: string): string {
  return pathToFileURL(absolutePath).href;
}
