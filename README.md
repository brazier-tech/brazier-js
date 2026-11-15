# Brazier Frontend Ecosystem (Design Document)

## Architecture and Design Specification

**Target technologies:** TypeScript, JavaScript, React.  
**Intended audience:** Brazier contributors and frontend SDK developers

---

## 1. Purpose and objectives

The purpose of the Brazier Frontend Ecosystem is to provide a unified collection of JavaScript and TypeScript libraries for interacting with applications built using the Brazier C++ framework.

The ecosystem should reduce the amount of repetitive code required to communicate with Brazier backends while providing developers with a consistent API for HTTP communication, asynchronous state management, error handling and real-time communication.

### 1.1. Primary objectives

- Provide a centralised and configurable HTTP client.
- Eliminate repetitive manual `fetch()` calls and response handling.
- Offer React hooks and context providers for convenient application integration.
- Provide predictable and consistent error handling.
- Support TypeScript throughout the ecosystem.
- Integrate with Brazier's existing HTTP, HTTPS and WebSocket capabilities.
- Allow the ecosystem to evolve alongside the backend framework without creating unnecessary dependencies between them.

### 1.2. Design principles

- **Modularity**. Each package should have a well-defined responsibility and should be usable independently wherever practical.
- **Type safety**. Public interfaces should make extensive use of TypeScript generics and inference. Runtime validation should be available where appropriate.
- **Framework independence**. The core communication library must not depend on React.
- **Extensibility**. Developers should be able to customise request behaviour, authentication, headers, error handling and other aspects without modifying the SDK.
- **Minimal abstraction**. The SDK should simplify common operations without hiding HTTP semantics or preventing developers from using features outside its scope.
- **Predictability**. Similar operations should behave consistently throughout the ecosystem.

---

## 2. Package architecture

The ecosystem should initially consist of two primary packages, with additional packages introduced as the project matures.

### 2.1. `@brazier/client`

**Purpose:** Provide the fundamental interface for communicating with Brazier-powered HTTP APIs.

This package is responsible for all HTTP communication and should be completely independent of React. It provides a centralised implementation of request construction, transmission, response processing and error handling.

#### Features

| Feature          | Description                                               |
| ---------------- | --------------------------------------------------------- |
| HTTP methods     | GET, POST, PUT, PATCH, DELETE, HEAD and OPTIONS           |
| Base URL         | Centralised API endpoint configuration                    |
| Headers          | Global and request-specific HTTP headers                  |
| Serialisation    | Automatic JSON serialisation and deserialisation          |
| Query parameters | Convenient URL query parameter construction               |
| Authentication   | Configurable authentication headers and credentials       |
| Timeouts         | Configurable request timeouts                             |
| Cancellation     | Integration with `AbortController`                        |
| Error handling   | Standardised errors for failed requests                   |
| Interceptors     | Optional request and response processing                  |
| Custom transport | Support for an injectable Fetch-compatible implementation |

#### Example

```ts
import { createBrazierClient } from "@brazier/client";

export const client = createBrazierClient({
    baseURL: "https://api.example.com",
    timeout: 10000,
    headers: {
        "Content-Type": "application/json"
    }
});
```

The resulting client exposes a convenient interface:

```ts
const users = await client.get<User[]>("/users");

const user = await client.post<User>("/users", {
    name: "John",
    email: "john@example.com"
});
```

The exact interface can be refined during implementation.

#### Responsibilities

The client must:

1. Construct valid HTTP requests.
2. Resolve relative paths against the configured base URL.
3. Apply global and request-specific configuration.
4. Serialise request bodies according to their content types.
5. Execute requests through the configured transport.
6. Parse responses appropriately.
7. Normalise HTTP and network errors.
8. Respect request cancellation and timeouts.

#### Restrictions and considerations

- The client must not assume that every endpoint returns JSON.
- HTTP 204 responses must be supported without attempting to parse a response body.
- FormData, Blob and text responses should be supported where applicable.
- Request-specific configuration must take precedence over global defaults.
- The library must not disable TLS verification.
- Authentication secrets must not be embedded in the distributed frontend bundle.
- Browser cross-origin restrictions remain applicable.
- The client must not assume that every Brazier application follows an identical response structure.

