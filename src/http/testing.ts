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

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
    return new Response(JSON.stringify(body), {
        ...init,
        headers: {
            "content-type": "application/json",
            ...toHeaderObject(init.headers),
        },
    });
}

export function textResponse(body: string, init: ResponseInit = {}): Response {
    return new Response(body, {
        ...init,
        headers: {
            "content-type": "text/plain; charset=utf-8",
            ...toHeaderObject(init.headers),
        },
    });
}

export function httpError(status: number, body: unknown, init: ResponseInit = {}): Response {
    return jsonResponse(body, {
        ...init,
        status,
        statusText: init.statusText ?? resolveDefaultStatusText(status),
    });
}

export function networkError(message = "Mock network failure."): never {
    throw new TypeError(message);
}

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

export async function requestJson<T>(request: Request): Promise<T> {
    return await request.clone().json() as T;
}

export function query(input: Request | URL | string): URLSearchParams {
    if (typeof input === "string") {
        return new URL(input).searchParams;
    }

    if (input instanceof URL) {
        return input.searchParams;
    }

    return new URL(input.url).searchParams;
}

export interface MockFetchRequestContext {
    request: Request;
    url: URL;
    signal: AbortSignal | null | undefined;
    params: Readonly<Record<string, string>>;
}

export type MockFetchHandler =
    | Response
    | ((context: MockFetchRequestContext) => Response | Promise<Response>);

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

export class MockFetchRoutes {
    private readonly routes: Array<{
        method: string;
        pattern: string;
        handler: MockFetchHandler;
    }> = [];

    get(pathname: string, handler: MockFetchHandler): void {
        this.add("GET", pathname, handler);
    }

    post(pathname: string, handler: MockFetchHandler): void {
        this.add("POST", pathname, handler);
    }

    put(pathname: string, handler: MockFetchHandler): void {
        this.add("PUT", pathname, handler);
    }

    patch(pathname: string, handler: MockFetchHandler): void {
        this.add("PATCH", pathname, handler);
    }

    delete(pathname: string, handler: MockFetchHandler): void {
        this.add("DELETE", pathname, handler);
    }

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
