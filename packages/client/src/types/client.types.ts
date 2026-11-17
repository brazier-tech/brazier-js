/** Values accepted by a query-string parameter. */
export type BrazierQueryParamPrimitive = string | number | boolean;

export type BrazierQueryParamValue =
    | BrazierQueryParamPrimitive
    | readonly BrazierQueryParamPrimitive[]
    | null
    | undefined;

export type BrazierQueryParams = Readonly<
    Record<string, BrazierQueryParamValue>
>;

/** Supported response-body parsing strategies. */
export type BrazierResponseType =
    | "auto"
    | "json"
    | "text"
    | "blob"
    | "arrayBuffer"
    | "formData";

/** Configuration shared by all requests made by a client instance. */
export interface BrazierClientConfig {
    /** Server origin or API base path, e.g. https://example.com/api/. */
    baseUrl: string | URL;
    /** Headers included in every request unless overridden per request. */
    headers?: HeadersInit;
    /** Fetch credentials policy; defaults to "same-origin". */
    credentials?: RequestCredentials;
    /**
     * Optional Fetch implementation. Useful for tests, Node runtimes, and
     * applications with a custom Fetch implementation.
     */
    fetch?: typeof fetch;
}

/** Options accepted by request() and the HTTP convenience methods. */
export interface BrazierRequestOptions
    extends Omit<RequestInit, "method" | "headers" | "body"> {
    method?: string;
    headers?: HeadersInit;
    body?: BodyInit | null;
    /** JSON value to serialise as the request body. Cannot be combined with body. */
    json?: unknown;
    /** Query parameters appended to the URL. */
    params?: BrazierQueryParams | URLSearchParams;
    /** How the response body should be parsed. Defaults to "auto". */
    responseType?: BrazierResponseType;
}
