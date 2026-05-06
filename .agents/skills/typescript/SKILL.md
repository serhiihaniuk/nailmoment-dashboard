---
name: typescript
description: Strict TypeScript engineering guidance for implementing, refactoring, debugging, and reviewing TypeScript or TSX code with shift-left validation, Zod schemas, branded types, Drizzle-inferred database types, Feature-Sliced Design ownership, type guards, and near-zero typecasting. Use when working with `.ts`, `.tsx`, `tsconfig.json`, type errors, JavaScript-to-TypeScript migrations, library typings, generics, strictness settings, build/typecheck failures, runtime boundary validation, Drizzle ORM models, or frontend/backend TypeScript projects.
---

# TypeScript

## Overview

Use this skill to make TypeScript changes that fit the existing project, shift failures as far left as possible, improve type safety, and keep runtime behavior intentional. Favor strict compile-time and boundary validation over casts, informal assumptions, or late runtime surprises.

## Workflow

1. Inspect the project shape before editing:
   - Read `package.json`, `tsconfig*.json`, lockfiles, framework config, lint config, and nearby files.
   - Identify the package manager and existing validation scripts.
   - Check whether the project uses strict mode, path aliases, ESM/CJS, React, Next.js, Node, Zod, Drizzle, Feature-Sliced Design, branded types, or a monorepo.
2. Reproduce or locate the issue when possible:
   - Run the narrowest relevant command first, such as `npm run typecheck`, `pnpm test`, `tsc --noEmit`, or the failing package's script.
   - Prefer existing scripts to ad hoc commands.
   - Surface invalid assumptions early with static types, schema parsing, targeted tests, and focused checks before broad manual debugging.
3. Make the smallest coherent change:
   - Preserve public APIs unless the user asks to change them.
   - Update call sites together with changed types.
   - Reuse canonical Zod schemas and branded types when they already exist for the same domain concept.
   - Add new schemas or brands only when there is no existing owner for that concept, or when the new concept is intentionally distinct.
4. Validate with the repo's tools:
   - Run typecheck and targeted tests when available.
   - Run format/lint only when they are established and reasonably scoped.
   - If validation cannot run, explain why and state the remaining risk.

## Shift Left Strategy

- Detect problems at the earliest practical layer: schema parse at ingress, domain constructors before persistence, compile-time exhaustiveness before runtime fallback, and targeted tests before broad flows.
- Move validation close to the source of uncertainty: API clients, request handlers, environment config loaders, form parsers, database adapters, queue/message consumers, and file/JSON readers.
- Prefer failing fast with clear errors over allowing invalid values to flow deeper into the system.
- Encode validated states in types so downstream code cannot accidentally consume raw strings, unparsed JSON, unchecked IDs, or nullable values.
- Add type-level exhaustiveness checks for discriminated unions. Use `never` checks or project-standard helpers when a union branch must be impossible.

## Type Safety

- Prefer inference for local implementation details; write explicit types for exported APIs, complex callbacks, public data structures, and ambiguous values.
- Avoid `any`. If the value is genuinely unknown, use `unknown` and narrow it with Zod, type guards, discriminants, or `in` checks.
- Almost fully eliminate typecasting. Treat `as Foo`, double assertions, and non-null assertions as last resorts that require a nearby explanation and a proven runtime invariant.
- Do not use casts to silence compiler errors. Fix the model, add validation, narrow the union, improve the generic constraint, or introduce a proper domain constructor.
- Prefer typed helper functions, overloads, `satisfies`, `const` type parameters, discriminated unions, and schema-derived types over assertions.
- Model state with discriminated unions instead of loose boolean clusters when states are mutually exclusive.
- Use `satisfies` for typed object literals when preserving literal types matters.
- Keep generic types constrained and readable. If a generic does not improve callers or correctness, remove it.
- Do not weaken `tsconfig` strictness to silence errors unless the user explicitly asks and the tradeoff is documented.

## Runtime Boundaries

