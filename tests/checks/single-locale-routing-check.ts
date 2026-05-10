/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { withHappyDom } from "../../src/ssg/happy-dom.ts";
import { waitFor } from "../../src/testing/async-testing.ts";
import { buildSingleLocaleRoutedAppForNavigation } from "../helpers/build.ts";
import {
  describeBuiltOutput,
  extractModuleScriptSrc,
  isCsrBuiltOutput,
  isSsgBuiltOutput,
  loadBuiltRoutePreview,
  resolveOutputHtmlPath,
  resolveOutputScriptPath,
} from "../helpers/built-output-io.ts";
import { waitForNextNavigationReady } from "../helpers/navigation.ts";
import type {
  TestBuildContext,
  TestNavigationMode,
  TestScenarioBuildContext,
} from "../helpers/types.ts";

export async function runSingleLocaleRoutingCheck(args: {
  navigation: TestNavigationMode;
}): Promise<void> {
  const context = await buildSingleLocaleRoutedAppForNavigation(
    args.navigation,
  );

  try {
    await assertRootRoute(context);
    await assertHomeLinks(context);
    await assertDocsRoute(context);
  } finally {
    await context.cleanup?.();
  }
}

async function assertRootRoute(args: TestScenarioBuildContext): Promise<void> {
  const rootBuild = requireRouteBuild(args, "/");
  const outputDir = rootBuild.outputDir;
  const rootHtmlPath = resolve(outputDir, "index.html");
  const html = await Deno.readTextFile(rootHtmlPath);
  const rootBuildOutput = describeBuiltOutput(rootBuild.outputDir);

  if (isCsrBuiltOutput(rootBuild.outputDir) && args.navigation === "spa") {
    const scriptSrc = extractModuleScriptSrc(html);
    assert(
      scriptSrc,
      "Could not find single-locale CSR SPA root module script.",
    );

    const scriptPath = resolveOutputScriptPath({
      outputDir,
      htmlPath: rootHtmlPath,
      scriptSrc,
    });
    await Deno.stat(scriptPath);

    await withHappyDom(async (window) => {
      overrideGlobalNavigatorLocale("en-US");
      document.write(html);
      document.close();

      const navigationReady = waitForNextNavigationReady({
        mode: "spa",
        locale: "en",
        navigationType: "initial",
      });
      await import(
        `${
          pathToFileURL(scriptPath).href
        }?e2e=${Date.now()}-${rootBuildOutput}-${args.navigation}-root`
      );
      await navigationReady;
      await waitFor(
        () =>
          document.documentElement.dataset.mainzNavigation === "spa" &&
          document.documentElement.lang === "en" &&
          window.location.pathname === "/",
        "Expected the single-locale SPA root route to stay at / after bootstrap.",
      );
    }, { url: "https://mainz.local/" });

    return;
  }

  await withHappyDom(async (window) => {
    overrideNavigatorLocale(window.navigator, "en-US");
    document.write(html);
    document.close();
    assertEquals(window.location.pathname, "/");
  }, { url: "https://mainz.local/" });
}

async function assertHomeLinks(args: TestScenarioBuildContext): Promise<void> {
  const routeBuild = requireRouteBuild(args, "/");
  const fixture = await resolveRouteFixture(routeBuild, "/");
  const routeBuildOutput = describeBuiltOutput(routeBuild.outputDir);
  const scriptSrc = extractModuleScriptSrc(fixture.html);
  assert(
    scriptSrc,
    `Could not find single-locale module script for ${routeBuildOutput} + ${args.navigation} (/).`,
  );

  const scriptPath = resolveOutputScriptPath({
    outputDir: fixture.outputDir,
    htmlPath: fixture.htmlPath,
    scriptSrc,
  });
  await Deno.stat(scriptPath);

  await withHappyDom(async () => {
    document.write(fixture.html);
    document.close();

    const navigationReady = waitForNextNavigationReady({
      mode: args.navigation,
      locale: "en",
      navigationType: "initial",
    });
    await import(
      `${
        pathToFileURL(scriptPath).href
      }?e2e=${Date.now()}-${routeBuildOutput}-${args.navigation}-home`
    );
    await navigationReady;
    await waitFor(
      () =>
        document.documentElement.dataset.mainzNavigation === args.navigation &&
        document.documentElement.lang === "en" &&
        readAnchorHref("Overview") === "/" &&
        readAnchorHref("Guides") === "/quickstart" &&
        readAnchorHref("Reference") === "/reference",
      `Expected ${routeBuildOutput} + ${args.navigation} single-locale home links to stay unprefixed.`,
    );

    assertEquals(document.documentElement.lang, "en");
    assertEquals(readAnchorHref("Overview"), "/");
    assertEquals(readAnchorHref("Guides"), "/quickstart");
    assertEquals(readAnchorHref("Reference"), "/reference");
    assert(document.querySelector('a[href="/quickstart"]'));

    if (args.navigation === "spa") {
      const guidesLink = Array.from(document.querySelectorAll("a"))
        .find((anchor) => anchor.textContent?.trim() === "Guides");
      assert(guidesLink instanceof HTMLElement);

      guidesLink.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
      );
      await waitFor(() =>
        window.location.pathname === "/quickstart" &&
        (document.body.textContent ?? "").includes("Why Mainz")
      );
    }
  }, { url: "https://mainz.local/" });
}

