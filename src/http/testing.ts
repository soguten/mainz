/** Resolves a value after a delay unless the provided signal aborts first. */
export function delayWithSignal<T>(
    value: T,
    signal: AbortSignal | null | undefined,
    delayMs: number,
): Promise<T> {
    if (signal?.aborted) {
        return Promise.reject(createAbortError());
    }

    return new Promise<T>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            signal?.removeEventListener("abort", abortHandler);
            resolve(value);
        }, Math.max(0, delayMs));

        const abortHandler = () => {
            clearTimeout(timeoutId);
            signal?.removeEventListener("abort", abortHandler);
            reject(createAbortError());
        };

        signal?.addEventListener("abort", abortHandler, { once: true });
    });
}

/** Creates a JSON response with a default `content-type` header. */
export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
    return new Response(JSON.stringify(body), {
        ...init,
        headers: {
            "content-type": "application/json",
            ...toHeaderObject(init.headers),
        },
    });
}

/** Creates a plain text response with a default UTF-8 `content-type` header. */
export function textResponse(body: string, init: ResponseInit = {}): Response {
    return new Response(body, {
        ...init,
        headers: {
            "content-type": "text/plain; charset=utf-8",
            ...toHeaderObject(init.headers),
        },
    });
}

/** Creates a JSON error response using a default status text when needed. */
export function httpError(status: number, body: unknown, init: ResponseInit = {}): Response {
    return jsonResponse(body, {
        ...init,
        status,
        statusText: init.statusText ?? resolveDefaultStatusText(status),
    });
}

/** Throws a mock network error that behaves like a failed fetch request. */
export function networkError(message = "Mock network failure."): never {
    throw new TypeError(message);
}

/** Creates a handler that consumes the provided steps in sequence across invocations. */
export function sequence<TArgs extends readonly unknown[], TResult>(
    ...steps: Array<(...args: TArgs) => TResult>
): (...args: TArgs) => TResult {
    if (steps.length === 0) {
        throw new Error("sequence(...) requires at least one step.");
    }

    let index = 0;
    return (...args: TArgs) => {
        const step = steps[Math.min(index, steps.length - 1)];
        index += 1;
        return step(...args);
    };
}

/** Reads and parses a request body as JSON without consuming the original request stream. */
export async function requestJson<T>(request: Request): Promise<T> {
    return await request.clone().json() as T;
}

/** Returns the query parameters for a request, URL, or URL string. */
export function query(input: Request | URL | string): URLSearchParams {
    if (typeof input === "string") {
        return new URL(input).searchParams;
    }

    if (input instanceof URL) {
        return input.searchParams;
    }

    return new URL(input.url).searchParams;
}

/** Context passed to mock fetch handlers when a route matches. */
export interface MockFetchRequestContext {
    /** Request object passed to the mock fetch implementation. */
    request: Request;
    /** Parsed URL for the matched request. */
    url: URL;
    /** Abort signal associated with the matched request, when present. */
    signal: AbortSignal | null | undefined;
    /** Route params resolved from the matched pathname pattern. */
    params: Readonly<Record<string, string>>;
}

/** Value or callback used to satisfy a matched mock fetch route. */
export type MockFetchHandler =
    | Response
    | ((context: MockFetchRequestContext) => Response | Promise<Response>);

/** Creates a fetch implementation backed by declarative mock routes. */
export function createMockFetch(
    configure: (routes: MockFetchRoutes) => void,
): typeof fetch {
    const routes = new MockFetchRoutes();
    configure(routes);

    return async (input, init) => {
        const request = toRequest(input, init);
        const url = new URL(request.url);
        const match = routes.match(request.method, url.pathname);
        if (!match) {
            return httpError(404, {
                message: `Unhandled mock request: ${request.method} ${url.pathname}`,
            });
        }

        if (typeof match.handler !== "function") {
            return match.handler;
        }

        return await match.handler({
            request,
            url,
            signal: init?.signal ?? request.signal ?? undefined,
            params: match.params,
        });
    };
}

