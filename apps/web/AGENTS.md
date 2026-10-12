# Web workspace guidance

- Keep route files thin; place reusable UI in `src/components` and data access in `src/lib`.
- Prefer Server Components. Add `use client` only for browser APIs, local interaction, or React Flow.
- Domain API types belong in `src/types`; React Flow conversion belongs in `src/lib/tree-layout.ts`.
- Use shadcn-style primitives from `src/components/ui` before adding one-off component styling.
- Include loading, empty, not-found, and error behavior for tenant-facing routes.
- After substantive changes run `npm run lint --workspace @giapha/web` and `npm run typecheck --workspace @giapha/web`. Run `npm run build --workspace @giapha/web` only before a release-facing handoff, and read its output through `tail -20`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
