import { statSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import process from "node:process";

export function getDiagnosticsCwd(): string {
  return process.cwd();
}

export async function readDiagnosticsTextFile(path: string): Promise<string> {
  return await readFile(path, "utf8");
}

export async function* readDiagnosticsDir(path: string): AsyncIterable<{
  name: string;
  isFile: boolean;
  isDirectory: boolean;
}> {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    yield {
      name: entry.name,
      isFile: entry.isFile(),
      isDirectory: entry.isDirectory(),
    };
  }
}

export function diagnosticsPathExistsSync(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}
