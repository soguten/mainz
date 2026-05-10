/// <reference lib="deno.ns" />

import { resolve } from "node:path";
import { assertEquals, assertRejects } from "@std/assert";
import { normalizeMainzConfig } from "../../config/index.ts";
import { resolveBuildJobs } from "../jobs.ts";
import { resolveForcedBuildJobs } from "../testing.ts";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";

Deno.test("build/jobs: should derive production jobs from target discovery when target is omitted", async () => {
  const config = normalizeMainzConfig({
    targets: [
      {
        name: "site",
        rootDir: "./site",
        viteConfig: "./vite.config.site.ts",
        appFile: "./site/src/main.tsx",
        appId: "site",
      },
      {
        name: "playground",
        rootDir: "./playground",
        viteConfig: "./vite.config.playground.ts",
      },
    ],
  });

  const jobs = await resolveBuildJobs(config, {});

  assertEquals(
    jobs.map((job) => `${job.target.name}:${job.mode}`),
    [
      "site:ssg",
      "playground:csr",
    ],
  );
});

Deno.test("build/jobs: should filter forced jobs by target and mode", async () => {
  const config = normalizeMainzConfig({
    targets: [
      {
        name: "site",
        rootDir: "./site",
        viteConfig: "./vite.config.site.ts",
        appFile: "./site/src/main.tsx",
        appId: "site",
      },
      {
        name: "playground",
        rootDir: "./playground",
        viteConfig: "./vite.config.playground.ts",
      },
    ],
  });

  const jobs = await resolveForcedBuildJobs(config, {
    target: "site",
    mode: "ssg",
  });

  assertEquals(jobs.length, 1);
  assertEquals(jobs[0].target.name, "site");
  assertEquals(jobs[0].mode, "ssg");
});

Deno.test("build/jobs: should reject unknown forced render mode filters", async () => {
  const config = normalizeMainzConfig({
    targets: [
      {
        name: "site",
        rootDir: "./site",
        viteConfig: "./vite.config.site.ts",
        appFile: "./site/src/main.tsx",
        appId: "site",
      },
    ],
  });

  await assertRejects(
    async () => {
      await resolveForcedBuildJobs(config, {
        target: "site",
        mode: "spa",
      });
    },
    Error,
    'No render modes matched "spa"',
  );
});

Deno.test("build/jobs: should fail for unknown target", async () => {
  const config = normalizeMainzConfig({
    targets: [
      {
        name: "site",
        rootDir: "./site",
        viteConfig: "./vite.config.site.ts",
        appFile: "./site/src/main.tsx",
        appId: "site",
      },
    ],
  });

  await assertRejects(
    async () => {
      await resolveBuildJobs(config, { target: "unknown" });
    },
    Error,
    "No targets matched",
  );
});

Deno.test("build/jobs: should skip ssg jobs for app-only targets with no routes or pages", async () => {
  const config = normalizeMainzConfig({
    targets: [
      {
        name: "playground",
        rootDir: "./playground",
        viteConfig: "./vite.config.playground.ts",
      },
    ],
  });

  const jobs = await resolveBuildJobs(config, {});

  assertEquals(jobs.map((job) => `${job.target.name}:${job.mode}`), [
    "playground:csr",
  ]);
});

Deno.test("build/jobs: should allow internal forced ssg jobs for an app-only target", async () => {
  const config = normalizeMainzConfig({
    targets: [
      {
        name: "playground",
        rootDir: "./playground",
        viteConfig: "./vite.config.playground.ts",
      },
    ],
  });

  const jobs = await resolveForcedBuildJobs(config, {
    target: "playground",
    mode: "ssg",
  });

  assertEquals(jobs.map((job) => `${job.target.name}:${job.mode}`), [
    "playground:ssg",
  ]);
});

