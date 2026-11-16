
export class BrazierError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "BrazierError";
    }
}

export class BrazierHttpError extends BrazierError {
    constructor(
        public readonly status: number,
        public readonly statusText: string,
        public readonly data: unknown,
        public readonly headers: Headers
    ) {
        super(`HTTP ${status}: ${statusText}`);
        this.name = "BrazierHttpError";
    }
}

export class BrazierNetworkError extends BrazierError {
    constructor(public readonly cause: unknown) {
        super("A network error occurred");
        this.name = "BrazierNetworkError";
    }
}

export class BrazierParseError extends BrazierError {
    constructor(public readonly cause: unknown) {
        super("Failed to parse server response");
        this.name = "BrazierParseError";
    }
}