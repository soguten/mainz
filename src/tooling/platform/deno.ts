import type {
    MainzToolingPlatform,
    ToolingCommand,
    ToolingCommandResult,
    ToolingDirEntry,
    ToolingFileStat,
    ToolingViteCommandOptions,
} from "./types.ts";

/**
 * Mainz tooling host implementation for Deno.
 */
export class DenoToolingPlatform implements MainzToolingPlatform {
    readonly name = "deno" as const;

    cwd(): string {
        return Deno.cwd();
    }

    async readTextFile(path: string): Promise<string> {
        return await Deno.readTextFile(path);
    }

    async writeTextFile(path: string, text: string): Promise<void> {
        await Deno.writeTextFile(path, text);
    }

    async *readDir(path: string): AsyncIterable<ToolingDirEntry> {
        for await (const entry of Deno.readDir(path)) {
            yield {
                name: entry.name,
                isFile: entry.isFile,
                isDirectory: entry.isDirectory,
            };
        }
    }

    async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
        await Deno.mkdir(path, options);
    }

    async remove(path: string, options?: { recursive?: boolean }): Promise<void> {
        await Deno.remove(path, options);
    }

    async stat(path: string): Promise<ToolingFileStat> {
        const stat = await Deno.stat(path);
        return {
            isFile: stat.isFile,
            isDirectory: stat.isDirectory,
        };
    }

    async makeTempDir(options?: { prefix?: string }): Promise<string> {
        return await Deno.makeTempDir(options);
    }

    async run(command: ToolingCommand): Promise<ToolingCommandResult> {
        const child = new Deno.Command(command.command, {
            cwd: command.cwd,
            args: command.args ? [...command.args] : undefined,
            env: command.env,
            stdin: command.stdin ?? "inherit",
            stdout: command.stdout ?? "inherit",
            stderr: command.stderr ?? "inherit",
        }).spawn();

        const status = await child.status;
        return {
            success: status.success,
            code: status.code,
        };
    }

    resolveViteBuildCommand(options: ToolingViteCommandOptions): ToolingCommand {
        return {
            command: "deno",
            args: [
                "run",
                "-A",
                "npm:vite@7.3.1",
                "build",
                "--config",
                options.viteConfigPath,
            ],
        };
    }

    resolveViteDevCommand(options: ToolingViteCommandOptions): ToolingCommand {
        const args = [
            "run",
            "-A",
            "npm:vite@7.3.1",
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
            command: "deno",
            args,
        };
    }

    async importModule<T = unknown>(specifier: string): Promise<T> {
        return await import(specifier) as T;
    }
}

/**
 * Shared Deno tooling platform instance.
 */
export const denoToolingPlatform: DenoToolingPlatform = new DenoToolingPlatform();