The client should use the Fetch API by default rather than introducing an additional HTTP transport dependency.

---

### 2.2. `@brazier/react`

**Purpose:** Provide React-specific abstractions over `@brazier/client`.

This package should allow developers to consume backend data through hooks instead of manually managing requests, loading states, errors and component lifecycle events.

It should use TanStack Query as its underlying server-state management solution rather than implementing an independent caching system.

#### Features

| Feature            | Description                                                                 
| ------------------ | - |
| Context provider   | Makes the configured Brazier client available throughout the component tree |
| Query hooks        | Fetch and maintain server-side data                                         |
| Mutation hooks     | Execute operations that modify server state                                 |
| Loading states     | Expose request and mutation states                                          |
| Error states       | Expose standardised errors                                                  |
| Refetching         | Allow requests to be executed again                                         |
| Cache management   | Integrate with TanStack Query                                               |
| Cache invalidation | Refresh affected data after mutations                                       |
| Cancellation       | Cancel requests when appropriate                                            |
| Type inference     | Preserve response and request types                                         |

#### Provider

The `BrazierProvider` makes the configured client accessible to components.

```jsx
import { BrazierProvider } from "@brazier/react";

function App() {
    return (
        <BrazierProvider client={client}>
            <Application />
        </BrazierProvider>
    );
}
```

The provider should use React Context internally.

It should not instantiate a new client every time a component renders. The client should normally be created once per application instance and supplied to the provider.

**QueryClient integration:** TanStack Query's `QueryClientProvider` should remain a separate provider. This preserves compatibility with its existing configuration and tooling.

#### Query hooks

Queries are operations that retrieve data from the backend.

```jsx
const { data, error, isLoading, refetch } = useBrazierQuery<User[]>({
    queryKey: ["users"],
    queryFn: (client, signal) =>
        client.get("/users", { signal })
});
```

The hook should expose the standard TanStack Query functionality while supplying the configured Brazier client automatically.

#### Mutation hooks

Mutations represent operations that create, modify or delete backend resources.

```jsx
const {
    mutate,
    isPending,
    error
} = useBrazierMutation<User, CreateUserRequest>({
    mutationFn: (client, request) =>
        client.post("/users", request)
});
```

The developer should be able to customise mutation behaviour, including success and error callbacks and cache invalidation.

#### Responsibilities

`@brazier/react` must:

1. Retrieve the configured client from context.
2. Integrate with React's component lifecycle.
3. Expose query and mutation functionality.
4. Forward cancellation signals to the client.
5. Preserve TypeScript type information.
6. Integrate with TanStack Query's cache.
7. Avoid creating a separate, competing server-state management system.

#### Restrictions and considerations

- Hooks must follow React's Rules of Hooks.
- The package must not depend on the internal implementation of the Brazier C++ framework.
- The package must not maintain a second independent query cache.
- Request cancellation must not be confused with successful completion.
- Cache invalidation should be configurable rather than automatically invalidating every query.
- Components should not need to manage HTTP response parsing themselves.

---

### 2.3. `@brazier/realtime` — future extension

**Purpose:** Provide a unified interface for communicating with Brazier WebSocket endpoints.

Brazier already documents WebSocket routing and session management. A dedicated JavaScript package could expose this functionality to frontend applications.

#### Features

- WebSocket connection establishment.
- Connection lifecycle management.
- Typed message interfaces.
- Event listeners.
- Connection state tracking.
- Automatic reconnection with configurable backoff.
- Message serialisation and deserialisation.
- Optional heartbeat mechanisms.
- Connection authentication strategies.

#### Example

```ts
import { createBrazierSocket } from "@brazier/realtime";

const socket = createBrazierSocket({
    url: "wss://api.example.com/chat"
});

socket.connect();

socket.on("message", message => {
    console.log(message);
});

socket.send({
    type: "chat",
    content: "Hello!"
});
```

React integration could subsequently provide a `useBrazierSocket` hook.

#### Restrictions and considerations

- Reconnection does not automatically restore application-level session state.
- WebSocket delivery must not be assumed to provide exactly-once message semantics.
- Reliable messaging requires application-level acknowledgement, sequencing or persistence where appropriate.
- Browser WebSocket APIs do not offer arbitrary custom handshake headers. Cookie authentication or an explicitly designed application-level authentication mechanism should be used instead.
- Tokens should not be placed in query strings without careful consideration, as URLs may be recorded in logs.
- The backend must validate connection origins and authenticate users independently.

