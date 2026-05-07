import { dirname, resolve } from "node:path";
import { createArtifactPreviewHandler } from "../../src/preview/artifact-server.ts";
import type { TestNavigationMode, TestRenderMode } from "./types.ts";

export function extractModuleScriptSrc(html: string): string | null {
  const match = html.match(
    /<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/i,
  );
  return match?.[1] ?? null;
}

export function resolveOutputScriptPath(args: {
  outputDir: string;
  scriptSrc: string;
  htmlPath?: string;
  basePath?: string;
}): string {
  if (args.scriptSrc.startsWith("/")) {
    if (args.basePath) {
      const normalizedBasePath = args.basePath.replace(/\/+$/, "/");
      const sourceWithoutBasePath =
        args.scriptSrc.startsWith(normalizedBasePath)
          ? args.scriptSrc.slice(normalizedBasePath.length - 1)
          : args.scriptSrc;
      return resolve(args.outputDir, `.${sourceWithoutBasePath}`);
    }

    return resolve(args.outputDir, `.${args.scriptSrc}`);
  }

  return resolve(
    args.htmlPath ? dirname(args.htmlPath) : args.outputDir,
    args.scriptSrc,
  );
}

export function resolveOutputHtmlPath(
  outputDir: string,
  routePath: string,
): string {
  const normalizedPath = routePath.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!normalizedPath) {
    return resolve(outputDir, "index.html");
  }

  return resolve(outputDir, normalizedPath, "index.html");
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await Deno.readTextFile(filePath)) as T;
}

export async function resolveDirectLoadFixture(args: {
  outputDir: string;
  renderMode: TestRenderMode;
  navigationMode: TestNavigationMode;
  documentHtmlPath: string;
  spaHtmlPath?: string;
  url?: string;
}): Promise<{
  html: string;
  htmlPath: string;
  outputDir: string;
  url?: string;
}> {
  const htmlPath = resolve(
    args.outputDir,
    args.renderMode === "csr" && args.navigationMode === "spa"
      ? args.spaHtmlPath ?? "index.html"
      : args.documentHtmlPath,
  );

  return {
    html: await Deno.readTextFile(htmlPath),
    htmlPath,
    outputDir: args.outputDir,
    url: args.url,
  };
}

export async function resolvePreviewFixture(args: {
  outputDir: string;
  renderMode: TestRenderMode;
  navigationMode: TestNavigationMode;
  requestUrl: string;
  resolveHtmlPath(responseStatus: number): string;
  spaHtmlPath?: string;
}): Promise<{
  html: string;
  htmlPath: string;
  outputDir: string;
  responseStatus?: number;
}> {
  if (args.renderMode === "csr" && args.navigationMode === "spa") {
    const fixture = await resolveDirectLoadFixture({
      outputDir: args.outputDir,
      renderMode: args.renderMode,
      navigationMode: args.navigationMode,
      documentHtmlPath: args.resolveHtmlPath(200),
      spaHtmlPath: args.spaHtmlPath,
    });

    return {
      html: fixture.html,
      htmlPath: fixture.htmlPath,
      outputDir: fixture.outputDir,
    };
  }

  const handler = createArtifactPreviewHandler(args.outputDir);
  const response = await handler(new Request(args.requestUrl));
  const htmlPath = args.resolveHtmlPath(response.status);

  return {
    html: await Deno.readTextFile(htmlPath),
    htmlPath,
    outputDir: args.outputDir,
    responseStatus: response.status,
  };
}
