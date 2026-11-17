# @brazier/client

A small TypeScript HTTP client for applications that communicate with a brazier-powered API. It wraps Fetch with URL construction, JSON handling, normalised responses, typed errors, and request/response/error interceptors.

## Requirements

- Node.js 18 or newer, or a modern browser with Fetch, `URL`, `Headers`, and `Response` support.
- TypeScript 5.7 or newer when consuming the TypeScript declarations.

## Installation

```bash
npm install @brazier/client
```

## Basic usage

```ts
import { BrazierClient } from "@brazier/client";

interface User {
    id: number;
    name: string;
}

const client = new BrazierClient({
    baseUrl: "http://localhost:3501/api/",
});

const response = await client.get<User[]>("/users", {
    params: { page: 1, limit: 20 },
});

console.log(response.data);
console.log(response.status);
```

The configured `baseUrl` may be the server root (`http://localhost:3501/`) or an API prefix (`http://localhost:3501/api/`). Endpoint paths are resolved beneath that base path. Leading slashes on endpoint paths do not discard the configured base path.

## Sending JSON

```ts
const created = await client.post<User>("/users", {
    name: "Ada",
});

await client.patch<User>(`/users/${created.data.id}`, {
    name: "Ada Lovelace",
});

await client.delete(`/users/${created.data.id}`);
```

Use `request()` when you need a non-JSON body or a less common method:

```ts
await client.request("/uploads", {
    method: "POST",
    body: formData,
});
```

`json` and `body` cannot be supplied together. `GET` and `HEAD` requests cannot have a body.

## Configuration

```ts
const client = new BrazierClient({
    baseUrl: "https://api.example.com/v1/",
    headers: {
        Accept: "application/json",
        "X-Application": "dashboard",
    },
    credentials: "include",
});
```

Per-request headers override matching default headers. Per-request `credentials` overrides the configured default. The default credentials policy is `same-origin`.

A custom Fetch implementation can be supplied through `fetch`, which is useful in tests or runtimes with a custom transport.

## Interceptors

Interceptors run in registration order. `use()` returns an ID; pass it to `eject()` to unregister the interceptor.

```ts
const authInterceptorId = client.interceptors.request.use((context) => {
    const headers = new Headers(context.init.headers);
    headers.set("Authorization", `Bearer ${getAccessToken()}`);
    context.init.headers = headers;
});

client.interceptors.response.use((response) => {
    console.debug("brazier response:", response.status);
    return response;
});

client.interceptors.error.use((error) => {
    reportError(error);
    // Return void to preserve the original error.
});

// Later, for example on logout:
client.interceptors.request.eject(authInterceptorId);
```

Request interceptors can mutate the request context or return a replacement context. Response interceptors must return a `Response`; use `response.clone()` if you need to inspect its body without consuming the body that the client will parse. Error interceptors can return a replacement `Error`, or return `void` to preserve the current error. Throwing from an error interceptor replaces the error passed to later error interceptors.

## Responses and errors

Successful requests resolve to:

```ts
interface BrazierResponse<T> {
    data: T;
    status: number;
    statusText: string;
    headers: Headers;
    url: string;
    redirected: boolean;
}
```

By default, `responseType: "auto"` parses JSON when the response content type is `application/json` or a `+json` media type; otherwise it returns text. You can request `json`, `text`, `blob`, `arrayBuffer`, or `formData` explicitly.

Non-2xx responses reject with `BrazierHttpError`, which exposes `status`, `data`, and the complete normalised `response`. Fetch/network failures reject with `BrazierNetworkError`. Body-reading or JSON-parsing failures reject with `BrazierParseError`. Abort errors are passed through without being relabelled as network failures.

The generic type supplied to `get<T>()` or `request<T>()` is a compile-time assertion; it does not validate data received from the server at runtime.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```
