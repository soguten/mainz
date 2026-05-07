import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { NormalizedMainzTarget } from "../../config/index.ts";
import type { DiagnosticsSourceInput } from "./target-model.ts";

export async function discoverTargetSourceInputs(
  target: NormalizedMainzTarget,
  cwd: string,
): Promise<readonly DiagnosticsSourceInput[]> {
  const files = await collectTargetSourceFiles(target, cwd);
  const sources: DiagnosticsSourceInput[] = [];

  for (const file of files) {
    sources.push({
      file,
      source: await Deno.readTextFile(file),
    });
  }

  return sources;
}

async function collectTargetSourceFiles(
  target: NormalizedMainzTarget,
  cwd: string,
): Promise<readonly string[]> {
  const sourceDir = resolve(cwd, target.rootDir, "src");
  if (!existsSync(sourceDir)) {
    return [];
  }

  const files = await collectFilesystemFiles(sourceDir);
  return files.filter((file) => {
    if (!/\.(ts|tsx|mts|cts)$/.test(file)) {
      return false;
    }

    return !/(\.test\.|\.fixture\.)/.test(file);
  });
}

async function collectFilesystemFiles(directory: string): Promise<string[]> {
  const filePaths: string[] = [];

  for await (const entry of Deno.readDir(directory)) {
    const absolutePath = resolve(directory, entry.name);

    if (entry.isDirectory) {
      const nested = await collectFilesystemFiles(absolutePath);
      filePaths.push(...nested);
      continue;
    }

    if (!entry.isFile) continue;
    filePaths.push(normalizePathSlashes(absolutePath));
  }

  return filePaths;
}

function normalizePathSlashes(path: string): string {
  return path.replaceAll("\\", "/");
}
