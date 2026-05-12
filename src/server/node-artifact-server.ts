import { Buffer } from "node:buffer";
import { once } from "node:events";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { resolve } from "node:path";
import {
  createBuildArtifactHandler,
  type CreateBuildArtifactHandlerOptions,
} from "../build/artifact-handler.ts";
import { nodeToolingRuntime } from "../tooling/runtime/index.ts";

export interface NodeBuildArtifactServerAddress {
  hostname: string;
  port: number;
}

export interface NodeBuildArtifactServerOptions
  extends CreateBuildArtifactHandlerOptions {
  host?: string;
  port?: number;
  onListen?: (address: NodeBuildArtifactServerAddress) => void;
}

export interface NodeBuildArtifactServerHandle {
  server: Server;
  address: NodeBuildArtifactServerAddress;
  close(): Promise<void>;
}

export async function serveBuildArtifactsNode(
  options: NodeBuildArtifactServerOptions,
): Promise<NodeBuildArtifactServerHandle> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 4173;
  const handler = createBuildArtifactHandler({
    ...options,
    runtime: options.runtime ?? nodeToolingRuntime,
  });

  const server = createServer(async (request, response) => {
    try {
      const rendered = await handler(
        toNodeRequest(request, { hostname: host, port }),
      );
      await writeNodeResponse(response, rendered);
    } catch (error) {
      response.statusCode = 500;
      response.setHeader("content-type", "text/plain; charset=utf-8");
      response.end(toErrorMessage(error));
    }
  });

  server.listen(port, host);
  await once(server, "listening");

  const address = resolveListeningAddress(server, host);
  if (options.onListen) {
    options.onListen(address);
  } else {
    console.log(
      `[mainz] Serving build artifact output from ${
        resolve(options.rootDir)
      } on http://${address.hostname}:${address.port}/`,
    );
  }

  return {
    server,
    address,
    async close() {
      if (!server.listening) {
        return;
      }

      await new Promise<void>((resolveClose, rejectClose) => {
        server.close((error) => error ? rejectClose(error) : resolveClose());
      });
    },
  };
}

function toNodeRequest(
  request: IncomingMessage,
  fallbackAddress: NodeBuildArtifactServerAddress,
): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        headers.append(name, entry);
      }
      continue;
    }

    if (typeof value === "string") {
      headers.set(name, value);
    }
  }

  const hostHeader = headers.get("host") ??
    `${fallbackAddress.hostname}:${fallbackAddress.port}`;
  const url = new URL(request.url ?? "/", `http://${hostHeader}`);
  const method = request.method ?? "GET";

  return new Request(url, {
    method,
    headers,
  });
}

async function writeNodeResponse(
  response: import("node:http").ServerResponse,
  rendered: Response,
): Promise<void> {
  response.statusCode = rendered.status;
  rendered.headers.forEach((value, name) => {
    response.setHeader(name, value);
  });

  if (!rendered.body) {
    response.end();
    return;
  }

  const body = await rendered.arrayBuffer();
  response.end(Buffer.from(body));
}

function resolveListeningAddress(
  server: Server,
  fallbackHost: string,
): NodeBuildArtifactServerAddress {
  const listeningAddress = server.address();
  if (!listeningAddress || typeof listeningAddress === "string") {
    return {
      hostname: fallbackHost,
      port: 4173,
    };
  }

  return {
    hostname: listeningAddress.address,
    port: listeningAddress.port,
  };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
