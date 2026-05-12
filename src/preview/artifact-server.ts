import { resolve } from "node:path";
import { createBuildArtifactHandler } from "../build/artifact-handler.ts";
import { serveBuildArtifacts } from "../server/index.ts";

export interface ArtifactPreviewServerOptions {
  rootDir: string;
  host?: string;
  port?: number;
}

export function createArtifactPreviewHandler(
  rootDir: string,
): (request: Request) => Promise<Response> {
  return createBuildArtifactHandler({
    rootDir,
    ssrResponseHeaders: ({ cacheKey }) => ({
      "x-mainz-preview-render-mode": "ssr",
      "x-mainz-preview-cache-key": cacheKey,
    }),
  });
}

export function serveArtifactPreview(
  options: ArtifactPreviewServerOptions,
): Deno.HttpServer<Deno.NetAddr> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 4173;
  return serveBuildArtifacts({
    rootDir: options.rootDir,
    host,
    port,
    ssrResponseHeaders: ({ cacheKey }) => ({
      "x-mainz-preview-render-mode": "ssr",
      "x-mainz-preview-cache-key": cacheKey,
    }),
    onListen: ({ hostname, port }) => {
      console.log(
        `[mainz] Previewing build artifact output from ${
          resolve(options.rootDir)
        } on http://${hostname}:${port}/`,
      );
    },
  });
}
