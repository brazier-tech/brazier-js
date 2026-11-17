import { describe, expect, it, vi } from "vitest";
import {
    BrazierClient,
    BrazierHttpError,
    BrazierNetworkError,
    BrazierParseError,
} from "../packages/client/src/index.js";

function makeClient(fetchMock: typeof fetch, baseUrl = "https://example.test/api/") {
    return new BrazierClient({ baseUrl, fetch: fetchMock });
}

describe("BrazierClient", () => {
    it("builds a request URL, merges headers, and parses JSON", async () => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
            new Response(JSON.stringify([{ id: 1 }]), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            })
        );
        const client = new BrazierClient({
            baseUrl: "https://example.test/api",
            headers: { "X-Client": "brazier" },
            fetch: fetchMock,
        });

        const result = await client.get<Array<{ id: number }>>("/users?active=true", {
            headers: { "X-Request": "test" },
            params: { page: 2, tag: ["a", "b"], ignored: null },
        });

        expect(result.data).toEqual([{ id: 1 }]);
        expect(result.status).toBe(200);
        expect(result.headers.get("content-type")).toBe("application/json");

        const [input, init] = fetchMock.mock.calls[0]!;
        expect(String(input)).toBe(
            "https://example.test/api/users?active=true&page=2&tag=a&tag=b"
        );
        expect(new Headers(init?.headers).get("x-client")).toBe("brazier");
        expect(new Headers(init?.headers).get("x-request")).toBe("test");
        expect(init?.method).toBe("GET");
    });

    it("serialises JSON request bodies and sets content type", async () => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
            new Response(JSON.stringify({ id: 7 }), {
                status: 201,
                headers: { "Content-Type": "application/json" },
            })
        );
        const client = makeClient(fetchMock);

        await client.post("/users", { name: "Ada" });

        const [, init] = fetchMock.mock.calls[0]!;
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ name: "Ada" }));
        expect(new Headers(init?.headers).get("content-type")).toBe("application/json");
    });

    it("runs request and response interceptors in registration order", async () => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
            new Response("ok", { status: 200 })
        );
        const client = makeClient(fetchMock);
        const order: string[] = [];

        client.interceptors.request.use((context) => {
            order.push("request-1");
            const headers = new Headers(context.init.headers);
            headers.set("X-First", "yes");
            context.init.headers = headers;
        });
        client.interceptors.request.use(() => {
            order.push("request-2");
        });
        client.interceptors.response.use((response) => {
            order.push("response-1");
            return response;
        });
        client.interceptors.response.use((response) => {
            order.push("response-2");
            return response;
        });

        await client.get("/health");

        expect(order).toEqual([
            "request-1",
            "request-2",
            "response-1",
            "response-2",
        ]);
        const [, init] = fetchMock.mock.calls[0]!;
        expect(new Headers(init?.headers).get("x-first")).toBe("yes");
    });

    it("supports ejecting interceptors", async () => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
            new Response("ok", { status: 200 })
        );
        const client = makeClient(fetchMock);
        const interceptor = vi.fn(() => undefined);
        const id = client.interceptors.request.use(interceptor);

        client.interceptors.request.eject(id);
        await client.get("/health");

        expect(interceptor).not.toHaveBeenCalled();
    });

    it("throws BrazierHttpError for non-2xx responses and exposes parsed data", async () => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
            new Response(JSON.stringify({ message: "Not found" }), {
                status: 404,
                statusText: "Not Found",
                headers: { "Content-Type": "application/json" },
            })
        );
        const client = makeClient(fetchMock);

        await expect(client.get("/missing")).rejects.toMatchObject({
            constructor: BrazierHttpError,
            status: 404,
            data: { message: "Not found" },
        });
    });

    it("wraps Fetch failures as BrazierNetworkError", async () => {
        const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline"));
        const client = makeClient(fetchMock);

        await expect(client.get("/users")).rejects.toBeInstanceOf(BrazierNetworkError);
    });

    it("runs error interceptors and permits replacing an error", async () => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
            new Response("no", { status: 500, statusText: "Server Error" })
        );
        const client = makeClient(fetchMock);
        const replacement = new Error("reported failure");
        const seen: string[] = [];

        client.interceptors.error.use((error) => {
            seen.push(error.name);
        });
        client.interceptors.error.use(() => replacement);

        await expect(client.get("/failure")).rejects.toBe(replacement);
        expect(seen).toContain("BrazierHttpError");
    });

    it("parses non-JSON responses as text in auto mode", async () => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
            new Response("healthy", {
                status: 200,
                headers: { "Content-Type": "text/plain" },
            })
        );
        const client = makeClient(fetchMock);

        const result = await client.get<string>("/health");
        expect(result.data).toBe("healthy");
    });

    it("throws BrazierParseError for malformed JSON", async () => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
            new Response("{invalid", {
                status: 200,
                headers: { "Content-Type": "application/json" },
            })
        );
        const client = makeClient(fetchMock);

        await expect(client.get("/invalid-json")).rejects.toBeInstanceOf(BrazierParseError);
    });

    it("does not wrap AbortError as a network error", async () => {
        const abortError = new DOMException("Aborted", "AbortError");
        const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(abortError);
        const client = makeClient(fetchMock);

        await expect(client.get("/slow")).rejects.toBe(abortError);
    });
});
