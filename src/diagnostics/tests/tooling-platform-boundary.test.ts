/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { relative, resolve } from "node:path";

interface DenoReferenceViolation {
    file: string;
    line: number;
    text: string;
}

const PLATFORM_BOUNDARY_SCOPES = [
    "src/build",
    "src/config",
    "src/routing/target-page-discovery.ts",
] as const;

Deno.test("diagnostics/boundary: central tooling modules should not reference Deno directly", async () => {
    const violations: DenoReferenceViolation[] = [];

    for (const scope of PLATFORM_BOUNDARY_SCOPES) {
        const absoluteScope = resolve(Deno.cwd(), scope);
        const stat = await Deno.stat(absoluteScope);
        const files = stat.isDirectory ? await collectSourceFiles(absoluteScope) : [absoluteScope];

        for (const file of files) {
            if (isAllowedPlatformBoundaryFile(file)) {
                continue;
            }

            const source = await Deno.readTextFile(file);
            const lines = source.split(/\r?\n/);

            for (let index = 0; index < lines.length; index += 1) {
                if (!lines[index]?.includes("Deno.")) {
                    continue;
                }

                violations.push({
                    file: normalizePathSlashes(relative(Deno.cwd(), file)),
                    line: index + 1,
                    text: lines[index]!.trim(),
                });
            }
        }
    }

    assertEquals(violations, []);
});

async function collectSourceFiles(directory: string): Promise<string[]> {
    const files: string[] = [];

    for await (const entry of Deno.readDir(directory)) {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory) {
            files.push(...await collectSourceFiles(path));
            continue;
        }

        if (!entry.isFile || !/\.(ts|tsx)$/.test(path)) {
            continue;
        }

        files.push(path);
    }

    return files;
}

function isAllowedPlatformBoundaryFile(file: string): boolean {
    const normalized = normalizePathSlashes(file);
    return normalized.includes("/tests/") ||
        normalized.includes("/tooling/platform/") ||
        normalized.includes("/cli/");
}

function normalizePathSlashes(path: string): string {
    return path.replaceAll("\\", "/");
}
