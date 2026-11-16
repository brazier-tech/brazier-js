export interface BrazierRequestContext {
    url: URL;
    init: RequestInit;
}

export type BrazierRequestInterceptor = (
    context: BrazierRequestContext
) => void | BrazierRequestContext | Promise<void | BrazierRequestContext>;

export type BrazierResponseInterceptor = (
    response: Response,
    context: BrazierRequestContext
) => Response | Promise<Response>;

export type BrazierErrorInterceptor = (
    error: Error,
    context: BrazierRequestContext
) => Error | Promise<Error>