import {
    BrazierHttpError,
    BrazierNetworkError,
} from "./errors/brazier-error.js";
import { InterceptorManager } from "./interceptors/interceptor-manager.js";
import type {
    BrazierClientConfig,
    BrazierRequestOptions,
    BrazierResponseType,
} from "./types/client.types.js";
import type {
    BrazierErrorInterceptor,
    BrazierRequestContext,
    BrazierRequestInterceptor,
    BrazierResponseInterceptor,
} from "./types/interceptor.types.js";
import type { BrazierResponse } from "./types/response.types.js";
import { parseResponseBody } from "./utils/response.js";
import { buildRequestUrl, normaliseBaseUrl } from "./utils/url.js";

export class BrazierClient {
    private readonly baseUrl: URL;
    private readonly defaultHeaders: Headers;
    private readonly defaultCredentials: RequestCredentials;
    private readonly fetcher: typeof fetch;

    readonly interceptors: {
        request: InterceptorManager<BrazierRequestInterceptor>;
        response: InterceptorManager<BrazierResponseInterceptor>;
        error: InterceptorManager<BrazierErrorInterceptor>;
    };

    constructor(config: BrazierClientConfig) {
        this.baseUrl = normaliseBaseUrl(config.baseUrl);
        this.defaultHeaders = new Headers(config.headers);
        this.defaultCredentials = config.credentials ?? "same-origin";

        const globalFetch =
            typeof globalThis.fetch === "function"
                ? globalThis.fetch.bind(globalThis)
                : undefined;
        const fetcher = config.fetch ?? globalFetch;

        if (!fetcher) {
            throw new Error(
                "Fetch is not available in this runtime. Supply a fetch implementation in BrazierClientConfig."
            );
        }

        this.fetcher = fetcher;
        this.interceptors = {
            request: new InterceptorManager<BrazierRequestInterceptor>(),
            response: new InterceptorManager<BrazierResponseInterceptor>(),
            error: new InterceptorManager<BrazierErrorInterceptor>(),
        };
    }

    /** Execute an HTTP request and return a normalised response. */
    async request<T = unknown>(
        path: string,
        options: BrazierRequestOptions = {}
    ): Promise<BrazierResponse<T>> {
        const url = buildRequestUrl(this.baseUrl, path, options.params);
        const method = (options.method ?? "GET").toUpperCase();
        const headers = this.createHeaders(options.headers);
        const hasJson = Object.prototype.hasOwnProperty.call(options, "json");

        if (hasJson && options.body !== undefined) {
            throw new TypeError("Specify either 'json' or 'body', not both.");
        }

        let body: BodyInit | null | undefined = options.body;

        if (hasJson) {
            const serialised = JSON.stringify(options.json);
            if (serialised === undefined) {
                throw new TypeError("The supplied json value cannot be serialised.");
            }

            body = serialised;
            if (!headers.has("Content-Type")) {
                headers.set("Content-Type", "application/json");
            }
        }

        if (!headers.has("Accept")) {
            headers.set("Accept", "application/json");
        }

        if ((method === "GET" || method === "HEAD") && body != null) {
            throw new TypeError(`${method} requests cannot have a request body.`);
        }

        const {
            method: _method,
            headers: _headers,
            body: _body,
            json: _json,
            params: _params,
            responseType = "auto",
            ...fetchOptions
        } = options;

        const init: RequestInit = {
            ...fetchOptions,
            method,
            headers,
            credentials: options.credentials ?? this.defaultCredentials,
        };

        if (body !== undefined) {
            init.body = body;
        }

        let context: BrazierRequestContext = { url, init };

        try {
            // 1. Request interceptors run in registration order.
            for (const interceptor of this.interceptors.request.getHandlers()) {
                const replacement = await interceptor(context);
                if (replacement) {
                    context = replacement;
                }
            }

            // A request interceptor may have replaced the URL or Fetch options.
            if (!(context.url instanceof URL)) {
                throw new TypeError("A request interceptor must provide a valid URL.");
            }

            // 2. Perform the HTTP request.
            let rawResponse: Response;
            try {
                rawResponse = await this.fetcher(context.url, context.init);
            } catch (error) {
                if (isAbortError(error)) {
                    throw error;
                }
                throw new BrazierNetworkError(error);
            }

            // 3. Response interceptors run before parsing and HTTP status handling.
            for (const interceptor of this.interceptors.response.getHandlers()) {
                rawResponse = await interceptor(rawResponse, context);
            }

            // 4. Parse the body, including bodies on non-2xx responses.
            const data = await parseResponseBody(rawResponse, responseType);
            const result: BrazierResponse<unknown> = {
                data,
                status: rawResponse.status,
                statusText: rawResponse.statusText,
                headers: rawResponse.headers,
                url: rawResponse.url || context.url.toString(),
                redirected: rawResponse.redirected,
            };

            // 5. Fetch resolves for HTTP errors too, so handle status explicitly.
            if (!rawResponse.ok) {
                throw new BrazierHttpError(result);
            }

            return result as BrazierResponse<T>;
        } catch (error) {
            throw await this.runErrorInterceptors(toError(error), context);
        }
    }

