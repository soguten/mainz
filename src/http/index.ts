const RETRYABLE_GET_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

export interface HttpRetryOptions {
    attempts?: number;
    delayMs?: number;
}

export interface HttpClientOptions {
    baseUrl?: string;
    headers?: HeadersInit;
    retry?: HttpRetryOptions;
    timeoutMs?: number;
    fetch?: typeof fetch;
}

export interface HttpRequestOptions {
    headers?: HeadersInit;
    body?: BodyInit | null;
    signal?: AbortSignal;
    retry?: HttpRetryOptions;
    timeoutMs?: number;
}

export class HttpResponseError extends Error {
    readonly method: string;
    readonly url: string;
    readonly status: number;
    readonly statusText: string;
    readonly response: Response;

    constructor(args: {
        method: string;
        url: string;
        response: Response;
    }) {
        super(
            `HTTP ${args.method.toUpperCase()} ${args.url} failed with ${args.response.status} ${args.response.statusText}.`,
        );
        this.name = "HttpResponseError";
        this.method = args.method.toUpperCase();
        this.url = args.url;
        this.status = args.response.status;
        this.statusText = args.response.statusText;
        this.response = args.response;
    }
}

export class HttpClient {
    private readonly baseUrl?: string;
    private readonly defaultHeaders: Headers;
    private readonly defaultRetry: Required<HttpRetryOptions>;
    private readonly defaultTimeoutMs?: number;
    private readonly fetchImpl: typeof fetch;

    constructor(options: HttpClientOptions = {}) {
        this.baseUrl = options.baseUrl;
        this.defaultHeaders = new Headers(options.headers);
        this.defaultRetry = normalizeRetryOptions(options.retry);
        this.defaultTimeoutMs = normalizeTimeoutMs(options.timeoutMs);
        this.fetchImpl = options.fetch ?? fetch;
    }

    get(path: string, options?: HttpRequestOptions): HttpRequest {
        return this.createRequest("GET", path, options);
    }

    post(path: string, options?: HttpRequestOptions): HttpRequest {
        return this.createRequest("POST", path, options);
    }

    put(path: string, options?: HttpRequestOptions): HttpRequest {
        return this.createRequest("PUT", path, options);
    }

    patch(path: string, options?: HttpRequestOptions): HttpRequest {
        return this.createRequest("PATCH", path, options);
    }

    delete(path: string, options?: HttpRequestOptions): HttpRequest {
        return this.createRequest("DELETE", path, options);
    }

    private createRequest(
        method: HttpMethod,
        path: string,
        options?: HttpRequestOptions,
    ): HttpRequest {
        return new HttpRequest(this, method, path, options);
    }

    async execute(
        method: HttpMethod,
        path: string,
        options: HttpRequestOptions = {},
    ): Promise<Response> {
        const url = resolveRequestUrl(path, this.baseUrl);
        const headers = new Headers(this.defaultHeaders);
        mergeHeaders(headers, options.headers);

        const retry = normalizeRetryOptions(options.retry ?? this.defaultRetry);
        const timeoutMs = normalizeTimeoutMs(options.timeoutMs ?? this.defaultTimeoutMs);
        const body = options.body ?? null;

        for (let attempt = 1; attempt <= retry.attempts; attempt += 1) {
            const requestControl = createRequestControl(options.signal, timeoutMs);

            try {
                const response = await this.fetchImpl(url, {
                    method,
                    headers,
                    body,
                    signal: requestControl.signal,
                });

                requestControl.cleanup();

                if (!response.ok) {
                    if (attempt < retry.attempts && shouldRetryResponse(method, response.status)) {
                        await delay(retry.delayMs);
                        continue;
                    }

                    throw new HttpResponseError({
                        method,
                        url,
                        response,
                    });
                }

                return response;
            } catch (error) {
                requestControl.cleanup();

                if (requestControl.didTimeout) {
                    throw new Error(
                        `HTTP ${method} ${url} timed out after ${requestControl.timeoutMs}ms.`,
                    );
                }

                if (isAbortLikeError(error)) {
                    throw error;
                }

                if (attempt < retry.attempts && shouldRetryError(error)) {
                    await delay(retry.delayMs);
                    continue;
                }

                throw error;
            }
        }

        throw new Error(`HTTP ${method} ${url} failed without returning a response.`);
    }
}

export class HttpRequest {
    private responsePromise?: Promise<Response>;

    constructor(
        private readonly client: HttpClient,
        private readonly method: HttpMethod,
        private readonly path: string,
        private readonly options: HttpRequestOptions = {},
    ) {}

    async response(): Promise<Response> {
        const response = await this.getResponse();
        return response.clone();
    }

    async json<T>(): Promise<T> {
        const response = await this.getResponse();
        return await response.clone().json() as T;
    }

    async text(): Promise<string> {
        const response = await this.getResponse();
        return await response.clone().text();
    }

    async blob(): Promise<Blob> {
        const response = await this.getResponse();
        return await response.clone().blob();
    }

    private getResponse(): Promise<Response> {
        if (!this.responsePromise) {
            this.responsePromise = this.client.execute(this.method, this.path, this.options);
        }

        return this.responsePromise;
    }
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

function mergeHeaders(target: Headers, source: HeadersInit | undefined): void {
    if (!source) {
        return;
    }

    const resolved = new Headers(source);
    resolved.forEach((value, key) => {
        target.set(key, value);
    });
}

function normalizeRetryOptions(options: HttpRetryOptions | undefined): Required<HttpRetryOptions> {
    const attempts = Math.max(1, options?.attempts ?? 1);
    const delayMs = Math.max(0, options?.delayMs ?? 150);

    return {
        attempts,
        delayMs,
    };
}

function normalizeTimeoutMs(value: number | undefined): number | undefined {
    if (value === undefined) {
        return undefined;
    }

    return value > 0 ? value : undefined;
}

function resolveRequestUrl(path: string, baseUrl?: string): string {
    if (!baseUrl) {
        return path;
    }

    return new URL(path, baseUrl).toString();
}

function shouldRetryResponse(method: HttpMethod, status: number): boolean {
    return method === "GET" && RETRYABLE_GET_STATUS_CODES.has(status);
}

function shouldRetryError(error: unknown): boolean {
    return !(error instanceof HttpResponseError) && !isAbortLikeError(error);
}

function isAbortLikeError(error: unknown): boolean {
    if (typeof DOMException !== "undefined" && error instanceof DOMException) {
        return error.name === "AbortError";
    }

    return error instanceof Error && error.name === "AbortError";
}

function delay(ms: number): Promise<void> {
    if (ms <= 0) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function createRequestControl(signal: AbortSignal | undefined, timeoutMs: number | undefined): {
    signal: AbortSignal | undefined;
    cleanup(): void;
    didTimeout: boolean;
    timeoutMs?: number;
} {
    const controller = new AbortController();
    let timeoutId: number | undefined;
    let didTimeout = false;

    const abortFromParent = () => controller.abort();
    signal?.addEventListener("abort", abortFromParent, { once: true });

    if (signal?.aborted) {
        controller.abort();
    }

    if (timeoutMs !== undefined) {
        timeoutId = setTimeout(() => {
            didTimeout = true;
            controller.abort();
        }, timeoutMs) as unknown as number;
    }

    return {
        signal: (signal || timeoutMs !== undefined) ? controller.signal : signal,
        cleanup() {
            signal?.removeEventListener("abort", abortFromParent);
            if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
            }
        },
        get didTimeout() {
            return didTimeout;
        },
        timeoutMs,
    };
}
