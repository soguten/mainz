/// <reference lib="deno.ns" />

import { assertEquals, assertThrows } from "@std/assert";
import { normalizeMainzConfig } from "../../config/index.ts";
import { resolveBuildJobs } from "../build.ts";

Deno.test("cli/build: should create full matrix when target and mode are omitted", () => {
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "site",
                rootDir: "./site",
                viteConfig: "./vite.config.site.ts",
                routes: "./site/routes.ts",
            },
            {
                name: "playground",
                rootDir: "./playground",
                viteConfig: "./vite.config.playground.ts",
                routes: "./playground/routes.ts",
            },
        ],
        render: {
            modes: ["spa", "ssg"],
        },
    });

    const jobs = resolveBuildJobs(config, {});

    assertEquals(
        jobs.map((job) => `${job.target.name}:${job.mode}`),
        [
            "site:csr",
            "site:ssg",
            "playground:csr",
            "playground:ssg",
        ],
    );
});

Deno.test("cli/build: should filter jobs by target and mode", () => {
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "site",
                rootDir: "./site",
                viteConfig: "./vite.config.site.ts",
                routes: "./site/routes.ts",
            },
            {
                name: "playground",
                rootDir: "./playground",
                viteConfig: "./vite.config.playground.ts",
                routes: "./playground/routes.ts",
            },
        ],
        render: {
            modes: ["spa", "ssg"],
        },
    });

    const jobs = resolveBuildJobs(config, {
        target: "playground",
        mode: "ssg",
    });

    assertEquals(jobs.length, 1);
    assertEquals(jobs[0].target.name, "playground");
    assertEquals(jobs[0].mode, "ssg");
});

Deno.test("cli/build: should accept spa as a legacy mode alias for csr", () => {
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "site",
                rootDir: "./site",
                viteConfig: "./vite.config.site.ts",
                routes: "./site/routes.ts",
            },
        ],
        render: {
            modes: ["csr", "ssg"],
        },
    });

    const jobs = resolveBuildJobs(config, {
        target: "site",
        mode: "spa",
    });

    assertEquals(jobs.length, 1);
    assertEquals(jobs[0].mode, "csr");
});

Deno.test("cli/build: should fail for unknown target", () => {
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "site",
                rootDir: "./site",
                viteConfig: "./vite.config.site.ts",
                routes: "./site/routes.ts",
            },
        ],
    });

    assertThrows(() => {
        resolveBuildJobs(config, { target: "unknown" });
    }, Error, "No targets matched");
});
