export interface BrazierClientConfig {
    baseUrl: string;
    headers?: HeadersInit;
    credentials?: RequestCredentials;
    fetch?: typeof fetch;
}

export interface BrazierRequestOptions {
    method?: string;
    headers?: HeadersInit;
    params?: Record<string, string | number | boolean>;
    body?: BodyInit | null;
    json?: unknown;
    signal?: AbortSignal;
}

export interface BrazierResponse<T> {
    data: T;
    status: number;
    statusText: string;
    headers: Headers;
}