- Treat external input as untrusted: API responses, environment variables, JSON files, URL params, form data, database rows, and message payloads need parsing or validation before strong typing.
- Use Zod at runtime boundaries when the project has Zod or can reasonably add it. Infer TypeScript types from schemas with `z.infer` rather than maintaining duplicate manual types.
- Keep compile-time types and runtime behavior aligned. Do not "fix" a type error by asserting a shape the code does not actually guarantee.
- Normalize parsed data immediately after validation, then pass the parsed type deeper into the system.
- After a value has been parsed into a canonical domain type, preserve that type through the call graph instead of repeatedly re-checking or converting it.
- When a dependency lacks good types, prefer official types, local module declarations, or narrow adapter functions over scattered casts.

## Canonical Domain Types

- Treat domain entities and identifiers as shared concepts, not local conveniences. Before creating `UserId`, `TenantId`, `Order`, `Money`, `EmailAddress`, or similar types, search for an existing schema/type/parser and reuse it.
- Maintain one canonical branded type per domain concept in the owning domain module. Export the schema, inferred type, and parser/constructor from that owner.
- Do not create multiple brands for the same real-world value in different modules, such as `ApiUserId`, `DbUserId`, and `UserId`, unless they intentionally represent different lifecycle states or trust levels.
- If a value must move between layers, prefer adapters that preserve the canonical type over type guards that repeatedly "convert" the same value.
- If a boundary has a transport-specific shape, parse the transport shape once, then map it into the canonical domain type.
- When two existing branded types appear to represent the same concept, stop and consolidate or route through the owning parser instead of adding another guard or cast.
- Name lifecycle-specific brands clearly when they are genuinely different, such as `UnverifiedEmail` and `VerifiedEmail`, or `RawTenantSlug` and `TenantSlug`.

## FSD Alignment

- Use Feature-Sliced Design to decide type ownership. Zod and brands enforce correctness; FSD decides where the source of truth lives.
- Put reusable business domain types, schemas, branded IDs, mappers, and constructors in `entities/<entity>/model`, exported through the slice public API.
- Keep route params, search params, page-only forms, and one-off schemas in the owning `pages/` slice until reuse proves a lower-level boundary.
- Let `features/*` own action-specific command/input schemas, but reuse entity types once the data represents domain data.
- Keep `shared/*` limited to generic validation helpers, API/client infrastructure, database connection plumbing, brand utilities, and schema utilities. Do not place business brands such as `UserId` or `OrderId` in `shared/`.
- Before creating a branded type, identify its FSD owner. If no stable owner exists, keep it local rather than promoting speculative domain structure.
- If a feature needs a type from another feature, stop. The type likely belongs in an entity, shared infrastructure, or the design should stay local.

## Drizzle

- Use Drizzle table schemas as the persistence source of truth. Do not manually duplicate row or insert types when Drizzle can infer them.
- Prefer `typeof table.$inferSelect` and `typeof table.$inferInsert`, or `InferSelectModel<typeof table>` and `InferInsertModel<typeof table>`, following the repo's existing style.
- Treat Drizzle inferred types as database row/insert shapes, not automatically as domain types. A row type proves persistence shape, not all business invariants.
- Let FSD entities own domain types. Map Drizzle rows into canonical entity/domain types at the repository, entity API, or data-access boundary used by the project.
- Preserve canonical domain types after mapping instead of passing raw Drizzle rows through features and UI.
- Use Drizzle inferred insert types for persistence commands, but accept external input only after Zod validation and domain construction.
- Brand IDs either through the owning entity parser/constructor or during a row-to-domain mapper. Do not cast raw Drizzle values directly to branded domain IDs at call sites.
- For joins, partial selects, computed fields, and hidden columns, define explicit result schemas or mappers when the result is consumed as domain data.
- Treat Drizzle custom column `$type` and enum inference as TypeScript modeling, not runtime validation. Validate untrusted values before persistence or domain use.
- Keep Drizzle access in the layer chosen by the project architecture, often `shared/db`, `shared/api`, or an entity's `api`/`model`; avoid leaking low-level DB concerns into components.

## Zod

- Define schemas at ingress/egress boundaries and near external contracts, not randomly inside business logic.
- Use `safeParse` when the caller can recover or return a user-facing validation result. Use `parse` when invalid data is exceptional and should fail fast.
- Keep schemas composable and named for the domain concept they validate.
- Prefer schema transforms only when normalization belongs at the boundary. Keep complex business rules in named functions so errors remain understandable.
- Export inferred types from the schema when they are part of the module contract:

