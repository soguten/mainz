import { resolve } from "node:path";
import {
  createBuildArtifactHandler,
  type CreateBuildArtifactHandlerOptions,
} from "../build/artifact-handler.ts";

export interface BuildArtifactServerAddress {
  hostname: string;
  port: number;
}

export interface BuildArtifactServerOptions
  extends CreateBuildArtifactHandlerOptions {
  host?: string;
  port?: number;
  onListen?: (address: BuildArtifactServerAddress) => void;
}

export function serveBuildArtifacts(
  options: BuildArtifactServerOptions,
): Deno.HttpServer<Deno.NetAddr> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 4173;
  const handler = createBuildArtifactHandler(options);

  return Deno.serve({
    hostname: host,
    port,
    onListen: ({ hostname, port }) => {
      if (options.onListen) {
        options.onListen({ hostname, port });
        return;
      }

      console.log(
        `[mainz] Serving build artifact output from ${
          resolve(options.rootDir)
        } on http://${hostname}:${port}/`,
      );
    },
  }, handler);
}
