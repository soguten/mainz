const RETRYABLE_GET_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

/** Retry policy applied to retryable HTTP requests. */
export interface HttpRetryOptions {
  /** Maximum number of attempts, including the initial request. */
  attempts?: number;
  /** Delay in milliseconds between retry attempts. */
  delayMs?: number;
}

/** Shared client-level configuration applied to all requests issued by an `HttpClient`. */
export interface HttpClientOptions {
  /** Optional base URL used to resolve relative request paths. */
  baseUrl?: string;
  /** Default headers merged into every request. */
  headers?: HeadersInit;
  /** Default retry policy applied when a request does not override it. */
  retry?: HttpRetryOptions;
  /** Default timeout in milliseconds for each request. */
  timeoutMs?: number;
  /** Custom fetch implementation used to execute requests. */
  fetch?: typeof fetch;
}

/** Per-request overrides accepted by `HttpClient` request helpers. */
export interface HttpRequestOptions {
  /** Additional headers merged into the request. */
  headers?: HeadersInit;
  /** Request body sent with non-GET requests. */
  body?: BodyInit | null;
  /** Abort signal used to cancel the request. */
  signal?: AbortSignal;
  /** Retry policy override for this specific request. */
  retry?: HttpRetryOptions;
  /** Timeout override in milliseconds for this specific request. */
  timeoutMs?: number;
}

/** Error raised when an HTTP response completes with a non-success status code. */
export class HttpResponseError extends Error {
  /** Uppercase HTTP method used for the failed request. */
  readonly method: string;
  /** Fully resolved request URL. */
  readonly url: string;
  /** Numeric HTTP status code returned by the server. */
  readonly status: number;
  /** HTTP status text returned by the server. */
  readonly statusText: string;
  /** Original response associated with the failure. */
  readonly response: Response;

  /** Creates an error from a failed HTTP response. */
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

/** Supported HTTP methods exposed by the Mainz HTTP client. */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Small fluent HTTP client with retry and timeout support. */
export class HttpClient {
  private readonly baseUrl?: string;
  private readonly defaultHeaders: Headers;
  private readonly defaultRetry: Required<HttpRetryOptions>;
  private readonly defaultTimeoutMs?: number;
  private readonly fetchImpl: typeof fetch;

  /** Creates a new HTTP client instance with shared defaults. */
  constructor(options: HttpClientOptions = {}) {
    this.baseUrl = options.baseUrl;
    this.defaultHeaders = new Headers(options.headers);
    this.defaultRetry = normalizeRetryOptions(options.retry);
    this.defaultTimeoutMs = normalizeTimeoutMs(options.timeoutMs);
    this.fetchImpl = options.fetch ?? fetch;
  }

  /** Creates a GET request handle. */
  get(path: string, options?: HttpRequestOptions): HttpRequest {
    return this.createRequest("GET", path, options);
  }

  /** Creates a POST request handle. */
  post(path: string, options?: HttpRequestOptions): HttpRequest {
    return this.createRequest("POST", path, options);
  }

  /** Creates a PUT request handle. */
  put(path: string, options?: HttpRequestOptions): HttpRequest {
    return this.createRequest("PUT", path, options);
  }

  /** Creates a PATCH request handle. */
  patch(path: string, options?: HttpRequestOptions): HttpRequest {
    return this.createRequest("PATCH", path, options);
  }

  /** Creates a DELETE request handle. */
  delete(path: string, options?: HttpRequestOptions): HttpRequest {
    return this.createRequest("DELETE", path, options);
  }

  /** Builds a lazily executed request handle for the provided method and path. */
  private createRequest(
    method: HttpMethod,
    path: string,
    options?: HttpRequestOptions,
  ): HttpRequest {
    return new HttpRequest(this, method, path, options);
  }

  /** Executes a request immediately and returns the successful response. */
  async execute(
    method: HttpMethod,
    path: string,
    options: HttpRequestOptions = {},
  ): Promise<Response> {
    const url = resolveRequestUrl(path, this.baseUrl);
    const headers = new Headers(this.defaultHeaders);
    mergeHeaders(headers, options.headers);

    const retry = normalizeRetryOptions(options.retry ?? this.defaultRetry);
    const timeoutMs = normalizeTimeoutMs(
      options.timeoutMs ?? this.defaultTimeoutMs,
    );
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
          if (
            attempt < retry.attempts &&
            shouldRetryResponse(method, response.status)
          ) {
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

    throw new Error(
      `HTTP ${method} ${url} failed without returning a response.`,
    );
  }
}

/** Lazily executed request wrapper produced by `HttpClient` helper methods. */
export class HttpRequest {
  private responsePromise?: Promise<Response>;

  /** Creates a request wrapper bound to a client and request configuration. */
  constructor(
    private readonly client: HttpClient,
    private readonly method: HttpMethod,
    private readonly path: string,
    private readonly options: HttpRequestOptions = {},
  ) {}

  /** Resolves and returns the full HTTP response. */
  async response(): Promise<Response> {
    const response = await this.getResponse();
    return response.clone();
  }

  /** Resolves the response body as JSON. */
  async json<T>(): Promise<T> {
    const response = await this.getResponse();
    return await response.clone().json() as T;
  }

  /** Resolves the response body as text. */
  async text(): Promise<string> {
    const response = await this.getResponse();
    return await response.clone().text();
  }

  /** Resolves the response body as a blob. */
  async blob(): Promise<Blob> {
    const response = await this.getResponse();
    return await response.clone().blob();
  }

  /** Memoizes the underlying response promise for repeated body readers. */
  private getResponse(): Promise<Response> {
    if (!this.responsePromise) {
      this.responsePromise = this.client.execute(
        this.method,
        this.path,
        this.options,
      );
    }

    return this.responsePromise;
  }
}

function mergeHeaders(target: Headers, source: HeadersInit | undefined): void {
  if (!source) {
    return;
  }

  const resolved = new Headers(source);
  resolved.forEach((value, key) => {
    target.set(key, value);
  });
}

function normalizeRetryOptions(
  options: HttpRetryOptions | undefined,
): Required<HttpRetryOptions> {
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

function createRequestControl(
  signal: AbortSignal | undefined,
  timeoutMs: number | undefined,
): {
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