```ts
const UserIdSchema = z.string().uuid().brand<"UserId">();
type UserId = z.infer<typeof UserIdSchema>;
```

## Branded Types

- Use branded types for validated domain primitives that should not be interchangeable: IDs, slugs, email addresses, ISO dates, currency amounts, tenant IDs, and permission scopes.
- Construct branded values only through a schema, parser, or domain constructor. Do not brand with a raw cast at the call site.
- Keep brands owned by domain modules and export constructors/parsers with the type.
- Do not create a new brand for a concept that already has a canonical brand. Import and reuse the existing type/schema/parser.
- Prefer branded types when a plain `string` or `number` would let invalid or cross-domain values compile.

```ts
const OrderIdSchema = z.string().uuid().brand<"OrderId">();
type OrderId = z.infer<typeof OrderIdSchema>;

function parseOrderId(value: unknown): OrderId {
  return OrderIdSchema.parse(value);
}
```

## Type Guards

- Use type guards when validation depends on runtime facts that TypeScript cannot infer directly.
- A type guard must actually verify the claimed type. Do not return `true` after partial checks.
- Prefer Zod schemas for object shape validation at boundaries; use type guards for narrow in-memory checks, discriminants, platform APIs, or dependency quirks.
- Do not use type guards as repeated conversions between equivalent branded types. Fix the canonical type ownership instead.
- Keep guards small, named, and testable when they protect important behavior.

## React And TSX

- Type component props at the boundary and let JSX internals infer where readable.
- Use existing project patterns for `React.FC`, server/client components, hooks, state libraries, and form libraries.
- Keep event handler types specific when needed, such as `React.ChangeEvent<HTMLInputElement>`, but avoid noisy annotations when inference is clear.
- In Next.js or React Server Components, respect server/client boundaries before moving code across files.
- Parse server responses, route params, form data, and search params before passing them to components that expect validated domain types.

## Common Fixes

- For "possibly undefined" errors, decide whether absence is valid. If valid, handle the empty path; if invalid, enforce the invariant at the boundary.
- For union type errors, narrow on discriminants, tags, `typeof`, `Array.isArray`, `instanceof`, or property existence.
- For untyped JSON or API data, add or reuse a Zod schema and pass only parsed output onward.
- For repeated stringly typed IDs or values, first look for an existing canonical brand. Introduce a branded type and constructor/parser only if no canonical concept exists.
- For repeated conversions between brands, consolidate around the owning domain type or introduce an explicit lifecycle transition function.
- For Drizzle row types used directly in UI or features, decide whether this is intentional. If not, add a row-to-domain mapper in the owning entity boundary.
- For async code, type promises by return value and preserve rejection/error behavior.
- For imports, follow existing module style and path aliases. Avoid mixing `require` and `import` unless the project already does.
- For generated types, update the generator output through the established command instead of hand-editing generated files.

## Anti-Patterns

- Creating duplicate brands for the same domain concept in multiple FSD slices.
- Writing `schema.parse(value) as DomainType` instead of making the schema or mapper produce the correct type.
- Passing raw Drizzle rows throughout the app when domain invariants, privacy, computed values, or lifecycle states matter.
- Re-validating the same canonical domain value repeatedly instead of preserving its type.
- Placing business brands or business schemas in `shared/`.
- Weakening `tsconfig`, adding `any`, or using broad casts to move faster.

## Review Checklist

- Does the change preserve or improve type safety without hiding real uncertainty behind casts?
- Are invalid external values rejected or normalized as early as practical?
- Are Zod schemas used at runtime boundaries where appropriate?
- Are branded types used for validated domain primitives that should not be interchangeable?
- Is there only one canonical brand/schema/parser for each domain concept?
- Are existing domain types preserved across layers instead of re-created or repeatedly type-guarded?
- Does each domain type have the correct FSD owner and public API?
- Are Drizzle inferred types used for persistence shapes without leaking database details into domain/UI code unintentionally?
- Are Drizzle rows mapped into domain types when business invariants require it?
- Are type guards honest, complete, and backed by real runtime checks?
- Are exported types, public APIs, and call sites consistent?
- Are runtime boundaries validated instead of merely asserted?
- Did the relevant typecheck/test command run, or is the validation gap clear?
