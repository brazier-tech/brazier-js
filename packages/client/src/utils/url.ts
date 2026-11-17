import type { BrazierQueryParams } from "../types/client.types.js";

/** Validate and normalise the configured server URL. */
export function normaliseBaseUrl(input: string | URL): URL {
    let url: URL;

    try {
        url = new URL(input.toString());
    } catch (cause) {
        throw new TypeError(`Invalid brazier baseUrl: ${String(cause)}`);
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new TypeError("brazier baseUrl must use HTTP or HTTPS.");
    }

    if (url.search || url.hash) {
        throw new TypeError("brazier baseUrl must not contain a query or fragment.");
    }

    url.pathname = `${url.pathname.replace(/\/+$/, "")}/`;
    return url;
}

/**
 * Resolve a relative endpoint against the configured base URL.
 * Leading slashes on endpoint paths are intentionally treated as relative to
 * baseUrl, so a base URL such as https://host.example/api/ remains useful.
 */
export function buildRequestUrl(
    baseUrl: URL,
    path: string,
    params?: BrazierQueryParams | URLSearchParams
): URL {
    if (typeof path !== "string") {
        throw new TypeError("The request path must be a string.");
    }

    if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith("//")) {
        throw new TypeError("Request paths must be relative to the configured baseUrl.");
    }

    const relativePath = path.replace(/^\/+/, "");
    const url = new URL(relativePath, baseUrl);

    if (params instanceof URLSearchParams) {
        params.forEach((value, key) => url.searchParams.append(key, value));
        return url;
    }

    if (params) {
        for (const [key, value] of Object.entries(params)) {
            if (value === null || value === undefined) {
                continue;
            }

            // Supplied params replace any existing values for the same key.
            url.searchParams.delete(key);

            if (Array.isArray(value)) {
                for (const item of value) {
                    url.searchParams.append(key, String(item));
                }
            } else {
                url.searchParams.set(key, String(value));
            }
        }
    }

    return url;
}
