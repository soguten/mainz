/**
 * Supported Mainz tooling runtimes.
 */
export type ToolingRuntimeName = "deno" | "node" | "bun";

/**
 * Process stdio modes supported by tooling commands.
 */
export type ToolingCommandStdio = "inherit" | "null" | "piped";

/**
 * Minimal file metadata used by the tooling layer.
 */
export interface ToolingFileStat {
    /** Whether the path points to a regular file. */
    isFile: boolean;
    /** Whether the path points to a directory. */
    isDirectory: boolean;
}

/**
 * Minimal directory entry metadata used by the tooling layer.
 */
export interface ToolingDirEntry {
    /** Basename of the directory entry. */
    name: string;
    /** Whether the entry is a regular file. */
    isFile: boolean;
    /** Whether the entry is a directory. */
    isDirectory: boolean;
}

/**
 * A runtime-resolved process invocation.
 */
export interface ToolingCommand {
    /** Executable to launch. */
    command: string;
    /** Arguments passed to the executable. */
    args?: readonly string[];
    /** Working directory for the command. */
    cwd?: string;
    /** Environment overrides passed to the process. */
    env?: Record<string, string>;
    /** Standard input handling. */
    stdin?: ToolingCommandStdio;
    /** Standard output handling. */
    stdout?: ToolingCommandStdio;
    /** Standard error handling. */
    stderr?: ToolingCommandStdio;
}

/**
 * Exit status returned by a tooling command.
 */
export interface ToolingCommandResult {
    /** Whether the command exited successfully. */
    success: boolean;
    /** Exit code returned by the command. */
    code: number;
}

/**
 * Options shared by Vite build and dev invocations.
 */
export interface ToolingViteCommandOptions {
    /** Absolute path to the generated Vite config file. */
    viteConfigPath: string;
    /** Host forwarded to the dev server when present. */
    host?: string | true;
    /** Port forwarded to the dev server when present. */
    port?: number;
}

/**
 * Runtime-specific host operations used by Mainz tooling.
 */
export interface MainzToolingRuntime {
    /** Public runtime name used by Mainz config and CLI resolution. */
    readonly name: ToolingRuntimeName;
    /** Returns the current working directory for the host runtime. */
    cwd(): string;
    /** Reads a UTF-8 text file from the host filesystem. */
    readTextFile(path: string): Promise<string>;
    /** Writes a UTF-8 text file to the host filesystem. */
    writeTextFile(path: string, text: string): Promise<void>;
    /** Enumerates directory entries from the host filesystem. */
    readDir(path: string): AsyncIterable<ToolingDirEntry>;
    /** Creates a directory on the host filesystem. */
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    /** Removes a file or directory from the host filesystem. */
    remove(path: string, options?: { recursive?: boolean }): Promise<void>;
    /** Reads file metadata from the host filesystem. */
    stat(path: string): Promise<ToolingFileStat>;
    /** Creates a temporary directory owned by the host runtime. */
    makeTempDir(options?: { prefix?: string }): Promise<string>;
    /** Executes a process through the host runtime. */
    run(command: ToolingCommand): Promise<ToolingCommandResult>;
    /** Resolves the Vite build command for the host runtime. */
    resolveViteBuildCommand(options: ToolingViteCommandOptions): ToolingCommand;
    /** Resolves the Vite dev command for the host runtime. */
    resolveViteDevCommand(options: ToolingViteCommandOptions): ToolingCommand;
    /** Dynamically imports a module through the host runtime. */
    importModule<T = unknown>(specifier: string): Promise<T>;
}
