import type { BrazierResponse } from "../types/response.types.js";

/** Base class for errors raised by @brazier/client. */
export class BrazierError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = new.target.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/** An HTTP response was received, but its status was outside the 2xx range. */
export class BrazierHttpError extends BrazierError {
    constructor(public readonly response: BrazierResponse<unknown>) {
        super(`HTTP ${response.status}: ${response.statusText || "Request failed"}`);
    }

    get status(): number {
        return this.response.status;
    }

    get data(): unknown {
        return this.response.data;
    }
}

/** Fetch failed before an HTTP response could be obtained. */
export class BrazierNetworkError extends BrazierError {
    constructor(cause: unknown) {
        super("The request failed before an HTTP response was received.", {
            cause,
        });
    }
}

/** The response body could not be read or parsed as requested. */
export class BrazierParseError extends BrazierError {
    constructor(
        message: string,
        cause: unknown,
        public readonly status?: number
    ) {
        super(message, { cause });
    }
}
