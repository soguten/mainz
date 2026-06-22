import { spawn } from "node:child_process";
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
import { join } from "node:path";
import { pathToFileURL } from "node:url";
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

function resolveNodePackageRunnerCommand(): string {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function shouldUseWindowsShell(command: string): boolean {
  return process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
}

type TsxScopedImportApi = {
  import<T = unknown>(specifier: string, parentURL: string | URL): Promise<T>;
  unregister(): void;
};

let nodeTsxImportApiPromise: Promise<TsxScopedImportApi> | undefined;
const tsxEsmApiSpecifier = "tsx/esm/api";

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

async function getNodeTsxImportApi(): Promise<TsxScopedImportApi> {
  nodeTsxImportApiPromise ??= import(tsxEsmApiSpecifier).then(({ register }) =>
    register({
      namespace: "mainz-node-runtime",
    })
  );
  return await nodeTsxImportApiPromise;
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
      const child = spawn(
        command.command,
        command.args ? [...command.args] : [],
        {
          cwd: command.cwd,
          env: command.env ? { ...process.env, ...command.env } : process.env,
          shell: shouldUseWindowsShell(command.command),
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
      command: resolveNodePackageRunnerCommand(),
      args: [
        "vite",
        "build",
        "--config",
        options.viteConfigPath,
      ],
    };
  }

  resolveViteDevCommand(options: ToolingViteCommandOptions): ToolingCommand {
    const args = [
      "vite",
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
      command: resolveNodePackageRunnerCommand(),
      args,
    };
  }

  async importModule<T = unknown>(specifier: string): Promise<T> {
    if (isTypeScriptModuleSpecifier(specifier)) {
      if (isDenoHostedNodeRuntime()) {
        return await import(specifier) as T;
      }

      const api = await getNodeTsxImportApi();
      return await api.import<T>(specifier, pathToFileURL(this.cwd()).href);
    }

    return await import(specifier) as T;
  }
}

/**
 * Shared Node tooling runtime instance.
 */
export const nodeToolingRuntime: NodeToolingRuntime = new NodeToolingRuntime();
