/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";
import { runMainzCliCommand } from "../../../tests/helpers/cli.ts";

Deno.test("cli/mainz: publish-info should print artifact metadata resolved from a target profile", async () => {
  const { stdout } = await runMainzCliCommand(
    ["publish-info", "--target", "site", "--profile", "gh-pages"],
    "publish-info failed.",
  );
  const metadata = JSON.parse(stdout);

  assertEquals(metadata.target, "site");
  assertEquals(metadata.profile, "gh-pages");
  assertEquals(metadata.outDir, "dist/site");
  assertEquals(metadata.basePath, "/");
  assertEquals(metadata.navigation, "mpa");
  assertEquals(metadata.capabilities, {
    artifactClass: "browser-only",
    serverRuntimeRequired: false,
  });
  assertEquals(metadata.browser, {
    outDir: "dist/site/browser",
    routesManifestPath: "dist/site/browser/routes.json",
    hydrationManifestPath: "dist/site/browser/hydration.json",
    indexHtmlPath: "dist/site/browser/index.html",
  });
  assertEquals(metadata.server, {
    outDir: "dist/site/server",
    ssrManifestPath: "dist/site/server/ssr-manifest.json",
    entryPath: "dist/site/server/app.mjs",
  });
});
