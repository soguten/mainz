import type {
  RenderPolicy,
  RenderStrategy,
  ResourceRuntime,
} from "../resources/resource.ts";
import type { RenderMode } from "../routing/types.ts";

declare const __MAINZ_RENDER_MODE__: "csr" | "ssg";
declare const __MAINZ_RUNTIME_ENV__: "build" | "client";

export interface ComponentLoadEnvironment {
  renderMode: RenderMode;
  runtime: ResourceRuntime;
}

export function resolveComponentLoadEnvironment(): ComponentLoadEnvironment {
  return {
    renderMode: resolveMainzRenderMode(),
    runtime: resolveMainzRuntime(),
  };
}

export function shouldWaitForClientRuntime(
  strategy: RenderStrategy,
  environment: ComponentLoadEnvironment,
): boolean {
  return environment.renderMode === "ssg" &&
    environment.runtime === "build" &&
    strategy === "defer";
}

export function isSsgBuildEnvironment(
  environment: ComponentLoadEnvironment,
): boolean {
  return environment.renderMode === "ssg" && environment.runtime === "build";
}

export function shouldApplyRenderPolicyInSsgBuild(
  policy: RenderPolicy | undefined,
  environment: ComponentLoadEnvironment,
): boolean {
  return policy !== undefined && isSsgBuildEnvironment(environment);
}

export function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof (value as Promise<T> | undefined)?.then === "function";
}

export function isAbortLikeError(error: unknown): boolean {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return error.name === "AbortError";
  }

  return error instanceof Error && error.name === "AbortError";
}

export function stableSerializeForLoadKey(
  value: unknown,
  isNodeLike: (value: unknown) => value is Node,
  seen = new WeakSet<object>(),
): string {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return '"[undefined]"';
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "bigint") {
    return `"${value.toString()}n"`;
  }

  if (typeof value === "symbol") {
    return JSON.stringify(value.toString());
  }

  if (typeof value === "function") {
    return JSON.stringify("[function]");
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (isNodeLike(value)) {
    return JSON.stringify(`[node:${value.nodeType}]`);
  }

  if (Array.isArray(value)) {
    return `[${
      value.map((entry) => stableSerializeForLoadKey(entry, isNodeLike, seen))
        .join(",")
    }]`;
  }

  if (typeof value !== "object") {
    return JSON.stringify(String(value));
  }

  if (seen.has(value)) {
    return JSON.stringify("[circular]");
  }

  seen.add(value);
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entryValue]) =>
      `${JSON.stringify(key)}:${
        stableSerializeForLoadKey(entryValue, isNodeLike, seen)
      }`
    );
  seen.delete(value);
  return `{${entries.join(",")}}`;
}

function resolveMainzRenderMode(): RenderMode {
  if (typeof __MAINZ_RENDER_MODE__ !== "undefined") {
    return __MAINZ_RENDER_MODE__;
  }

  const fromGlobal =
    (globalThis as Record<string, unknown>).__MAINZ_RENDER_MODE__;
  return fromGlobal === "ssg" ? "ssg" : "csr";
}

function resolveMainzRuntime(): ResourceRuntime {
  if (typeof __MAINZ_RUNTIME_ENV__ !== "undefined") {
    return __MAINZ_RUNTIME_ENV__;
  }

  const fromGlobal =
    (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__;
  return fromGlobal === "build" ? "build" : "client";
}
