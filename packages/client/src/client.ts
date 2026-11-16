import type { BrazierClientConfig, BrazierRequestOptions, BrazierResponse } from './types/client.types';
import type { BrazierResponseInterceptor, BrazierRequestInterceptor, BrazierErrorInterceptor, BrazierRequestContext } from './types/interceptor.types';

import { InterceptorManager } from './interceptor';

import { BrazierError, BrazierHttpError, BrazierNetworkError, BrazierParseError } from './error';

export class BrazierClient {
    private readonly baseUrl: URL;
    private readonly defaultHandlers: Headers;
    private readonly fetcher: typeof fetch;

    public readonly interceptors: {
        request: InterceptorManager<BrazierRequestInterceptor>;
        response: InterceptorManager<BrazierResponseInterceptor>;
        error: InterceptorManager<BrazierErrorInterceptor>;
    }

    constructor(config: BrazierClientConfig) {
        this.baseUrl = new URL(
            config.baseUrl.endsWith("/") ? config.baseUrl : `${config.baseUrl}/`
        );

        this.defaultHandlers = new Headers(config.headers);
        this.fetcher = config.fetch ?? fetch;
        this.interceptors = {
            request: new InterceptorManager(),
            response: new InterceptorManager(),
            error: new InterceptorManager()
        }
    }

    async request<T>(path: string, options: BrazierRequestOptions = {}): Promise<BrazierResponse<T>> {
        const url = new URL(path.replace(/^\/+/, ""), this.baseUrl);

        // query parameters
        for(const [key, value] of Object.entries(options.params ?? {})) {
            url.searchParams.set(key, String(value));
        }

        // merge headers with default
        const headers = new Headers(this.defaultHandlers);

        new Headers(options.headers).forEach((value, key) => {
            headers.set(key, value);
        });

        if(options.json !== undefined) {
            if(options.body !== undefined)
                throw new TypeError("Specify either 'body' or 'json', but not both");

            headers.set("Content-Type", "application/json");
        }

        if(!headers.has("Accept")) {
            headers.set("Accept", "application/json");
        }

        const body = options.json !== undefined ? JSON.stringify(options.json) : (options.body ?? null);

        const {params, json, ...requestOptions} = options;

        let context: BrazierRequestContext = {
            url,
            init: {
                ...requestOptions,
                headers,
                body,
            },
        }

        try {
            // request interceptors
            for (const interceptor of this.interceptors.request.getHandlers()) {
                const result = await interceptor(context);

                if(result) {
                    context = result;
                }
            }

            // send request
            let response: Response;
            try {
                response = await this.fetcher(context.url, context.init);
            } catch (e) {
                if(e instanceof Error && e.name === "AbortError")
                    throw e;

                throw new BrazierNetworkError(e);
            }

            // response interceptors
            for (const interceptor of this.interceptors.response.getHandlers()) {
                    response = await interceptor(response, context);
            }

            // parse response
            const data = await this.parseResponse(response);

            if(!response.ok) {
                throw new BrazierHttpError(
                    response.status,
                    response.statusText,
                    data,
                    response.headers
                );
            }

            return {
                data: data as T,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
            }
        } catch(e) {
            let currentError = e instanceof Error ? e : new Error(String(e));

            for (const interceptor of this.interceptors.error.getHandlers()) {
                currentError = await interceptor(currentError, context);
            }

            throw currentError;
        }
    }

    private async parseResponse(response: Response): Promise<unknown> {
        if(response.status === 204 || response.status === 205) {
            return undefined;
        }

        const text = await response.text();

        if(!text) {
            return undefined;
        }

        const contentType = response.headers.get("Content-Type") ?? "";

        if(contentType.includes("application/json") || contentType.includes("+json")) {
            try {
                return JSON.parse(text);
            } catch (e) {
                throw new BrazierParseError(e);
            }
        }

        return text;
    }

    get<T>(path: string, options: Omit<BrazierRequestOptions, "method" | "body" | "json"> = {}): Promise<BrazierResponse<T>> {
        return this.request<T>(path, {
            ...options,
            method: "GET",
        });
    }

    post<T>(path: string, json: unknown, options: Omit<BrazierRequestOptions, "method" | "body" | "json"> = {}): Promise<BrazierResponse<T>> {
      return this.request<T>(path, {
        ...options,
        method: "POST",
        json,
      });
    }

    put<T>(path: string, json: unknown, options: Omit<BrazierRequestOptions, "method" | "body" | "json"> = {}): Promise<BrazierResponse<T>> {
        return this.request<T>(path, {
            ...options,
            method: "PUT",
            json,
        });
    }

    patch<T>(path: string, json: unknown, options: Omit<BrazierRequestOptions, "method" | "body" | "json"> = {}): Promise<BrazierResponse<T>> {
        return this.request<T>(path, {
            ...options,
            method: "PATCH",
            json,
        });
    }

    delete<T = void>(path: string, options: Omit<BrazierRequestOptions, "method" | "body" | "json"> = {}): Promise<BrazierResponse<T>> {
        return this.request<T>(path, {
            ...options,
            method: "DELETE",
        });
    }
}