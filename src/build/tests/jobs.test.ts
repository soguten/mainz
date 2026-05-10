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
    jobs.map((job) => job.target.name),
    [
      "site",
      "playground",
    ],
  );
});

Deno.test("build/jobs: should filter forced jobs by target", async () => {
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
  });

  assertEquals(jobs.length, 1);
  assertEquals(jobs[0].target.name, "site");
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

  assertEquals(jobs.map((job) => job.target.name), [
    "playground",
  ]);
});

Deno.test("build/jobs: should allow forced builds for an app-only target", async () => {
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
  });

  assertEquals(jobs.map((job) => job.target.name), [
    "playground",
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

  assertEquals(jobs.map((job) => job.target.name), [
    "entries-di-build",
  ]);
});

Deno.test("build/jobs: should keep explicit csr routed apps on a single build job", async () => {
  const config = normalizeMainzConfig({
    targets: [
      {
        name: "routed-di-client-app",
        rootDir: "./tests/test-apps/routed-di-client-app",
      },
    ],
  });

  const jobs = await resolveBuildJobs(config, {});

  assertEquals(jobs.map((job) => job.target.name), [
    "routed-di-client-app",
  ]);
});

Deno.test("build/jobs: should keep undecorated notFound pages on a single build job by default", async () => {
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

  assertEquals(jobs.map((job) => job.target.name), [
    "not-found-csr-default-app-file",
  ]);
});

Deno.test("build/jobs: should keep mixed routed targets on one build job", async () => {
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

  assertEquals(jobs.map((job) => job.target.name), [
    "di-http-site",
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

  assertEquals(jobs.map((job) => job.target.name), [
    "diagnostics-di-imported-app",
  ]);
});

Deno.test("build/jobs: should keep mixed routed targets on one build job when discovery proves both modes", async () => {
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

  assertEquals(jobs.map((job) => job.target.name), [
    "authorize-site",
  ]);
});
