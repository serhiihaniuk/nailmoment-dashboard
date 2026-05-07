# Preserve Strict TypeScript And Runtime Parsing Boundaries

The dashboard preserves strict TypeScript settings and treats external data as untrusted at runtime boundaries. Request bodies, route params, response JSON, environment variables, webhook payloads, and database-facing inputs should be parsed or narrowed with focused schemas and helpers instead of broad casts, `any`, non-null assertions, or weakened compiler options.