    get<T = unknown>(
        path: string,
        options: Omit<BrazierRequestOptions, "method" | "body" | "json"> = {}
    ): Promise<BrazierResponse<T>> {
        return this.request<T>(path, { ...options, method: "GET" });
    }

    post<T = unknown>(
        path: string,
        json: unknown,
        options: Omit<BrazierRequestOptions, "method" | "body" | "json"> = {}
    ): Promise<BrazierResponse<T>> {
        return this.request<T>(path, { ...options, method: "POST", json });
    }

    put<T = unknown>(
        path: string,
        json: unknown,
        options: Omit<BrazierRequestOptions, "method" | "body" | "json"> = {}
    ): Promise<BrazierResponse<T>> {
        return this.request<T>(path, { ...options, method: "PUT", json });
    }

    patch<T = unknown>(
        path: string,
        json: unknown,
        options: Omit<BrazierRequestOptions, "method" | "body" | "json"> = {}
    ): Promise<BrazierResponse<T>> {
        return this.request<T>(path, { ...options, method: "PATCH", json });
    }

    delete<T = unknown>(
        path: string,
        options: Omit<BrazierRequestOptions, "method" | "body" | "json"> = {}
    ): Promise<BrazierResponse<T>> {
        return this.request<T>(path, { ...options, method: "DELETE" });
    }

    head(
        path: string,
        options: Omit<BrazierRequestOptions, "method" | "body" | "json"> = {}
    ): Promise<BrazierResponse<undefined>> {
        return this.request<undefined>(path, { ...options, method: "HEAD" });
    }

    options<T = unknown>(
        path: string,
        options: Omit<BrazierRequestOptions, "method"> = {}
    ): Promise<BrazierResponse<T>> {
        return this.request<T>(path, { ...options, method: "OPTIONS" });
    }

    private createHeaders(requestHeaders?: HeadersInit): Headers {
        const headers = new Headers(this.defaultHeaders);
        new Headers(requestHeaders).forEach((value, key) => {
            headers.set(key, value);
        });
        return headers;
    }

    private async runErrorInterceptors(
        initialError: Error,
        context: BrazierRequestContext
    ): Promise<Error> {
        let currentError = initialError;

        for (const interceptor of this.interceptors.error.getHandlers()) {
            try {
                const replacement = await interceptor(currentError, context);
                if (replacement !== undefined) {
                    currentError = toError(replacement);
                }
            } catch (interceptorError) {
                // Keep the pipeline running; later error interceptors see this error.
                currentError = toError(interceptorError);
            }
        }

        return currentError;
    }
}

function isAbortError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as { name?: unknown }).name === "AbortError"
    );
}

function toError(value: unknown): Error {
    if (value instanceof Error) {
        return value;
    }

    return new Error(
        typeof value === "string" ? value : "An unknown error occurred.",
        { cause: value }
    );
}