/** Route collection used to build mock fetch implementations for tests. */
export class MockFetchRoutes {
    private readonly routes: Array<{
        method: string;
        pattern: string;
        handler: MockFetchHandler;
    }> = [];

    /** Registers a GET route handler. */
    get(pathname: string, handler: MockFetchHandler): void {
        this.add("GET", pathname, handler);
    }

    /** Registers a POST route handler. */
    post(pathname: string, handler: MockFetchHandler): void {
        this.add("POST", pathname, handler);
    }

    /** Registers a PUT route handler. */
    put(pathname: string, handler: MockFetchHandler): void {
        this.add("PUT", pathname, handler);
    }

    /** Registers a PATCH route handler. */
    patch(pathname: string, handler: MockFetchHandler): void {
        this.add("PATCH", pathname, handler);
    }

    /** Registers a DELETE route handler. */
    delete(pathname: string, handler: MockFetchHandler): void {
        this.add("DELETE", pathname, handler);
    }

    /** Matches a registered route for the provided method and pathname. */
    match(method: string, pathname: string): {
        handler: MockFetchHandler;
        params: Record<string, string>;
    } | undefined {
        for (const route of this.routes) {
            if (route.method !== method.toUpperCase()) {
                continue;
            }

            const params = matchPathname(route.pattern, pathname);
            if (!params) {
                continue;
            }

            return {
                handler: route.handler,
                params,
            };
        }

        return undefined;
    }

    /** Stores a normalized route definition in the mock route table. */
    private add(method: string, pattern: string, handler: MockFetchHandler): void {
        this.routes.push({
            method,
            pattern,
            handler,
        });
    }
}

function toHeaderObject(headers: HeadersInit | undefined): Record<string, string> {
    if (!headers) {
        return {};
    }

    if (headers instanceof Headers) {
        const result: Record<string, string> = {};
        headers.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }

    if (Array.isArray(headers)) {
        return Object.fromEntries(headers);
    }

    return headers;
}

function toRequest(input: RequestInfo | URL, init: RequestInit | undefined): Request {
    if (typeof input === "string" || input instanceof URL) {
        return new Request(input, init);
    }

    if (!init) {
        return input;
    }

    return new Request(input, init);
}

function matchPathname(pattern: string, pathname: string): Record<string, string> | undefined {
    const patternSegments = normalizePathSegments(pattern);
    const pathnameSegments = normalizePathSegments(pathname);

    if (patternSegments.length !== pathnameSegments.length) {
        return undefined;
    }

    const params: Record<string, string> = {};
    for (let index = 0; index < patternSegments.length; index += 1) {
        const patternSegment = patternSegments[index];
        const pathnameSegment = pathnameSegments[index];

        if (patternSegment.startsWith(":")) {
            params[patternSegment.slice(1)] = decodeURIComponent(pathnameSegment);
            continue;
        }

        if (patternSegment !== pathnameSegment) {
            return undefined;
        }
    }

    return params;
}

function normalizePathSegments(pathname: string): string[] {
    return pathname
        .split("/")
        .filter((segment) => segment.length > 0);
}

function createAbortError(): Error {
    try {
        return new DOMException("The operation was aborted.", "AbortError");
    } catch {
        const error = new Error("The operation was aborted.");
        error.name = "AbortError";
        return error;
    }
}

function resolveDefaultStatusText(status: number): string {
    switch (status) {
        case 400:
            return "Bad Request";
        case 401:
            return "Unauthorized";
        case 403:
            return "Forbidden";
        case 404:
            return "Not Found";
        case 409:
            return "Conflict";
        case 422:
            return "Unprocessable Entity";
        case 429:
            return "Too Many Requests";
        case 500:
            return "Internal Server Error";
        case 502:
            return "Bad Gateway";
        case 503:
            return "Service Unavailable";
        case 504:
            return "Gateway Timeout";
        default:
            return "Error";
    }
}