This package should remain optional. Applications that only use HTTP APIs should not need to install it.

---

### 2.4. `@brazier/codegen` — future extension

**Purpose:** Generate TypeScript API definitions from a machine-readable backend API specification.

This is potentially one of the ecosystem's most valuable long-term features.

Instead of manually declaring interfaces in the frontend, developers could generate them from the backend's API contract.

For example, a Brazier backend could eventually expose an OpenAPI specification describing its endpoints, request parameters, request bodies, response structures and status codes.

A code-generation tool could consume this specification and generate TypeScript definitions.

#### Example

Conceptual backend endpoint:

```cpp
R(GET, "/api/users", userController, getUsers);
R(POST, "/api/users", userController, createUser);
R(GET, "/api/users/:id", userController, getUser);
```

Generated TypeScript interface:

```ts
export interface User {
    id: number;
    name: string;
    email: string;
}

export interface CreateUserRequest {
    name: string;
    email: string;
}
```

Generated endpoint definitions could then be consumed by `@brazier/react`.

#### Considerations

- Brazier's current route declarations and handler examples do not, by themselves, provide enough information to infer every request and response type.
- Route registration must eventually be supplemented with explicit schema metadata or another reliable contract-generation mechanism.
- The generator must never invent types based solely on endpoint names or assumptions about handler implementations.
- This package should be considered a separate development milestone, not a requirement for the initial SDK.

---

## 3. Request lifecycle

The following describes the expected lifecycle of a normal HTTP request.

### 3.1. Request flow

1. A React component invokes `useBrazierQuery`.
2. The hook obtains the configured client from `BrazierProvider`.
3. TanStack Query checks whether the requested data is already available in its cache.
4. If a network request is required, the hook invokes the configured query function.
5. The query function calls the appropriate method on `BrazierClient`.
6. The client constructs the request and applies configuration, headers and serialisation.
7. The Fetch API sends the request to the Brazier backend.
8. The Brazier server receives the request and passes it through its middleware and routing system.
9. The appropriate controller or handler executes the requested operation.
10. The backend produces an HTTP response.
11. The client parses the response and determines whether it represents success or failure.
12. The resulting data or error is returned to TanStack Query.
13. TanStack Query updates its cache and notifies subscribed components.
14. React re-renders the affected components.

### 3.2. Backend responsibilities

The frontend SDK must not replace backend functionality.

The Brazier backend remains authoritative for:
- Route resolution.
- Authentication.
- Authorisation.
- Validation.
- Rate limiting.
- Business logic.
- Database access.
- Response status codes.
- Response generation.

The SDK only simplifies interaction with these capabilities.

---

## 4. API definition and type safety

A further layer should allow developers to define their API endpoints independently of React components.

This is especially useful for larger projects, where placing endpoint URLs and request logic directly inside components can quickly become difficult to maintain.

### 4.1. Endpoint definitions

For example:

```ts
import {
    defineQuery,
    defineMutation
} from "@brazier/react";

export const usersApi = {
    list: defineQuery<void, User[]>({
        queryKey: ["users"],

        request: client =>
            client.get("/users")
    }),

    get: defineQuery<{ id: number }, User>({
        queryKey: ({ id }) => ["users", id],

        request: (client, { id }) =>
            client.get(`/users/${id}`)
    }),

    create: defineMutation<CreateUserRequest, User>({
        request: (client, data) =>
            client.post("/users", data)
    })
};
```

The component can then consume the endpoint definition:

```ts
const users = useBrazierQuery(usersApi.list);

const user = useBrazierQuery(usersApi.get, {
    params: { id: 42 }
});

const createUser = useBrazierMutation(usersApi.create);
```

The endpoint definitions become a reusable description of how the frontend communicates with the backend.

The exact API signatures are illustrative and should be established through implementation prototypes.

### 4.2. Advantages

- Centralised endpoint declarations.
- Easier maintenance when URLs change.
- Reusable request logic.
- Better TypeScript inference.
- Consistent query keys.
- Easier testing.
- Clearer separation between application logic and communication logic.

