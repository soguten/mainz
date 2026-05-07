import { resolve } from "node:path";
import type { MainzToolingRuntime } from "../tooling/runtime/index.ts";
import { resolveMainzTempPath } from "../tooling/temp-paths.ts";

export interface GeneratedViteConfigArtifact {
  dir: string;
  path: string;
  fingerprint: string;
}

const generatedViteConfigBanner = "// @mainz-generated-vite-config";

export async function materializeGeneratedViteConfigFile(args: {
  artifactDir: string;
  runtime: MainzToolingRuntime;
  moduleSource: string;
  fileName?: string;
}): Promise<GeneratedViteConfigArtifact> {
  const artifactDir = resolve(args.artifactDir);
  const artifactPath = resolve(artifactDir, args.fileName ?? "vite.config.ts");
  const fingerprint = await fingerprintText(args.moduleSource);

  await args.runtime.mkdir(artifactDir, { recursive: true });

  const existingSource = await readTextFileIfExists(artifactPath, args.runtime);
  if (existingSource !== undefined) {
    if (!isManagedGeneratedViteConfigSource(existingSource)) {
      throw new Error(
        `Refusing to overwrite existing generated Vite config artifact at "${artifactPath}". ` +
          `Remove it before using the generated config again.`,
      );
    }

    if (existingSource === args.moduleSource) {
      return {
        dir: artifactDir,
        path: artifactPath,
        fingerprint,
      };
    }
  }

  await args.runtime.writeTextFile(artifactPath, args.moduleSource);

  return {
    dir: artifactDir,
    path: artifactPath,
    fingerprint,
  };
}

export function resolveGeneratedViteConfigArtifactDir(args: {
  cwd: string;
  targetName: string;
  runtimeName: MainzToolingRuntime["name"];
}): string {
  return resolveMainzTempPath(
    args.cwd,
    "vite-configs",
    args.targetName,
    args.runtimeName,
  );
}

async function fingerprintText(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .slice(0, 12)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function fileExists(
  path: string,
  runtime: MainzToolingRuntime,
): Promise<boolean> {
  try {
    const stat = await runtime.stat(path);
    return stat.isFile;
  } catch {
    return false;
  }
}

async function readTextFileIfExists(
  path: string,
  runtime: MainzToolingRuntime,
): Promise<string | undefined> {
  if (!(await fileExists(path, runtime))) {
    return undefined;
  }

  return await runtime.readTextFile(path);
}

function isManagedGeneratedViteConfigSource(source: string): boolean {
  return source.startsWith(generatedViteConfigBanner);
}
