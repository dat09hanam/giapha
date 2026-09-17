# Web workspace guidance

- Keep route files thin; place reusable UI in `src/components` and data access in `src/lib`.
- Prefer Server Components. Add `use client` only for browser APIs, local interaction, or React Flow.
- Domain API types belong in `src/types`; React Flow conversion belongs in `src/lib/tree-layout.ts`.
- Use shadcn-style primitives from `src/components/ui` before adding one-off component styling.
- Include loading, empty, not-found, and error behavior for tenant-facing routes.
- After substantive changes run `npm run lint --workspace @giapha/web` and `npm run typecheck --workspace @giapha/web`. Run `npm run build --workspace @giapha/web` only before a release-facing handoff, and read its output through `tail -20`.