### 4.3. Runtime validation

TypeScript interfaces do not validate data received over the network at runtime.

If runtime validation is required, developers should be able to integrate a validation library or schema system.

This should be optional rather than a mandatory dependency.

---

## 5. Response and error conventions

This area deserves particular attention because consistency between backend and frontend response handling determines how useful the ecosystem will be.

### 5.1. HTTP responses

The initial client should support ordinary HTTP response semantics.

It should not require all Brazier endpoints to return a particular JSON envelope.

For example, the following should all be valid responses:

```json
{
    "id": 42,
    "name": "John"
}
```

```json
[
    {
        "id": 42,
        "name": "John"
    }
]
```

```json
{
    "error": "User not found"
}
```

The first two might represent successful responses, while the third might represent an error, depending on the HTTP status code.

The client must use the actual HTTP status code and response metadata rather than infer success from the structure of the response body.

### 5.2. Standardised errors

The client should expose a consistent error class.

Conceptually:

```ts
class BrazierError extends Error {
    kind: "http" | "network" | "timeout" | "parse";

    status?: number;
    code?: string;
    body?: unknown;
}
```

Possible error categories:

| Category | Description                               |
| -------- | ----------------------------------------- |
| HTTP     | Server returned a non-success HTTP status |
| Network  | Request could not reach the server        |
| Timeout  | Request exceeded its configured timeout   |
| Parse    | Response could not be interpreted         |
| Aborted  | Request was intentionally cancelled       |

Intentional cancellation should normally remain distinguishable from genuine request failures so applications do not display misleading error messages.

### 5.3. Future backend response standard

It may be worthwhile to introduce a standard response convention across Brazier applications.

For instance:

```json
{
    "data": {
        "id": 42,
        "name": "John"
    },
    "meta": {}
}
```

And for errors:

```json
{
    "error": {
        "code": "USER_NOT_FOUND",
        "message": "The requested user does not exist.",
        "details": {}
    }
}
```

This would improve consistency, but should not be imposed retroactively on existing applications.

It should be discussed as a separate backend design decision.

---

## 6. Authentication and security

Authentication should be configurable through the client rather than implemented independently by every component.

The client could support:

- Bearer-token authentication.
- Cookie-based sessions.
- Custom authentication headers.
- Dynamically retrieved access tokens.
- Automatic token refresh through an explicitly configured mechanism.

For example:

```ts
const client = createBrazierClient({
    baseURL: API_URL,

    getAccessToken: async () => {
        return auth.getAccessToken();
    }
});
```

The SDK should not prescribe where an application stores authentication credentials.

In particular, it should not silently persist sensitive tokens in localStorage.

### 6.1. CORS

Since React applications may be hosted separately from Brazier backends, proper CORS configuration is essential. The backend must allow the appropriate frontend origins, methods and headers. Credentialed cross-origin requests require explicit allowed origins rather than `Access-Control-Allow-Origin: *`. This is particularly important for cookie-based authentication.

Brazier's current public README includes a CORS example combining a wildcard origin with credential support. That configuration must be reviewed before being used for credentialed browser requests.

See: [MDN CORS documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS).

### 6.2. Cookie authentication

When using cookies:

- Cookies should use appropriate `Secure`, `HttpOnly` and `SameSite` attributes.
- The frontend must explicitly configure credential inclusion where necessary.
- The backend must implement appropriate CSRF protection.
- Cross-origin cookie policies must be considered.

### 6.3. General security principles

- Never bypass TLS certificate verification.
- Never embed server-side secrets in frontend code.
- Validate authorisation on the backend, regardless of frontend checks.
- Do not trust client-side validation as a security measure.
- Avoid logging sensitive headers and request bodies.
- Treat server responses as untrusted input.

---

## 7. Caching and asynchronous state management

Caching should be delegated to TanStack Query.

The Brazier ecosystem should provide convenient integration rather than introducing its own cache implementation.

This offers:

- Query deduplication.
- Background refetching.
- Configurable stale times.
- Automatic cache invalidation.
- Retry policies.
- Refetching on reconnection.
- Paginated and infinite queries.
- Optimistic updates.

Mutation hooks should provide a way to invalidate related queries.

