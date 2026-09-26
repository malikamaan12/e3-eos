# Contract artefacts

`CORE_COMMANDS.openapi.yaml` is an OpenAPI 3.1 starting contract for sixteen consequential command routes, with request schemas, access capability names, idempotency and concurrency preconditions, typed error responses and a common recorded/queued result envelope. It does not claim that the endpoints are implemented.

The full proposed operation inventory is in [API and event contracts](../specs/05_API_AND_EVENT_CONTRACTS.md). Developers extend the OpenAPI per phase before implementation acceptance. Offline operation payloads and custom fields are additionally validated against their registered type/form schemas server-side; an open JSON extension field is never permission to execute arbitrary actions.

The session-cookie name is a logical contract to bind to the tested Better Auth configuration. Browser CSRF/origin controls, current scope/authority, transaction hashes and database invariants are mandatory even though not all can be expressed in OpenAPI alone. Conditional business limits remain compiled project/authority policy, not universal constants in this file.
