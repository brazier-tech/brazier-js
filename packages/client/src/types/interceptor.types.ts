/** Mutable request state passed through request interceptors. */
export interface BrazierRequestContext {
    url: URL;
    init: RequestInit;
}

/**
 * Runs before Fetch. Mutate context or return a replacement context.
 * Interceptors execute in registration order.
 */
export type BrazierRequestInterceptor = (
    context: BrazierRequestContext
) =>
    | void
    | BrazierRequestContext
    | Promise<void | BrazierRequestContext>;

/**
 * Runs after Fetch and before response parsing, including for non-2xx
 * responses. Return the Response to pass to the next stage. Use clone() if
 * inspecting the body so the client can still read it.
 */
export type BrazierResponseInterceptor = (
    response: Response,
    context: BrazierRequestContext
) => Response | Promise<Response>;

/**
 * Runs when a request pipeline stage throws. Return an Error to replace the
 * current error, or return void to leave it unchanged.
 */
export type BrazierErrorInterceptor = (
    error: Error,
    context: BrazierRequestContext
) => Error | void | Promise<Error | void>;

export type BrazierInterceptorId = number;
