# ACA — Claude Code session context

This file is read at the start of every Claude Code session. Read it fully before making changes.

## What this project is

ACA (Assessment Centre Application) is a Synovate-internal tool for running end-to-end Assessment Centre engagements. It's a React + Vite + TypeScript single-page app currently at v1.0. State persists via Zustand + localStorage locally, with Supabase as the production backend for engagement data, scores, and auth.

Synovate is MV's consulting firm. Actifyr (also MV's) is the behaviour-activation platform that ACA hands off to at the end of an engagement.

## The four destinations

Every engagement has four sequential destinations, each implemented as a routed sub-section:

1. **Setup** — 9 sequential steps configuring the engagement (engagement basics, competencies, proficiency targets, tools, aggregation rules, assessors, participants, schedule, report format). Locking the engagement is the gate that moves it from Draft to Live and unlocks Score.

2. **Score** — Observer scoring of participants on tools. Each observer logs in and is auto-resolved to their assessor record by email. Single integrated screen per participant: each competency card shows evidence textareas at top, indicator rating rows (1-5 + Not Observed) below.

3. **Calibrate** — Lead Assessor's workspace. Three stages: Reconcile (disagreement heatmap with drill-in), Moderate (per-participant profile review with overrides), Set OAR (5-band picker per participant). Sign-off locks Calibrate and unlocks Report.

4. **Report** — Three modes: Individual (per-participant report drafting with AI-prompt generation), Group (cohort view with mask-names toggle), Feedback (session capture with IDP commitments and Actifyr handoff).

Engagement completes when all reports signed off and all feedback sessions delivered.

## Repository structure

```
src/
├── components/
│   ├── layout/
│   │   ├── LandingShell.tsx           # Layout for the engagements list page
│   │   └── EngagementShell.tsx        # Layout for any /engagement/:id page (destination tabs)
│   ├── ui/                            # Card, Button, Badge — the design system primitives
│   ├── AddEngagementModal.tsx
│   └── StepPageHeader.tsx
├── pages/
│   ├── EngagementsLanding.tsx         # The home page (engagement cards by status)
│   ├── SetupDashboard.tsx             # Setup landing showing the 9-step grid
│   ├── SetupWizard.tsx                # Guided multi-step setup flow
│   ├── LockReview.tsx                 # Lock confirmation page
│   ├── ScoreLanding.tsx               # Score destination landing (tools list)
│   ├── ScoreCockpit.tsx               # Per-tool view (participant list)
│   ├── ScoreParticipantSheet.tsx      # Per-participant two-pass rating + evidence sheet
│   ├── CalibrateLanding.tsx           # Calibrate destination landing
│   ├── CalibrateReconcile.tsx         # Stage 1: disagreement heatmap
│   ├── CalibrateModerate.tsx          # Stage 2: per-participant moderation
│   ├── CalibrateOar.tsx               # Stage 3: OAR band picker + sign-off
│   ├── ReportLanding.tsx              # Report destination landing
│   ├── ReportIndividual.tsx           # Individual reports with AI prompt generation
│   ├── ReportGroup.tsx                # Cohort view with mask-names toggle
│   ├── ReportFeedback.tsx             # Feedback sessions with Actifyr handoff
│   └── steps/                         # 9 setup-step pages
├── lib/
│   ├── cn.ts                          # Tailwind class merge helper
│   ├── store.ts                       # Zustand store (single source of truth)
│   ├── scoring.ts                     # Score-destination helper computations
│   └── calibrate.ts                   # Calibrate-destination helper computations
├── mocks/
│   ├── dictionary.ts                  # Competency dictionary (from Competency_Map.xlsx)
│   └── toolLibrary.ts                 # AC tool catalog
├── types/
│   └── index.ts                       # All TypeScript types in one file
├── App.tsx                            # Routes
├── main.tsx                           # Entry
└── styles.css                         # Tailwind base + custom CSS
```

## State and store

There is one Zustand store at `src/lib/store.ts`. It persists to localStorage under the key `aca-v05-store`. Bump the `version` field (currently 10) whenever the shape of persisted state changes — otherwise old localStorage entries break the app silently on load.

Engagements default to `[]` and are hydrated from Supabase on mount when configured. The store syncs mutations to Supabase via debounced push functions whenever `isSupabaseConfigured` is true. When Supabase is not configured (local dev), the app runs fully offline with localStorage only.

Store actions are organised by destination:

- **Setup**: `updateBasics`, `setCompetencies`, `setProficiencyTargets`, `setTools`, `setAggregation`, `setAssessors`, `setParticipants`, `setSchedule`, `setReportFormat`, `setStepStatus`, `lockEngagement`, `unlockEngagement`
- **Score**: `setActingObserver`, `upsertScore`, `updateCompetencyScore`, `markScoreComplete`
- **Calibrate**: `upsertModeratedScore`, `upsertOar`, `setCalibrateStage`, `signOffCalibrate`
- **Report**: `upsertReportSection`, `upsertFeedbackSession`, `markEngagementComplete`

Selector hooks for common queries:
- `useEngagement(id)` — returns one engagement by id
- `useActingObserverId(engagementId)` — returns currently acting observer for Score

