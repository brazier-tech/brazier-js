/** Normalised result returned by every successful client request. */
export interface BrazierResponse<T> {
    data: T;
    status: number;
    statusText: string;
    headers: Headers;
    /** Final response URL, including any redirects. */
    url: string;
    redirected: boolean;
}
