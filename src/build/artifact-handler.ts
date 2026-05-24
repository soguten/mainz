import { extname, normalize, resolve, sep } from "node:path";
import {
  denoToolingRuntime,
  type MainzToolingRuntime,
} from "../tooling/runtime/index.ts";
import { type TargetRouteManifest } from "../routing/index.ts";
import { resolveDevRouteRequest } from "./dev-route-request.ts";
import {
  type SsrArtifactResponseHeaderContext,
  tryRenderSsrArtifactRequest,
} from "./ssr-artifact-handler.ts";

export interface CreateBuildArtifactHandlerOptions {
  rootDir: string;
  runtime?: MainzToolingRuntime;
  ssrResponseHeaders?: (
    context: SsrArtifactResponseHeaderContext,
  ) => HeadersInit | undefined;
}

export function createBuildArtifactHandler(
  options: CreateBuildArtifactHandlerOptions,
): (request: Request) => Promise<Response> {
  const runtime = options.runtime ?? denoToolingRuntime;
  const resolvedRootDir = resolve(options.rootDir);
  const browserRootDirPromise = resolveBuildArtifactBrowserRootDir(
    resolvedRootDir,
    runtime,
  );
  const browserRoutesManifestPromise = browserRootDirPromise.then((
    browserRoot,
  ) => readBrowserRoutesManifest(browserRoot, runtime));

  return async function handleRequest(request: Request): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: {
          "allow": "GET, HEAD",
        },
      });
    }

    const browserRootDir = await browserRootDirPromise;

    if (isHtmlDocumentRequest(request)) {
      const browserRoutesManifest = await browserRoutesManifestPromise;

      if (
        shouldAttemptSsrArtifactRequest(
          request,
          browserRoutesManifest,
        )
      ) {
        const ssrResponse = await tryRenderSsrArtifactRequest({
          rootDir: resolvedRootDir,
          browserRootDir,
          request,
          runtime,
          responseHeaders: options.ssrResponseHeaders,
        });
        if (ssrResponse) {
          return ssrResponse;
        }
      }
    }

    const url = new URL(request.url);
    const relativePathCandidates = resolveRequestCandidates(url.pathname);

    for (const relativePath of relativePathCandidates) {
      const response = await tryServeFile(
        request,
        browserRootDir,
        relativePath,
        runtime,
      );
      if (response) {
        return response;
      }
    }

    const notFoundResponse = await tryServeFile(
      request,
      browserRootDir,
      "404.html",
      runtime,
      404,
    );
    if (notFoundResponse) {
      return notFoundResponse;
    }

    return new Response("Not Found", { status: 404 });
  };
}

async function readBrowserRoutesManifest(
  browserRootDir: string,
  runtime: MainzToolingRuntime,
): Promise<TargetRouteManifest | undefined> {
  const manifestPath = resolve(browserRootDir, "routes.json");

  try {
    const text = await runtime.readTextFile(manifestPath);
    return JSON.parse(text) as TargetRouteManifest;
  } catch {
    return undefined;
  }
}

function shouldAttemptSsrArtifactRequest(
  request: Request,
  browserRoutesManifest: TargetRouteManifest | undefined,
): boolean {
  if (!browserRoutesManifest) {
    return true;
  }

  const requestUrl = new URL(request.url);
  const resolution = resolveDevRouteRequest({
    requestUrl,
    basePath: "/",
    manifest: browserRoutesManifest,
  });

  return resolution.kind === "ssr" || resolution.kind === "unmatched" ||
    resolution.kind === "outside-base";
}

