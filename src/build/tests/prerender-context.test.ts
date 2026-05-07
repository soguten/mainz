/// <reference lib="deno.ns" />

import { resolve } from "node:path";
import { assertEquals, assertExists } from "@std/assert";
import { normalizeMainzConfig } from "../../config/index.ts";
import { resolveRoutePrerenderContext } from "../prerender-context.ts";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";

Deno.test("build/prerender-context: should resolve manifest, i18n, and dynamic route entries from the shared prerender helper", async () => {
  const fixtureRoot = resolve(
    cliTestsRepoRoot,
    "tests",
    "fixtures",
    "entries-di-build",
  );
  const config = normalizeMainzConfig({
    targets: [
      {
        name: "entries-di-build",
        rootDir: fixtureRoot,
      },
    ],
  });

  const context = await resolveRoutePrerenderContext(
    config,
    {
      target: config.targets[0],
      mode: "ssg",
      profile: {
        name: "production",
        basePath: "/",
      },
    },
    cliTestsRepoRoot,
  );

  assertEquals(context.manifest.routes.map((route) => route.path), [
    "/stories/:slug",
  ]);
  assertEquals(context.targetI18n, {
    defaultLocale: "en",
    localePrefix: "except-default",
    fallbackLocale: "en",
  });
  assertExists(context.buildServiceContainer);

  const route = context.manifest.routes[0];
  assertExists(route);
  const entries = context.routeEntriesByRouteId.get(route.id);
  assertExists(entries);
  assertEquals(entries, [
    {
      locale: "en",
      params: {
        slug: "hello-from-di",
      },
    },
  ]);
});
