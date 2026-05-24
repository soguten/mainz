import type { PageHeadDefinition } from "../components/page.ts";
import { buildRouteHead, materializeRoutePath } from "../routing/index.ts";
import type { RouteManifestEntry, SsgOutputEntry } from "../routing/types.ts";
import type { ResolvedBuildProfile } from "./profiles.ts";
import type { InitialRouteSnapshot } from "./render-core.ts";

export interface RouteGenerationMetadata {
  routeRenderMode: "csr" | "ssg" | "ssr";
  documentRenderMode: "csr" | "ssg" | "ssr";
  generatedAt: string;
  generationRuntime: "build" | "preview";
  routePath: string;
  renderPath: string;
  locale?: string;
}

export function buildResolvedRouteHead(args: {
  route: RouteManifestEntry;
  locale?: string;
  head: PageHeadDefinition | undefined;
  targetI18n?: {
    defaultLocale?: string;
    localePrefix?: "except-default" | "always";
  };
  profile: ResolvedBuildProfile;
  params?: Record<string, string>;
  matchedPath?: string;
}): PageHeadDefinition | undefined {
  return buildRouteHead({
    path: args.matchedPath ??
      (args.params
        ? materializeRoutePath(args.route.path, args.params)
        : args.route.path),
    locale: args.locale ?? "",
    locales: args.route.locales,
    head: args.head,
    localePrefix: args.targetI18n?.localePrefix,
    defaultLocale: args.targetI18n?.defaultLocale,
    basePath: args.profile.basePath,
    siteUrl: args.profile.siteUrl,
  });
}

export function finalizePrerenderedRouteDocument(args: {
  html: string;
  renderedApp: {
    appHtml: string;
    routeSnapshot?: InitialRouteSnapshot;
  };
  locale?: string;
  routeHead?: PageHeadDefinition;
  snapshotErrorMessage?: (error: unknown) => string;
}): string {
  let html = injectAppHtml(args.html, args.renderedApp.appHtml);
  try {
    html = injectRouteSnapshot(html, args.renderedApp.routeSnapshot);
  } catch (error) {
    if (!args.snapshotErrorMessage) {
      throw error;
    }

    throw new Error(args.snapshotErrorMessage(error));
  }
  html = setHtmlLang(html, args.locale);
  html = applyRouteHead(html, { head: args.routeHead });
  return html;
}

export function finalizeEvaluatedRouteDocument(args: {
  html: string;
  locale?: string;
  routeHead?: PageHeadDefinition;
}): string {
  let html = setHtmlLang(args.html, args.locale);
  html = applyRouteHead(html, { head: args.routeHead });
  return html;
}

export function resolveRenderedRouteHead(args: {
  route: RouteManifestEntry;
  entry: SsgOutputEntry;
  renderedSnapshot?: InitialRouteSnapshot;
  fallbackHead?: PageHeadDefinition;
  targetI18n?: {
    defaultLocale?: string;
    localePrefix?: "except-default" | "always";
  };
  profile: ResolvedBuildProfile;
}): PageHeadDefinition | undefined {
  return buildResolvedRouteHead({
    route: args.route,
    locale: args.entry.locale,
    params: args.entry.params,
    matchedPath: args.renderedSnapshot?.matchedPath,
    head: args.renderedSnapshot?.head ?? args.fallbackHead,
    targetI18n: args.targetI18n,
    profile: args.profile,
  });
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

export function injectRouteGenerationMetadata(
  html: string,
  metadata: RouteGenerationMetadata,
): string {
  const serializedMetadata = JSON.stringify(metadata)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const scriptTag =
    `<script id="mainz-route-generation" type="application/json">${serializedMetadata}</script>`;

  if (html.includes('id="mainz-route-generation"')) {
    return html.replace(
      /<script id="mainz-route-generation" type="application\/json">[\s\S]*?<\/script>/,
      scriptTag,
    );
  }

  if (html.includes("</head>")) {
    return html.replace("</head>", `  ${scriptTag}\n</head>`);
  }

  if (html.includes("</body>")) {
    return html.replace("</body>", `${scriptTag}\n</body>`);
  }

  return `${html}\n${scriptTag}`;
}

export function setHtmlLang(html: string, locale?: string): string {
  const normalizedLocale = locale?.trim();
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
      ' data-mainz-head-managed="true"',
    ].join("");
    tags.push(`<meta${attributes} />`);
  }

  for (const link of route.head.links ?? []) {
    const attributes = [
      ` rel="${escapeHtmlAttribute(link.rel)}"`,
      ` href="${escapeHtmlAttribute(link.href)}"`,
      link.hreflang ? ` hreflang="${escapeHtmlAttribute(link.hreflang)}"` : "",
      ' data-mainz-head-managed="true"',
    ].join("");
    tags.push(`<link${attributes} />`);
  }

  if (tags.length > 0) {
    nextHtml = nextHtml.replace("</head>", `  ${tags.join("\n  ")}\n</head>`);
  }

  return nextHtml;
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value).replaceAll('"', "&quot;");
}