Deno.test("build/jobs: should include ssg jobs for routed app targets discovered from the conventional app module", async () => {
  const testAppRoot = resolve(
    cliTestsRepoRoot,
    "tests",
    "test-apps",
    "entries-di-build",
  );
  const config = normalizeMainzConfig({
    targets: [
      {
        name: "entries-di-build",
        rootDir: testAppRoot,
      },
    ],
  });

  const jobs = await resolveBuildJobs(config, {});

  assertEquals(jobs.map((job) => `${job.target.name}:${job.mode}`), [
    "entries-di-build:ssg",
  ]);
});

Deno.test("build/jobs: should keep explicit csr routed apps on the csr build recipe only", async () => {
  const config = normalizeMainzConfig({
    targets: [
      {
        name: "routed-di-client-app",
        rootDir: "./tests/test-apps/routed-di-client-app",
      },
    ],
  });

  const jobs = await resolveBuildJobs(config, {});

  assertEquals(jobs.map((job) => `${job.target.name}:${job.mode}`), [
    "routed-di-client-app:csr",
  ]);
});

Deno.test("build/jobs: should keep undecorated notFound pages on the csr build recipe by default", async () => {
  const testAppRoot = resolve(
    cliTestsRepoRoot,
    "tests",
    "test-apps",
    "not-found-csr-default",
  );
  const config = normalizeMainzConfig({
    targets: [
      {
        name: "not-found-csr-default-app-file",
        rootDir: testAppRoot,
        appFile: resolve(testAppRoot, "src", "main.tsx"),
      },
    ],
  });

  const jobs = await resolveBuildJobs(config, {});

  assertEquals(jobs.map((job) => `${job.target.name}:${job.mode}`), [
    "not-found-csr-default-app-file:csr",
  ]);
});

Deno.test("build/jobs: should keep mixed routed targets when undecorated pages default to csr but notFound stays ssg", async () => {
  const config = normalizeMainzConfig({
    targets: [
      {
        name: "di-http-site",
        rootDir: "./examples/di-http-site",
        viteConfig: "./vite.config.di-http-site.ts",
        appFile: "./examples/di-http-site/src/app.ts",
        appId: "site",
      },
    ],
  });

  const jobs = await resolveBuildJobs(config, {});

  assertEquals(jobs.map((job) => `${job.target.name}:${job.mode}`), [
    "di-http-site:csr",
    "di-http-site:ssg",
  ]);
});

Deno.test("build/jobs: should fail when routed app discovery is ambiguous without appId", async () => {
  const testAppRoot = resolve(
    cliTestsRepoRoot,
    "tests",
    "test-apps",
    "diagnostics-multi-app",
  );
  const config = normalizeMainzConfig({
    targets: [
      {
        name: "diagnostics-multi-app",
        rootDir: testAppRoot,
        appFile: resolve(testAppRoot, "src", "main.tsx"),
      },
    ],
  });

  await assertRejects(
    () => resolveBuildJobs(config, {}),
    Error,
    "found multiple routed apps",
  );
});

Deno.test("build/jobs: should keep imported routed app definitions on the default csr recipe when discovery finds only undecorated pages", async () => {
  const testAppRoot = resolve(
    cliTestsRepoRoot,
    "tests",
    "test-apps",
    "diagnostics-di-imported-app",
  );
  const config = normalizeMainzConfig({
    targets: [
      {
        name: "diagnostics-di-imported-app",
        rootDir: testAppRoot,
      },
    ],
  });

  const jobs = await resolveBuildJobs(config, {});

  assertEquals(jobs.map((job) => `${job.target.name}:${job.mode}`), [
    "diagnostics-di-imported-app:csr",
  ]);
});

Deno.test("build/jobs: should keep mixed routed targets on both build recipes when discovery proves both modes", async () => {
  const config = normalizeMainzConfig({
    targets: [
      {
        name: "authorize-site",
        rootDir: "./examples/authorize-site",
        viteConfig: "./vite.config.authorize-site.ts",
        appFile: "./examples/authorize-site/src/main.tsx",
        appId: "authorize-site",
      },
    ],
  });

  const jobs = await resolveBuildJobs(config, {});

  assertEquals(jobs.map((job) => `${job.target.name}:${job.mode}`), [
    "authorize-site:csr",
    "authorize-site:ssg",
  ]);
});
