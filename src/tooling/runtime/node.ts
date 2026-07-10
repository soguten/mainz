import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import process from "node:process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "npm:tsx@4.22.4/esm/api";
import { dynamicImport } from "../dynamic-import.ts";
import type {
  MainzToolingRuntime,
  ToolingCommand,
  ToolingCommandResult,
  ToolingDirEntry,
  ToolingFileStat,
  ToolingViteCommandOptions,
} from "./types.ts";

function toNodeStdio(
  value:
    | ToolingCommand["stdin"]
    | ToolingCommand["stdout"]
    | ToolingCommand["stderr"],
): "inherit" | "ignore" | "pipe" {
  switch (value) {
    case "null":
      return "ignore";
    case "piped":
      return "pipe";
    default:
      return "inherit";
  }
}

function shouldUseWindowsCmdProxy(command: string): boolean {
  return process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
}

function resolveSpawnInvocation(
  command: string,
  args: readonly string[] = [],
): { command: string; args: string[] } {
  if (!shouldUseWindowsCmdProxy(command)) {
    return {
      command,
      args: [...args],
    };
  }

  return {
    command: process.env.ComSpec ?? "cmd.exe",
    args: ["/d", "/c", "call", command, ...args],
  };
}

type TsxScopedImportApi = {
  import<T = unknown>(specifier: string, parentURL: string | URL): Promise<T>;
  unregister(): void;
};

let nodeTsxImportApiPromise: Promise<TsxScopedImportApi> | undefined;

export function resolveNodeRequireBaseSpecifier(
  moduleUrl: string = import.meta.url,
): string {
  if (moduleUrl.startsWith("file:")) {
    return moduleUrl;
  }

  // JSR-hosted Deno execution exposes https: module URLs here. Use a synthetic
  // file URL rooted at the project cwd so Node-style resolution still works.
  return pathToFileURL(join(process.cwd(), "__mainz_node_runtime__.mjs")).href;
}

const nodeRequire = createRequire(resolveNodeRequireBaseSpecifier());

function isTypeScriptModuleSpecifier(specifier: string): boolean {
  try {
    const url = new URL(specifier);
    if (url.protocol !== "file:") {
      return false;
    }

    return /\.(?:ts|tsx|mts|cts)$/i.test(url.pathname);
  } catch {
    return /\.(?:ts|tsx|mts|cts)(?:\?.*)?$/i.test(specifier);
  }
}

function isDenoHostedNodeRuntime(): boolean {
  return typeof Deno !== "undefined";
}

function normalizeTypeScriptImportSpecifier(specifier: string): string {
  try {
    const url = new URL(specifier);
    if (url.protocol !== "file:") {
      return specifier;
    }

    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return specifier.replace(/[?#].*$/, "");
  }
}

async function getNodeTsxImportApi(): Promise<TsxScopedImportApi> {
  nodeTsxImportApiPromise ??= Promise.resolve(
    register({
      namespace: "mainz-node-runtime",
    }),
  );
  return await nodeTsxImportApiPromise;
}

function resolveNodeOwnedViteCliPath(): string {
  const vitePackageJsonPath = nodeRequire.resolve("vite/package.json");
  return join(dirname(vitePackageJsonPath), "bin", "vite.js");
}

/**
 * Mainz tooling host implementation for Node.js.
 */
export class NodeToolingRuntime implements MainzToolingRuntime {
  readonly name = "node" as const;

  cwd(): string {
    return process.cwd();
  }

  async readFile(path: string): Promise<Uint8Array> {
    return await readFile(path);
  }

  async readTextFile(path: string): Promise<string> {
    return await readFile(path, "utf8");
  }

  async writeTextFile(path: string, text: string): Promise<void> {
    await writeFile(path, text, "utf8");
  }

  async *readDir(path: string): AsyncIterable<ToolingDirEntry> {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      yield {
        name: entry.name,
        isFile: entry.isFile(),
        isDirectory: entry.isDirectory(),
      };
    }
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    await mkdir(path, options);
  }

  async remove(path: string, options?: { recursive?: boolean }): Promise<void> {
    await rm(path, {
      force: false,
      recursive: options?.recursive ?? false,
    });
  }

  async rename(from: string, to: string): Promise<void> {
    await rename(from, to);
  }

  async stat(path: string): Promise<ToolingFileStat> {
    const fileStat = await stat(path);
    return {
      isFile: fileStat.isFile(),
      isDirectory: fileStat.isDirectory(),
    };
  }

  async makeTempDir(options?: { prefix?: string }): Promise<string> {
    return await mkdtemp(join(tmpdir(), options?.prefix ?? "mainz-"));
  }

  async run(command: ToolingCommand): Promise<ToolingCommandResult> {
    return await new Promise<ToolingCommandResult>((resolve, reject) => {
      const invocation = resolveSpawnInvocation(
        command.command,
        command.args ? [...command.args] : [],
      );
      const child = spawn(
        invocation.command,
        invocation.args,
        {
          cwd: command.cwd,
          env: command.env ? { ...process.env, ...command.env } : process.env,
          stdio: [
            toNodeStdio(command.stdin),
            toNodeStdio(command.stdout),
            toNodeStdio(command.stderr),
          ],
        },
      );

      child.once("error", reject);
      child.once("exit", (code, signal) => {
        if (signal) {
          resolve({
            success: false,
            code: 1,
          });
          return;
        }

        resolve({
          success: code === 0,
          code: code ?? 1,
        });
      });
    });
  }

  resolveViteBuildCommand(options: ToolingViteCommandOptions): ToolingCommand {
    return {
      command: process.execPath,
      args: [
        resolveNodeOwnedViteCliPath(),
        "build",
        "--config",
        options.viteConfigPath,
      ],
    };
  }

  resolveViteDevCommand(options: ToolingViteCommandOptions): ToolingCommand {
    const args = [
      resolveNodeOwnedViteCliPath(),
      "--config",
      options.viteConfigPath,
    ];

    if (options.host !== undefined) {
      args.push("--host");
      if (options.host !== true) {
        args.push(options.host);
      }
    }

    if (options.port !== undefined) {
      args.push("--port", String(options.port));
    }

    return {
      command: process.execPath,
      args,
    };
  }

  async importModule<T = unknown>(specifier: string): Promise<T> {
    if (isTypeScriptModuleSpecifier(specifier)) {
      if (isDenoHostedNodeRuntime()) {
        return await dynamicImport(specifier);
      }

      const api = await getNodeTsxImportApi();
      return await api.import<T>(
        normalizeTypeScriptImportSpecifier(specifier),
        pathToFileURL(this.cwd()).href,
      );
    }

    return await dynamicImport(specifier);
  }
}

/**
 * Shared Node tooling runtime instance.
 */
export const nodeToolingRuntime: NodeToolingRuntime = new NodeToolingRuntime();
