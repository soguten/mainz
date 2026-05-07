/// <reference lib="deno.ns" />

import { Window } from "happy-dom";
import {
  createTestScreen,
  type TestScreen,
} from "../../src/testing/test-screen.ts";
import { disposeHappyDomWindow } from "../../src/ssg/happy-dom.ts";
import {
  extractModuleScriptSrc,
  resolveDirectLoadFixture,
  resolveOutputHtmlPath,
  resolveOutputScriptPath,
  resolvePreviewFixture,
} from "../helpers/fixture-io.ts";
import { waitForNextNavigationReady } from "../helpers/navigation.ts";
import type {
  MatrixArtifact,
  MatrixNavigation,
  MatrixRender,
} from "./harness.ts";
import { assert } from "@std/assert";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const GLOBAL_DOM_KEYS = [
  "window",
  "document",
  "customElements",
  "navigator",
  "location",
  "Node",
  "Element",
  "HTMLElement",
  "DocumentFragment",
  "Text",
  "Event",
  "EventTarget",
  "CustomEvent",
  "MutationObserver",
  "IntersectionObserver",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "requestIdleCallback",
  "cancelIdleCallback",
  "getComputedStyle",
  "HTMLInputElement",
  "MouseEvent",
  "HTMLTextAreaElement",
  "HTMLSelectElement",
  "HTMLOptionElement",
  "SVGElement",
  "SVGSVGElement",
  "SVGPathElement",
] as const;

type GlobalDomKey = (typeof GLOBAL_DOM_KEYS)[number];
type MatrixDomSession = {
  window: Window;
  cleanup(): void;
};

let matrixDomLock: Promise<void> = Promise.resolve();

export type ResolvedFixture = {
  id: string;
  readHtml(artifact: MatrixArtifact, routePath: string): Promise<string>;
  readJson<T>(artifact: MatrixArtifact, file: string): Promise<T>;
  loadDocument(args: {
    artifact: MatrixArtifact;
    documentHtmlPath: string;
    url: string;
  }): Promise<{
    html: string;
    htmlPath: string;
    outputDir: string;
    url?: string;
  }>;
  resolveHtmlPath(artifact: MatrixArtifact, routePath: string): string;
  preview(artifact: MatrixArtifact, routePath: string): Promise<{
    html: string;
    htmlPath: string;
    outputDir: string;
    responseStatus?: number;
  }>;
  renderDocument(args: {
    artifact: MatrixArtifact;
    documentHtmlPath: string;
    url: string;
    basePath?: string;
    navigationReady?: {
      locale?: string;
      path?: string;
      matchedPath?: string;
      navigationType?: "initial" | "push" | "pop";
    };
  }): Promise<TestScreen<Element>>;
  render(
    artifact: MatrixArtifact,
    routePath: string,
  ): Promise<TestScreen<Element>>;
};

export async function readBuiltRouteHtml(
  artifact: MatrixArtifact,
  routePath: string,
): Promise<string> {
  const htmlPath = resolveOutputHtmlPath(artifact.context.outputDir, routePath);
  return await Deno.readTextFile(htmlPath);
}

export function resolveBuiltRouteHtmlPath(
  artifact: MatrixArtifact,
  routePath: string,
): string {
  return resolveOutputHtmlPath(artifact.context.outputDir, routePath);
}

export async function readBuiltJsonFile<T>(
  artifact: MatrixArtifact,
  file: string,
): Promise<T> {
  return JSON.parse(
    await Deno.readTextFile(`${artifact.context.outputDir}/${file}`),
  ) as T;
}

export async function loadBuiltDocument(args: {
  artifact: MatrixArtifact;
  documentHtmlPath: string;
  url: string;
}): Promise<{
  html: string;
  htmlPath: string;
  outputDir: string;
  url?: string;
}> {
  return await resolveDirectLoadFixture({
    outputDir: args.artifact.context.outputDir,
    renderMode: args.artifact.recipe.render,
    navigationMode: args.artifact.recipe.navigation,
    documentHtmlPath: args.documentHtmlPath,
    url: args.url,
  });
}

// Route rendering resolves the route through the built artifact's preview path.
// This is the default authoring path when the test intent is "open this route".
export async function renderBuiltRoute(
  artifact: MatrixArtifact,
  routePath: string,
): Promise<TestScreen<Element>> {
  const fixture = await previewBuiltRoute(artifact, routePath);
  const scriptSrc = extractModuleScriptSrc(fixture.html);

  assert(
    scriptSrc,
    `Could not find module script src for ${artifact.recipe.render} + ${artifact.recipe.navigation} (${routePath}).`,
  );

  const scriptPath = resolveOutputScriptPath({
    outputDir: fixture.outputDir,
    htmlPath: fixture.htmlPath,
    scriptSrc,
  });
  await Deno.stat(scriptPath);

  const session = await createMatrixDomSession(toFixtureUrl(routePath));

  try {
    document.write(fixture.html);
    document.close();

    const navigationReady = waitForNextNavigationReady({
      mode: artifact.recipe.navigation,
      navigationType: "initial",
    });
    await import(
      `${
        pathToFileURL(scriptPath).href
      }?matrix=${Date.now()}-${artifact.recipe.render}-${artifact.recipe.navigation}-${
        encodeURIComponent(routePath)
      }`
    );
    await navigationReady;

    const appRoot = document.querySelector("#app");
    assert(
      appRoot instanceof HTMLElement,
      `Expected #app container while rendering ${routePath}.`,
    );

    return createTestScreen(appRoot, appRoot, {
      cleanup: () => session.cleanup(),
    });
  } catch (error) {
    session.cleanup();
    throw error;
  }
}

