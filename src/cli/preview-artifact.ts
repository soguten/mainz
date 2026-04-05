/// <reference lib="deno.ns" />

import { serveArtifactPreview } from "../preview/artifact-server.ts";

if (import.meta.main) {
    await main(Deno.args);
}

export async function main(args: string[]): Promise<void> {
    const options = parseOptions(args);

    serveArtifactPreview({
        rootDir: options.rootDir,
        host: options.host,
        port: options.port,
    });

    await new Promise(() => undefined);
}

interface PreviewCliOptions {
    rootDir: string;
    host: string;
    port: number;
}

function parseOptions(args: string[]): PreviewCliOptions {
    let rootDir: string | undefined;
    let host = "127.0.0.1";
    let port = 4173;

    for (let index = 0; index < args.length; index += 1) {
        const current = args[index];

        if (!current) {
            continue;
        }

        if (current === "--host") {
            host = args[index + 1] ?? host;
            index += 1;
            continue;
        }

        if (current === "--port") {
            const nextValue = args[index + 1];
            const parsedPort = Number(nextValue);
            if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
                throw new Error(`Invalid --port value "${nextValue ?? ""}".`);
            }

            port = parsedPort;
            index += 1;
            continue;
        }

        if (current.startsWith("--")) {
            throw new Error(`Unknown option "${current}".`);
        }

        if (rootDir) {
            throw new Error(`Unexpected extra argument "${current}".`);
        }

        rootDir = current;
    }

    if (!rootDir) {
        throw new Error("Missing <rootDir> argument.");
    }

    return { rootDir, host, port };
}
