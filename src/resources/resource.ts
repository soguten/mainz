import type { NavigationMode, RenderMode } from "../routing/types.ts";

export type ResourceVisibility = "public" | "private";
export type ResourceExecution = "build" | "client" | "either";
export type RenderStrategy = "blocking" | "defer";
export type RenderPolicy = "placeholder-in-ssg" | "hide-in-ssg" | "forbidden-in-ssg";
export type ResourceStrategy = RenderStrategy;
export type ResourceRuntime = "build" | "client";
export type ResourceCachePolicy =
    | "static"
    | "no-store"
    | {
        revalidate: number;
        tags?: readonly string[];
    };

export interface ResourceDefinition<Params = void, Context = void, Value = unknown> {
    name?: string;
    visibility?: ResourceVisibility;
    execution?: ResourceExecution;
    cache?: ResourceCachePolicy;
    key?(params: Params): readonly unknown[];
    load(params: Params, context: Context): Value | Promise<Value>;
}

export interface Resource<Params = void, Context = void, Value = unknown> {
    readonly kind: "mainz.resource";
    readonly name: string;
    readonly visibility: ResourceVisibility;
    readonly execution: ResourceExecution;
    readonly cache: ResourceCachePolicy;
    key(params: Params): readonly unknown[] | undefined;
    load(params: Params, context: Context): Value | Promise<Value>;
    read(params: Params, context: Context): Value | Promise<Value>;
}

export interface ResourceReadEnvironment {
    renderMode?: RenderMode;
    navigationMode?: NavigationMode;
    runtime?: ResourceRuntime;
    consumer?: "page-load" | "resource-boundary";
    renderStrategy?: RenderStrategy;
    renderPolicy?: RenderPolicy;
}

export type ResourceAccessErrorCode =
    | "private-in-ssg"
    | "client-in-ssg"
    | "build-in-client"
    | "forbidden-in-ssg";

export class ResourceAccessError extends Error {
    readonly code: ResourceAccessErrorCode;
    readonly resourceName: string;

    constructor(args: {
        code: ResourceAccessErrorCode;
        resourceName: string;
        message: string;
    }) {
        super(args.message);
        this.name = "ResourceAccessError";
        this.code = args.code;
        this.resourceName = args.resourceName;
    }
}

export function defineResource<Params = void, Context = void, Value = unknown>(
    definition: ResourceDefinition<Params, Context, Value>,
): Resource<Params, Context, Value> {
    const resource: Resource<Params, Context, Value> = {
        kind: "mainz.resource",
        name: normalizeResourceName(definition.name),
        visibility: definition.visibility ?? "private",
        execution: definition.execution ?? "either",
        cache: definition.cache ?? "no-store",
        key(params) {
            return definition.key?.(params);
        },
        load(params, context) {
            return definition.load(params, context);
        },
        read(params, context) {
            return definition.load(params, context);
        },
    };

    return Object.freeze(resource);
}

function normalizeResourceName(name: string | undefined): string {
    const normalizedName = name?.trim();
    return normalizedName ? normalizedName : "anonymous-resource";
}

export function readResource<Params, Context, Value>(
    resource: Resource<Params, Context, Value>,
    params: Params,
    context: Context,
    environment: ResourceReadEnvironment = {},
): Value | Promise<Value> {
    validateResourceAccess(resource, environment);
    return resource.load(params, context);
}

function validateResourceAccess(
    resource: Resource<unknown, unknown, unknown>,
    environment: ResourceReadEnvironment,
): void {
    if (resource.execution === "build" && environment.runtime === "client") {
        throw new ResourceAccessError({
            code: "build-in-client",
            resourceName: resource.name,
            message: `Resource "${resource.name}" is build-only and cannot execute in the client runtime.`,
        });
    }

    if (environment.renderMode === "ssg" && environment.renderPolicy === "forbidden-in-ssg") {
        throw new ResourceAccessError({
            code: "forbidden-in-ssg",
            resourceName: resource.name,
            message: `Resource "${resource.name}" is being read by a component marked @RenderPolicy("forbidden-in-ssg") and cannot be used during SSG.`,
        });
    }

    if (environment.consumer === "page-load") {
        if (environment.renderMode !== "ssg") {
            return;
        }

        if (resource.visibility === "private") {
            throw new ResourceAccessError({
                code: "private-in-ssg",
                resourceName: resource.name,
                message: `Resource "${resource.name}" is private and cannot be read during SSG.`,
            });
        }

        if (resource.execution === "client") {
            throw new ResourceAccessError({
                code: "client-in-ssg",
                resourceName: resource.name,
                message:
                    `Resource "${resource.name}" uses execution: "client" and cannot execute during SSG.`,
            });
        }

        return;
    }

    if (environment.consumer === "resource-boundary" && environment.renderMode === "ssg" && environment.runtime === "build") {
        if (resource.visibility === "private") {
            throw new ResourceAccessError({
                code: "private-in-ssg",
                resourceName: resource.name,
                message: `Resource "${resource.name}" is private and cannot be read during SSG.`,
            });
        }

        if (resource.execution === "client") {
            throw new ResourceAccessError({
                code: "client-in-ssg",
                resourceName: resource.name,
                message:
                    `Resource "${resource.name}" uses execution: "client" and cannot execute during SSG.`,
            });
        }

        return;
    }

    if (environment.renderMode !== "ssg") {
        return;
    }
}