For instance, creating a user might invalidate the `["users"]` query key.

Developers must also be able to disable automatic retries or configure them individually.

A failed mutation should not automatically be retried unless the application has explicitly established that doing so is safe. Repeating a non-idempotent operation can create duplicate resources.

---

## 8. Compatibility and technical restrictions

### 8.1. React compatibility

`@brazier/react` must support the intended React versions through clearly documented peer dependency requirements.

The package must not depend on a particular React application architecture, router or state management library.

### 8.2. Server-side rendering

The SDK should be designed to avoid assuming that browser globals exist during module initialisation.

For SSR environments:

- Clients should be created per server-side request where user-specific configuration is involved.
- Authentication headers must not leak between users.
- Server-side cookie forwarding must be explicit.
- Query caches must not be shared between unrelated users.

### 8.3. Browser limitations

The SDK must respect browser security restrictions.

It cannot bypass CORS, directly access backend databases, manipulate TLS connections independently of the browser or access arbitrary server-side resources.

### 8.4. Dependency management

Suggested dependencies:

| Package             | Dependency relationship                       |
| ------------------- | --------------------------------------------- |
| `@brazier/client`   | Independent of React                          |
| `@brazier/react`    | React and TanStack Query as peer dependencies |
| `@brazier/realtime` | Optional WebSocket package                    |
| `@brazier/codegen`  | Build-time development tool                   |

The core client should remain lightweight and avoid unnecessary runtime dependencies.

---

## 9. Suggested repository structure

A monorepo would simplify development and coordinated releases.

