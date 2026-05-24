import { dirname, resolve } from "node:path";
import type { RenderMode } from "../../src/routing/types.ts";

export interface ArtifactFixtureRoute {
  path: string;
  mode: RenderMode;
}

export interface ArtifactFixture {
  rootDir: string;
  expectedRouteMarkers: Map<string, string>;
  expectedNotFoundMarker: string;
  cleanup(): Promise<void>;
}

export async function createArtifactFixture(args: {
  routes: readonly ArtifactFixtureRoute[];
  notFoundMode: RenderMode;
}): Promise<ArtifactFixture> {
  const rootDir = await Deno.makeTempDir({ prefix: "mainz-artifact-fixture-" });
  const browserDir = resolve(rootDir, "browser");
  const serverDir = resolve(rootDir, "server");
  await Deno.mkdir(browserDir, { recursive: true });

  const expectedRouteMarkers = new Map<string, string>();
  const expectedNotFoundMarker = markerForNotFound(args.notFoundMode);
  const ssrRoutes = args.routes.filter((route) => route.mode === "ssr");

  const rootRoute = args.routes.find((route) =>
    normalizeRoutePath(route.path) === "/"
  );
  const rootTemplateMode = rootRoute?.mode ?? "csr";
  await Deno.writeTextFile(
    resolve(browserDir, "index.html"),
    createDocument({
      body: rootTemplateMode === "ssg"
        ? `<main id="app"><article>${
          markerForRoute(rootTemplateMode, "/")
        }</article></main>`
        : `<p>${
          markerForRoute(rootTemplateMode, "/")
        }</p><main id="app"></main>`,
      scriptSrc: "./assets/app.js",
    }),
  );

  for (const route of args.routes) {
    const normalizedPath = normalizeRoutePath(route.path);
    const marker = markerForRoute(route.mode, normalizedPath);
    expectedRouteMarkers.set(normalizedPath, marker);

    if (route.mode === "ssr") {
      continue;
    }

    const outputPath = resolveBrowserHtmlPath(browserDir, normalizedPath);
    await Deno.mkdir(dirname(outputPath), { recursive: true });
    await Deno.writeTextFile(
      outputPath,
      createDocument({
        body: route.mode === "ssg"
          ? `<main id="app"><article>${marker}</article></main>`
          : `<p>${marker}</p><main id="app"></main>`,
        scriptSrc: scriptSrcForPath(normalizedPath),
      }),
    );
  }

  if (args.notFoundMode !== "ssr") {
    await Deno.writeTextFile(
      resolve(browserDir, "404.html"),
      createDocument({
        body: args.notFoundMode === "ssg"
          ? `<main id="app"><article>${expectedNotFoundMarker}</article></main>`
          : `<p>${expectedNotFoundMarker}</p><main id="app"></main>`,
        scriptSrc: "./assets/app.js",
      }),
    );
  }

  await Deno.mkdir(resolve(browserDir, "assets"), { recursive: true });
  await Deno.writeTextFile(
    resolve(browserDir, "assets", "app.js"),
    "export {};\n",
  );

  await Deno.writeTextFile(
    resolve(browserDir, "routes.json"),
    JSON.stringify({
      target: "fixture-target",
      routes: [
        ...args.routes.map((route) => ({
          id: routeIdForPath(route.path),
          source: "filesystem",
          path: normalizeRoutePath(route.path),
          pattern: normalizeRoutePath(route.path),
          mode: route.mode,
          locales: [],
        })),
        {
          id: "404",
          source: "filesystem",
          path: "/404",
          pattern: "/404",
          mode: args.notFoundMode,
          notFound: true,
          locales: [],
        },
      ],
    }),
  );

  if (ssrRoutes.length > 0 || args.notFoundMode === "ssr") {
    await Deno.mkdir(serverDir, { recursive: true });
    await Deno.writeTextFile(
      resolve(serverDir, "ssr-manifest.json"),
      JSON.stringify({
        version: 1,
        target: "fixture-target",
        basePath: "/",
        navigation: "mpa",
        serverEntryPath: "server/app.mjs",
        routes: [
          ...ssrRoutes.map((route) => ({
            id: routeIdForPath(route.path),
            path: normalizeRoutePath(route.path),
            pattern: normalizeRoutePath(route.path),
            locales: [],
          })),
          ...(args.notFoundMode === "ssr"
            ? [{
              id: "404",
              path: "/404",
              pattern: "/404",
              locales: [],
              notFound: true,
            }]
            : []),
        ],
      }),
    );
    await Deno.writeTextFile(
      resolve(serverDir, "app.mjs"),
      createSsrServerModule({
        ssrRoutes: ssrRoutes.map((route) => normalizeRoutePath(route.path)),
        notFoundMarker: expectedNotFoundMarker,
      }),
    );
  }

  return {
    rootDir,
    expectedRouteMarkers,
    expectedNotFoundMarker,
    async cleanup() {
      await Deno.remove(rootDir, { recursive: true });
    },
  };
}

export function markerForRoute(mode: RenderMode, path: string): string {
  return `${mode.toUpperCase()} ROUTE ${normalizeRoutePath(path)}`;
}

export function markerForNotFound(mode: RenderMode): string {
  return `404 ${mode.toUpperCase()}`;
}

function createDocument(args: { body: string; scriptSrc: string }): string {
  return [
    "<!doctype html>",
    "<html>",
    "  <head>",
    '    <meta charset="utf-8" />',
    "  </head>",
    "  <body>",
    `    ${args.body}`,
    `    <script type="module" src="${args.scriptSrc}"></script>`,
    "  </body>",
    "</html>",
  ].join("\n");
}

function createSsrServerModule(args: {
  ssrRoutes: readonly string[];
  notFoundMarker: string;
}): string {
  const routeMap = Object.fromEntries(
    args.ssrRoutes.map((path) => [path, markerForRoute("ssr", path)]),
  );

  return [
    `const routeMap = ${JSON.stringify(routeMap)};`,
    `const notFoundMarker = ${JSON.stringify(args.notFoundMarker)};`,
    "const pathname = (() => {",
    "  const raw = window.location.pathname || '/';",
    "  if (raw.length > 1 && raw.endsWith('/')) return raw.slice(0, -1);",
    "  return raw || '/';",
    "})();",
    "const app = document.querySelector('#app');",
    "if (!app) throw new Error('Missing #app container for SSR fixture.');",
    "const marker = routeMap[pathname] ?? notFoundMarker;",
    "app.innerHTML = `<article>${marker}</article>`;",
  ].join("\n");
}

function resolveBrowserHtmlPath(browserDir: string, path: string): string {
  const normalizedPath = normalizeRoutePath(path);
  if (normalizedPath === "/") {
    return resolve(browserDir, "index.html");
  }

  return resolve(
    browserDir,
    ...normalizedPath.split("/").filter(Boolean),
    "index.html",
  );
}

function scriptSrcForPath(path: string): string {
  const normalizedPath = normalizeRoutePath(path);
  if (normalizedPath === "/") {
    return "./assets/app.js";
  }

  const depth = normalizedPath.split("/").filter(Boolean).length;
  return `${"../".repeat(depth)}assets/app.js`;
}

function routeIdForPath(path: string): string {
  const normalizedPath = normalizeRoutePath(path);
  if (normalizedPath === "/") {
    return "index";
  }

  return normalizedPath
    .split("/")
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .toLowerCase();
}

function normalizeRoutePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}
