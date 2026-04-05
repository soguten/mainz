/// <reference lib="deno.ns" />

import { extname, normalize, resolve, sep } from "node:path";

export interface ArtifactPreviewServerOptions {
    rootDir: string;
    host?: string;
    port?: number;
}

export function createArtifactPreviewHandler(
    rootDir: string,
): (request: Request) => Promise<Response> {
    const resolvedRootDir = resolve(rootDir);

    return async function handleRequest(request: Request): Promise<Response> {
        if (request.method !== "GET" && request.method !== "HEAD") {
            return new Response("Method Not Allowed", {
                status: 405,
                headers: {
                    "allow": "GET, HEAD",
                },
            });
        }

        const url = new URL(request.url);
        const relativePathCandidates = resolveRequestCandidates(url.pathname);

        for (const relativePath of relativePathCandidates) {
            const response = await tryServeFile(request, resolvedRootDir, relativePath);
            if (response) {
                return response;
            }
        }

        const notFoundResponse = await tryServeFile(request, resolvedRootDir, "404.html", 404);
        if (notFoundResponse) {
            return notFoundResponse;
        }

        return new Response("Not Found", { status: 404 });
    };
}

export function serveArtifactPreview(
    options: ArtifactPreviewServerOptions,
): Deno.HttpServer<Deno.NetAddr> {
    const host = options.host ?? "127.0.0.1";
    const port = options.port ?? 4173;
    const handler = createArtifactPreviewHandler(options.rootDir);

    console.log(
        `[mainz] Previewing build artifact output from ${resolve(options.rootDir)} on http://${host}:${port}/`,
    );

    return Deno.serve({ hostname: host, port }, handler);
}

function resolveRequestCandidates(pathname: string): string[] {
    const decodedPathname = safeDecodePathname(pathname);
    const withoutLeadingSlash = decodedPathname.replace(/^\/+/, "");
    const normalizedRelativePath = normalize(withoutLeadingSlash).replaceAll("\\", "/");
    const sanitizedRelativePath = stripLeadingParentSegments(normalizedRelativePath);

    if (!sanitizedRelativePath || sanitizedRelativePath === ".") {
        return ["index.html"];
    }

    if (pathname.endsWith("/")) {
        return [joinUrlPath(sanitizedRelativePath, "index.html")];
    }

    if (extname(sanitizedRelativePath)) {
        return [sanitizedRelativePath];
    }

    return [sanitizedRelativePath, joinUrlPath(sanitizedRelativePath, "index.html")];
}

function safeDecodePathname(pathname: string): string {
    try {
        return decodeURIComponent(pathname);
    } catch {
        return pathname;
    }
}

function stripLeadingParentSegments(relativePath: string): string {
    const segments = relativePath.split("/").filter((segment) => segment.length > 0 && segment !== ".");
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
    status = 200,
): Promise<Response | null> {
    const resolvedFilePath = resolve(rootDir, relativePath);
    if (!isPathInsideRoot(rootDir, resolvedFilePath)) {
        return null;
    }

    let fileInfo: Deno.FileInfo;
    try {
        fileInfo = await Deno.stat(resolvedFilePath);
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            return null;
        }

        throw error;
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

    return new Response(await Deno.readFile(resolvedFilePath), { status, headers });
}

function isPathInsideRoot(rootDir: string, filePath: string): boolean {
    const normalizedRoot = ensureTrailingSeparator(resolve(rootDir));
    const normalizedPath = resolve(filePath);
    return normalizedPath.startsWith(normalizedRoot) || normalizedPath === normalizedRoot.slice(0, -1);
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