```text
brazier-js/
│
├── packages/
│   │
│   ├── client/
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── request.ts
│   │   │   ├── response.ts
│   │   │   ├── errors.ts
│   │   │   ├── interceptors.ts
│   │   │   ├── serializers/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── react/
│   │   ├── src/
│   │   │   ├── provider.jsx
│   │   │   ├── context.ts
│   │   │   ├── query.ts
│   │   │   ├── mutation.ts
│   │   │   ├── endpoints.ts
│   │   │   ├── hooks/
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── realtime/
│   │   ├── src/
│   │   │   ├── socket.ts
│   │   │   ├── connection.ts
│   │   │   ├── events.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── codegen/
│       ├── src/
│       └── package.json
│
├── examples/
│   └── react-app/
│
├── docs/
│   ├── architecture/
│   ├── client/
│   ├── react/
│   ├── realtime/
│   └── guides/
│
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

The monorepo should not imply that all packages must be published together or installed together.

Each package should have independent versioning and clearly defined dependencies.

---

## 10. Development roadmap

Development should be incremental. The project should establish a reliable foundation before introducing advanced abstractions.

### Phase 1 — Core HTTP client

**Deliverable:** `@brazier/client`

- [ ] Client creation and configuration.
- [ ] HTTP method implementations.
- [ ] JSON serialisation.
- [ ] Query parameter construction.
- [ ] Custom headers.
- [ ] Authentication configuration.
- [ ] Response parsing.
- [ ] Standardised error handling.
- [ ] Timeouts and cancellation.
- [ ] Unit tests and documentation.

**Completion criterion:** A developer can use the client to communicate with any ordinary HTTP API without manually constructing Fetch requests.

### Phase 2 — React integration

**Deliverable:** `@brazier/react`

- [ ] BrazierProvider.
- [ ] Client context.
- [ ] Query hooks.
- [ ] Mutation hooks.
- [ ] TanStack Query integration.
- [ ] TypeScript inference.
- [ ] Cache invalidation support.
- [ ] React component tests.
- [ ] Usage documentation.

**Completion criterion:** A React application can retrieve and modify backend data without manually managing request lifecycle state.

### Phase 3 — API conventions and examples

**Deliverable:** Reference implementation and developer documentation.

- [ ] Define endpoint declaration conventions.
- [ ] Establish backend/frontend error-handling conventions.
- [ ] Review CORS configuration.
- [ ] Create a complete Brazier backend example.
- [ ] Create a matching React frontend.
- [ ] Document authentication integration.
- [ ] Add integration tests.

**Completion criterion:** A new developer can build a small full-stack application using Brazier and its frontend SDK by following the official documentation.

### Phase 4 — Real-time communication

**Deliverable:** `@brazier/realtime`

- [ ] WebSocket connection management.
- [ ] Event handling.
- [ ] Message serialisation.
- [ ] Authentication strategy.
- [ ] Reconnection behaviour.
- [ ] Connection lifecycle hooks.
- [ ] Integration tests.

**Completion criterion:** A frontend application can communicate with Brazier WebSocket endpoints through a consistent API.

### Phase 5 — API code generation

**Deliverable:** `@brazier/codegen`

- [ ] Establish backend API schema format.
- [ ] Implement schema export or OpenAPI integration.
- [ ] Generate TypeScript interfaces.
- [ ] Generate endpoint definitions.
- [ ] Add schema validation.
- [ ] Document generation workflow.

**Completion criterion:** Frontend developers can consume backend API definitions without manually duplicating request and response types.

---

## 11. Testing strategy

The ecosystem should have independent tests for each package, alongside integration tests involving an actual Brazier backend.

### Client tests

Test:

- HTTP methods and URL construction.
- Request and response serialisation.
- Header precedence.
- Error normalisation.
- Timeout behaviour.
- Cancellation.
- Empty responses.
- Invalid response bodies.
- Authentication configuration.

### React tests

Test:

- Provider configuration.
- Query loading and success states.
- Error propagation.
- Mutation execution.
- Query invalidation.
- Request cancellation.
- Multiple components consuming the same query.
- Provider misconfiguration.

### Integration tests

Test complete interactions between:

- `@brazier/client` and a Brazier HTTP server.
- `@brazier/react` and a Brazier HTTP server.
- `@brazier/realtime` and a Brazier WebSocket server.

Mocked requests should complement, not replace, genuine backend integration tests.

---

## 12. Non-goals

The frontend ecosystem should not attempt to:

1. Replace React or provide a general-purpose UI component library.
2. Replace TanStack Query with an entirely new caching implementation.
3. Replace the Brazier backend's routing or middleware systems.
4. Implement database access from the browser.
5. Make frontend TypeScript types a substitute for backend validation.
6. Force applications to use a particular authentication system.
7. Require all API responses to follow a single envelope without an explicit backend compatibility decision.
8. Require developers to adopt generated API definitions.
9. Become a frontend framework of its own or replace a developer's current framework.

The SDK should remain useful even when a developer wants to use only one of its components.

---

## 13. Final architectural recommendations

The recommended initial scope is deliberately small:

**Build `@brazier/client` and `@brazier/react` first.**

The client provides a stable communication foundation. The React package makes that foundation convenient to use in frontend applications. TanStack Query should handle asynchronous server state, while Brazier's backend remains responsible for all server-side processing and security. Real-time communication and API code generation should be developed once the initial HTTP integration is stable.

There are also two backend-level considerations that should be addressed alongside development:

1. Establish reliable CORS and authentication conventions for browser clients.
2. Consider introducing explicit API schema metadata so that future code generation can be implemented without guessing the structure of backend handlers.

### Proposed end state

A developer should eventually be able to create a complete Brazier-powered application using an experience similar to:

```jsx
import { createBrazierClient } from "@brazier/client";
import {
    BrazierProvider,
    useBrazierQuery,
    useBrazierMutation
} from "@brazier/react";

const client = createBrazierClient({
    baseURL: "/api"
});

function Users() {
    const users = useBrazierQuery(usersApi.list);

    const createUser = useBrazierMutation(usersApi.create);

    if (users.isLoading)
        return <p>Loading...</p>;

    if (users.error)
        return <p>{users.error.message}</p>;

    return (
        <div>
            {users.data?.map(user => (
                <p key={user.id}>{user.name}</p>
            ))}

            <button
                onClick={() => createUser.mutate({
                    name: "John",
                    email: "john@example.com"
                })}
            >
                Create user
            </button>
        </div>
    );
}

function App() {
    return (
        <BrazierProvider client={client}>
            <Users />
        </BrazierProvider>
    );
}
```

The objective is not to hide HTTP or make developers learn an entirely new paradigm. It is to make interacting with Brazier applications feel consistent, straightforward and predictable.

**The frontend ecosystem should make Brazier easier to adopt without making Brazier more complicated.**