export async function resolveBuildArtifactBrowserRootDir(
  rootDir: string,
  runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<string> {
  const nestedBrowserDir = resolve(rootDir, "browser");

  try {
    const stat = await runtime.stat(nestedBrowserDir);
    if (stat.isDirectory) {
      return nestedBrowserDir;
    }
  } catch {
    // Fall back to the provided root for legacy single-root artifacts.
  }

  return rootDir;
}

function isHtmlDocumentRequest(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  if (
    accept.includes("text/html") || accept.includes("application/xhtml+xml")
  ) {
    return true;
  }

  const normalizedAccept = accept.trim();
  if (!normalizedAccept || normalizedAccept === "*/*") {
    return isLikelyHtmlDocumentPath(new URL(request.url).pathname);
  }

  return false;
}

function isLikelyHtmlDocumentPath(pathname: string): boolean {
  if (
    pathname.startsWith("/@") ||
    pathname.startsWith("/__vite") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return false;
  }

  if (pathname.endsWith("/")) {
    return true;
  }

  return extname(pathname) === "";
}

function resolveRequestCandidates(pathname: string): string[] {
  const decodedPathname = safeDecodePathname(pathname);
  const withoutLeadingSlash = decodedPathname.replace(/^\/+/, "");
  const normalizedRelativePath = normalize(withoutLeadingSlash).replaceAll(
    "\\",
    "/",
  );
  const sanitizedRelativePath = stripLeadingParentSegments(
    normalizedRelativePath,
  );

  if (!sanitizedRelativePath || sanitizedRelativePath === ".") {
    return ["index.html"];
  }

  if (pathname.endsWith("/")) {
    return [joinUrlPath(sanitizedRelativePath, "index.html")];
  }

  if (extname(sanitizedRelativePath)) {
    return [sanitizedRelativePath];
  }

  return [
    sanitizedRelativePath,
    joinUrlPath(sanitizedRelativePath, "index.html"),
  ];
}

function safeDecodePathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

function stripLeadingParentSegments(relativePath: string): string {
  const segments = relativePath.split("/").filter((segment) =>
    segment.length > 0 && segment !== "."
  );
  const sanitizedSegments: string[] = [];

  for (const segment of segments) {
    if (segment === "..") {
      sanitizedSegments.pop();
      continue;
    }

    sanitizedSegments.push(segment);
  }

  return sanitizedSegments.join("/");
}

function joinUrlPath(left: string, right: string): string {
  return [left.replace(/\/+$/, ""), right.replace(/^\/+/, "")]
    .filter(Boolean)
    .join("/");
}

async function tryServeFile(
  request: Request,
  rootDir: string,
  relativePath: string,
  runtime: MainzToolingRuntime,
  status = 200,
): Promise<Response | null> {
  const resolvedFilePath = resolve(rootDir, relativePath);
  if (!isPathInsideRoot(rootDir, resolvedFilePath)) {
    return null;
  }

  let fileInfo: Awaited<ReturnType<MainzToolingRuntime["stat"]>>;
  try {
    fileInfo = await runtime.stat(resolvedFilePath);
  } catch {
    return null;
  }

  if (!fileInfo.isFile) {
    return null;
  }

  const headers = new Headers();
  const contentType = resolveContentType(resolvedFilePath);
  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (request.method === "HEAD") {
    return new Response(null, { status, headers });
  }

  const fileBytes = await runtime.readFile(resolvedFilePath);
  return new Response(Uint8Array.from(fileBytes).buffer, {
    status,
    headers,
  });
}

function isPathInsideRoot(rootDir: string, filePath: string): boolean {
  const normalizedRoot = ensureTrailingSeparator(resolve(rootDir));
  const normalizedPath = resolve(filePath);
  return normalizedPath.startsWith(normalizedRoot) ||
    normalizedPath === normalizedRoot.slice(0, -1);
}

function ensureTrailingSeparator(path: string): string {
  return path.endsWith(sep) ? path : `${path}${sep}`;
}

function resolveContentType(filePath: string): string | null {
  switch (extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".ico":
      return "image/x-icon";
    case ".map":
      return "application/json; charset=utf-8";
    case ".txt":
      return "text/plain; charset=utf-8";
    case ".wasm":
      return "application/wasm";
    default:
      return null;
  }
}