async function assertDocsRoute(args: TestScenarioBuildContext): Promise<void> {
  const routeBuild = requireRouteBuild(args, "/quickstart");
  const fixture = await resolveRouteFixture(routeBuild, "/quickstart");
  const routeBuildOutput = describeBuiltOutput(routeBuild.outputDir);
  const scriptSrc = extractModuleScriptSrc(fixture.html);
  assert(
    scriptSrc,
    `Could not find single-locale module script for ${routeBuildOutput} + ${args.navigation} (/quickstart).`,
  );

  const scriptPath = resolveOutputScriptPath({
    outputDir: fixture.outputDir,
    htmlPath: fixture.htmlPath,
    scriptSrc,
  });
  await Deno.stat(scriptPath);

  if (fixture.responseStatus !== undefined) {
    assertEquals(fixture.responseStatus, 200);
  }

  await withHappyDom(async () => {
    document.write(fixture.html);
    document.close();

    const navigationReady = waitForNextNavigationReady({
      mode: args.navigation,
      locale: "en",
      navigationType: "initial",
    });
    await import(
      `${
        pathToFileURL(scriptPath).href
      }?e2e=${Date.now()}-${routeBuildOutput}-${args.navigation}-quickstart`
    );
    await navigationReady;
    await waitFor(
      () =>
        document.documentElement.dataset.mainzNavigation === args.navigation &&
        document.documentElement.lang === "en" &&
        (document.body.textContent ?? "").includes("Why Mainz") &&
        (document.body.textContent ?? "").includes("Create your first page") &&
        readAnchorHref("Guides") === "/quickstart",
      `Expected ${routeBuildOutput} + ${args.navigation} docs route to finish bootstrapping at /quickstart.`,
    );

    assertEquals(document.documentElement.lang, "en");
    assertStringIncludes(document.body.textContent ?? "", "Why Mainz");
    assertStringIncludes(
      document.body.textContent ?? "",
      "Create your first page",
    );
    assert(!(document.body.textContent ?? "").includes("Document not found"));
    assertEquals(readAnchorHref("Guides"), "/quickstart");
  }, { url: "https://mainz.local/quickstart" });
}

async function resolveRouteFixture(
  build: TestBuildContext,
  routePath: string,
): Promise<
  { html: string; htmlPath: string; outputDir: string; responseStatus?: number }
> {
  return await loadBuiltRoutePreview({
    outputDir: build.outputDir,
    navigationMode: build.navigation,
    requestUrl: `http://127.0.0.1:4175${routePath}`,
    resolveHtmlPath(responseStatus) {
      return responseStatus === 404
        ? resolve(build.outputDir, "404.html")
        : resolveOutputHtmlPath(build.outputDir, routePath);
    },
  });
}

function requireRouteBuild(
  context: TestScenarioBuildContext,
  routePath: string,
): TestBuildContext {
  const availableBuilds = context.availableBuilds;
  if (availableBuilds.length === 1) {
    return availableBuilds[0];
  }

  const ssgBuild = availableBuilds.find((build) =>
    isSsgBuiltOutput(build.outputDir)
  );
  if (ssgBuild && routeHtmlExists(ssgBuild, routePath)) {
    return ssgBuild;
  }

  const csrBuild = availableBuilds.find((build) =>
    isCsrBuiltOutput(build.outputDir)
  );
  if (csrBuild && routeHtmlExists(csrBuild, routePath)) {
    return csrBuild;
  }

  if (context.navigation === "spa" && csrBuild) {
    return csrBuild;
  }

  if (csrBuild) {
    return csrBuild;
  }

  if (ssgBuild) {
    return ssgBuild;
  }

  throw new Error(
    `Expected at least one build output for single-locale routing (${context.navigation}).`,
  );
}

function routeHtmlExists(
  build: TestBuildContext,
  routePath: string,
): boolean {
  try {
    Deno.statSync(resolveOutputHtmlPath(build.outputDir, routePath));
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }

    throw error;
  }
}

function readAnchorHref(label: string): string | null {
  const anchor = Array.from(document.querySelectorAll("a"))
    .find((candidate) => candidate.textContent?.trim() === label);
  return anchor?.getAttribute("href") ?? null;
}

function overrideNavigatorLocale(
  navigatorLike: {
    language?: string;
    languages?: readonly string[];
  },
  locale: string,
): void {
  Object.defineProperty(navigatorLike, "language", {
    configurable: true,
    value: locale,
  });

  Object.defineProperty(navigatorLike, "languages", {
    configurable: true,
    value: [locale],
  });
}

function overrideGlobalNavigatorLocale(locale: string): void {
  const navigatorProxy = Object.create(navigator);

  Object.defineProperty(navigatorProxy, "language", {
    configurable: true,
    value: locale,
  });

  Object.defineProperty(navigatorProxy, "languages", {
    configurable: true,
    value: [locale],
  });

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    writable: true,
    value: navigatorProxy,
  });
}