When adding a new action, follow the existing pattern: use `patchEngagement(s.engagements, id, (e) => ({...}))` to update one engagement immutably.

## Routing

Routes are in `src/App.tsx`. Two shells:

- `LandingShell` for `/` (the engagements list)
- `EngagementShell` for `/engagement/:engagementId/*` (every per-engagement page)

The EngagementShell renders the destination tabs (Setup/Score/Calibrate/Report). Destination locking lives in `isDestinationLocked` at the bottom of `EngagementShell.tsx` — currently it dims all non-Setup destinations while engagement status is "draft".

## Types

All types are in `src/types/index.ts`. One file deliberately — easier to grep, easier for Claude to read. The file is organised in sections by destination. Key constants exported alongside types:

- `DEFAULT_AGGREGATION`, `DEFAULT_REPORT_FORMAT` — defaults for new engagements
- `EMPTY_CALIBRATE_STATE`, `EMPTY_REPORT_STATE` — defaults for new engagements
- `OAR_BAND_META` — labels, tones, descriptions for the 5 OAR bands
- `RATING_ANCHORS` — labels and descriptions for the 1-5 scale

## Design tokens

Tailwind config at `tailwind.config.js` defines custom colours:
- `navy` (700/900) — primary brand colour, headings
- `ocean` (50-800) — accent, links, active states
- `ink` (100-900) — neutral greys
- `green`, `amber`, `red` — semantic status colours

Custom font sizes: `text-2xs` for the small uppercase metadata labels. Avoid plain `text-xs` unless intentional.

Headings use `font-serif` via the `display-serif` class for the editorial feel.

## Conventions

- **No new files without checking first.** Before adding a page or component, search for existing ones — there's often an existing pattern to follow.
- **Two-column page layouts** for any "list of things + detail of selected thing" use `grid-cols-1 lg:grid-cols-[260px_1fr] gap-5` or similar.
- **Status badges** use the `Badge` component with `tone` prop (`neutral`, `ocean`, `green`, `amber`, `red`, `navy`).
- **Lock gates** for destinations that aren't yet available — see the LockGate component in each destination landing for the pattern.
- **Auto-save** uses 600ms debounce — see `ScoreParticipantSheet.tsx` for the pattern.
- **The Zustand store is the single source of truth.** Don't introduce useState for anything that should persist or be shared.

## Build and verify

- `npm run dev` — local dev server at localhost:5173
- `npm run build` — production build (TypeScript strict + Vite)
- `npm run typecheck` — TypeScript only, no build artefacts
- `npm run verify` — typecheck + build, run before any commit
- `npm run preview` — serve the production build locally

The build must be clean before any commit. TypeScript is strict; no errors, no warnings allowed.

## Do not change without asking

Some parts of the codebase have implicit decisions baked in. Don't change these without raising them first:

- **The Zustand store schema version** (`version: 10`). Bumping it is fine when you change the persisted shape; downgrading or removing the persist middleware will lose users' work.
- **The destination unlock logic** in `EngagementShell.tsx::isDestinationLocked`. It currently dims non-Setup destinations for Draft engagements. The internal lock gates on each landing handle finer-grained state. Don't add a third locking mechanism.
- **The single-screen score flow** (`ScoreParticipantSheet.tsx`). Evidence textareas and indicator ratings are shown together per competency — merged from the previous two-pass design per MV's direction.
- **The competency dictionary** in `src/mocks/dictionary.ts`. Sourced from the canonical `Competency_Map.xlsx`; changes here must round-trip back to that source.
- **The OAR band thresholds** in `DEFAULT_AGGREGATION`. These are configurable per engagement but the defaults reflect Synovate's standard methodology.

## What's deliberately stubbed (carrying forward to v1.1+)

These are not bugs; they're conscious deferrals:

- **AI drafting in Report Individual** is prompt generation, not direct API calls. Coach pastes into Claude or preferred model externally.
- **Activation handoff to Actifyr** shows the payload on screen but no actual POST.
- **PDF / PPTX export** of individual reports is not yet implemented.
- **Post-lock amendments** — moderated scores stay editable in the store but the UI doesn't expose edit affordances after sign-off.
- **Audit log** — no history of who-moderated-what-when.
- **Mobile scoring** — desktop / tablet only.

## When working on v1.1+

The v1.1 priorities, in order:

1. Real PDF export of individual reports
2. Direct AI integration for Report drafting (replacing prompt generation)
3. Actifyr handoff API integration
4. Reopen-for-amendment workflow with audit log
5. Per-participant cohort comparison view inside Report Individual

For each: write the change in a feature branch (`git checkout -b feat/<name>`), run `npm run verify` clean, commit, merge back to main only after testing a full engagement walkthrough still works.

## How MV likes to work

- Direct senior-practitioner tone. No hedging, no excessive deference.
- Flag decisions made on MV's behalf explicitly — don't bury them.
- When uncertain about a design choice, ask one clear question rather than guess.
- Prefer fewer, well-considered changes over many speculative ones.
- The build must always be clean before MV sees it. If something doesn't compile, fix it before responding.