// Document rendering opens a concrete emitted HTML file directly.
// Use this when the physical document path matters, such as basePath and 404 cases.
export async function renderBuiltDocument(args: {
  artifact: MatrixArtifact;
  documentHtmlPath: string;
  url: string;
  basePath?: string;
  navigationReady?: {
    locale?: string;
    path?: string;
    matchedPath?: string;
    navigationType?: "initial" | "push" | "pop";
  };
}): Promise<TestScreen<Element>> {
  const fixture = await loadBuiltDocument({
    artifact: args.artifact,
    documentHtmlPath: args.documentHtmlPath,
    url: args.url,
  });
  const scriptSrc = extractModuleScriptSrc(fixture.html);

  assert(
    scriptSrc,
    `Could not find module script src for ${args.artifact.recipe.render} + ${args.artifact.recipe.navigation} (${args.documentHtmlPath}).`,
  );

  const scriptPath = resolveOutputScriptPath({
    outputDir: fixture.outputDir,
    htmlPath: fixture.htmlPath,
    scriptSrc,
    basePath: args.basePath,
  });
  await Deno.stat(scriptPath);

  const session = await createMatrixDomSession(args.url);

  try {
    document.write(fixture.html);
    document.close();

    const navigationReady = waitForNextNavigationReady({
      mode: args.artifact.recipe.navigation,
      locale: args.navigationReady?.locale,
      path: args.navigationReady?.path,
      matchedPath: args.navigationReady?.matchedPath,
      navigationType: args.navigationReady?.navigationType ?? "initial",
    });
    await import(
      `${
        pathToFileURL(scriptPath).href
      }?matrix-document=${Date.now()}-${args.artifact.recipe.render}-${args.artifact.recipe.navigation}-${
        encodeURIComponent(args.documentHtmlPath)
      }`
    );
    await navigationReady;

    const appRoot = document.querySelector("#app");
    assert(
      appRoot instanceof HTMLElement,
      `Expected #app container while rendering ${args.documentHtmlPath}.`,
    );

    return createTestScreen(appRoot, appRoot, {
      cleanup: () => session.cleanup(),
    });
  } catch (error) {
    session.cleanup();
    throw error;
  }
}

export async function withFixtureDom<T>(
  url: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  const session = await createMatrixDomSession(url);

  try {
    return await fn();
  } finally {
    session.cleanup();
  }
}

export async function previewBuiltRoute(
  artifact: MatrixArtifact,
  routePath: string,
): Promise<{
  html: string;
  htmlPath: string;
  outputDir: string;
  responseStatus?: number;
}> {
  const outputDir = artifact.context.outputDir;
  return await resolvePreviewFixture({
    outputDir,
    renderMode: artifact.recipe.render,
    navigationMode: artifact.recipe.navigation,
    requestUrl: `http://127.0.0.1:4173${routePath}`,
    resolveHtmlPath(responseStatus: number | undefined) {
      return responseStatus === 404
        ? resolve(outputDir, "404.html")
        : resolveOutputHtmlPath(outputDir, routePath);
    },
  });
}

async function createMatrixDomSession(url: string): Promise<MatrixDomSession> {
  const releaseLock = await acquireMatrixDomLock();
  const window = new Window({ url });
  const previousValues = new Map<GlobalDomKey, unknown>();

  for (const key of GLOBAL_DOM_KEYS) {
    previousValues.set(key, (globalThis as Record<string, unknown>)[key]);
    (globalThis as Record<string, unknown>)[key] =
      (window as unknown as Record<string, unknown>)[key];
  }

  const extendedWindow = window as unknown as Window & {
    requestIdleCallback?: (callback: IdleRequestCallback) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (!extendedWindow.requestIdleCallback) {
    extendedWindow.requestIdleCallback = (callback: IdleRequestCallback) => {
      return setTimeout(() => {
        callback({
          didTimeout: false,
          timeRemaining: () => 0,
        });
      }, 0);
    };
  }

  if (!extendedWindow.cancelIdleCallback) {
    extendedWindow.cancelIdleCallback = (handle: number) => {
      clearTimeout(handle);
    };
  }

  const previousRuntime =
    (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__;
  (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__ = "build";

  let cleanedUp = false;

  return {
    window,
    cleanup() {
      if (cleanedUp) {
        return;
      }

      cleanedUp = true;

      if (previousRuntime === undefined) {
        delete (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__;
      } else {
        (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__ =
          previousRuntime;
      }

      for (const key of GLOBAL_DOM_KEYS) {
        const previous = previousValues.get(key);
        if (previous === undefined) {
          delete (globalThis as Record<string, unknown>)[key];
          continue;
        }

        (globalThis as Record<string, unknown>)[key] = previous;
      }

      disposeHappyDomWindow(window);
      releaseLock();
    },
  };
}

async function acquireMatrixDomLock(): Promise<() => void> {
  const previousLock = matrixDomLock;
  let releaseLock!: () => void;
  matrixDomLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  await previousLock;
  return releaseLock;
}

function toFixtureUrl(routePath: string): string {
  return new URL(routePath, "https://mainz.local").href;
}
