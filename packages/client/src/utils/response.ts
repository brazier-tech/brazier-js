import { BrazierParseError } from "../errors/brazier-error.js";
import type { BrazierResponseType } from "../types/client.types.js";

function isJsonContentType(contentType: string): boolean {
    const mimeType = contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
    return mimeType === "application/json" || mimeType.endsWith("+json");
}

async function readText(response: Response): Promise<string> {
    try {
        return await response.text();
    } catch (cause) {
        throw new BrazierParseError(
            "Failed to read the response body.",
            cause,
            response.status
        );
    }
}

function parseJson(text: string, response: Response): unknown {
    if (text.length === 0) {
        return undefined;
    }

    try {
        return JSON.parse(text) as unknown;
    } catch (cause) {
        throw new BrazierParseError(
            "The server returned a response that is not valid JSON.",
            cause,
            response.status
        );
    }
}

/** Parse a Fetch Response without assuming every response contains JSON. */
export async function parseResponseBody(
    response: Response,
    responseType: BrazierResponseType
): Promise<unknown> {
    if (response.status === 204 || response.status === 205) {
        return undefined;
    }

    try {
        switch (responseType) {
            case "json": {
                const text = await readText(response);
                return parseJson(text, response);
            }
            case "text":
                return await readText(response);
            case "blob":
                return await response.blob();
            case "arrayBuffer":
                return await response.arrayBuffer();
            case "formData":
                return await response.formData();
            case "auto":
            default: {
                const contentType = response.headers.get("Content-Type") ?? "";
                const text = await readText(response);
                return isJsonContentType(contentType)
                    ? parseJson(text, response)
                    : text.length > 0
                        ? text
                        : undefined;
            }
        }
    } catch (error) {
        if (error instanceof BrazierParseError) {
            throw error;
        }

        throw new BrazierParseError(
            `Failed to read the response as ${responseType}.`,
            error,
            response.status
        );
    }
}
