# Contributing to ACA

Conventions for adding or modifying code in this codebase. Read `CLAUDE.md` first for the project shape.

## Before any change

1. `git status` — make sure the working directory is clean
2. `git checkout -b feat/<name>` or `fix/<name>` — never work on main directly
3. `npm run typecheck` — verify the codebase compiles before you start

## When adding a new page

1. Check if there's an existing page you can extend instead. The pages directory has 18+ pages already.
2. Decide which shell it belongs in: `LandingShell` (the root engagements list) or `EngagementShell` (per-engagement workspace).
3. Add the route in `src/App.tsx`, grouped with related routes (Setup / Score / Calibrate / Report).
4. Create the page file in `src/pages/`. Follow naming convention: PascalCase, descriptive (e.g. `CalibrateReconcile.tsx`, not `Reconcile.tsx`).
5. Read 1-2 sibling pages first to match the patterns:
   - Page-level layout (`space-y-6` outer, breadcrumb, header block, body)
   - Use `useEngagement(engagementId)` for store access; never read directly via `useAppStore` for engagement data
   - Lock gates for destinations not yet available
6. If the page has 200+ lines, consider whether sub-components should be extracted. Inline sub-components are fine; just keep the file scannable.

## When adding a store action

1. Add the action signature to the `AppState` interface in `src/lib/store.ts`. Group by destination.
2. Implement using `patchEngagement(s.engagements, id, (e) => ({...}))` — never mutate, always return a new engagement object.
3. If the action changes the shape of persisted state (new fields on Engagement, new top-level state), bump the store `version` at the bottom of the file. Don't skip this — it'll bite users silently.
4. Avoid actions that span multiple engagements. One engagement per action.

## When adding a type

1. All types live in `src/types/index.ts`. Add to the relevant section by destination.
2. Export the type from the same file. Never define types inside page or component files unless they're truly local props.
3. If the type has sensible defaults, export a constant alongside it (e.g. `EMPTY_CALIBRATE_STATE`).
4. If it's an enum-like union, export a metadata record (e.g. `OAR_BAND_META`) with labels and tones so UI components don't hardcode the same strings.

## When adding a component

1. Check `src/components/ui/` first — Card, Button, Badge already exist.
2. New shared components go in `src/components/`. New page-local components stay inline in the page file.
3. Use Tailwind utility classes; no separate `.module.css` files.
4. Use `cn()` from `src/lib/cn.ts` for conditional classes.
5. Use the custom design tokens (`navy`, `ocean`, `ink`, `text-2xs`, `display-serif`). Don't reach for generic Tailwind colours unless the design system genuinely doesn't cover the need.

## Styling conventions

- **Headings**: `display-serif` class for editorial feel; never bold sans-serif for major page titles
- **Page titles**: `text-[2rem]` or `text-[2.25rem]` for top-of-page H1; `text-xl` for section H2
- **Body text**: `text-sm text-ink-700 leading-relaxed`
- **Metadata / labels**: `text-2xs uppercase tracking-wider font-semibold text-ink-500`
- **Numbers / scores**: `font-mono` always
- **Cards**: Use the `Card` component; use `CardBody` for padded body content
- **Spacing**: page-level `space-y-6` or `space-y-7`; card-internal `space-y-3` or `space-y-4`

## Commit conventions

```
<type>(<scope>): <subject>

<body — optional, but recommended for non-trivial changes>
```

Types: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`, `test`.

Scopes: `setup`, `score`, `calibrate`, `report`, `shell`, `store`, `types`, `seed`, `build`.

Examples:
- `feat(report): add PDF export to ReportIndividual`
- `fix(calibrate): correct disagreement spread calculation when only one observer`
- `refactor(store): consolidate score actions into a single upsertScore action`
- `chore(build): bump TypeScript to 5.6`

## Before merging back to main

1. `npm run verify` clean — typecheck + production build, no errors or warnings
2. Walk the **FirstCry full path** in the dev server: Setup → Score → Calibrate → Report → Mark complete. If anything regressed, fix before merging.
3. Walk the **Apollo path** to verify Calibrate sign-off and Report show correctly with seed data.
4. Walk the **Tata Steel path** to verify Draft lock gates still work.
5. If you changed the store shape, manually verify localStorage migration works (clear localStorage, reload, verify seed engagements appear).
6. Commit message follows conventions above.
7. Squash-merge if the branch has 5+ commits of "wip" — keep main history clean.

## What not to do

- Don't introduce new state-management libraries. Zustand is the only one.
- Don't introduce new CSS frameworks or CSS-in-JS solutions. Tailwind only.
- Don't introduce backend dependencies (databases, ORMs, server frameworks). This is a client-only prototype until a deliberate backend pass.
- Don't add libraries casually. Each dependency is a future maintenance cost. Check whether the need can be met with existing code.
- Don't disable TypeScript strict mode. If a type is genuinely hard, ask before reaching for `any` or `as unknown`.
- Don't bypass the store with direct localStorage reads. The store wraps it for good reasons.
- Don't refactor unrelated code in a feature branch. Open a separate refactor PR.

## Working with Claude Code on this codebase

1. Start every session by letting Claude Code read `CLAUDE.md` and `CONTRIBUTING.md` (it does this automatically).
2. Be specific about scope. "Add PDF export to Report Individual" is better than "improve the Report destination".
3. Ask Claude Code to run `npm run verify` after any non-trivial change before showing you the diff.
4. Review the diff before accepting. Even small changes to the store or types can have wide reach.
5. Commit after each working change. Don't accumulate large uncommitted diffs.
6. If something breaks unexpectedly, `git diff HEAD~1` and check what changed. Often the root cause is in a recent commit, not the current edit.
