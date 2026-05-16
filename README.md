# ACA v0.8 — Pass 5 + Pass 6

All four destinations live. End-to-end workflow from Engagement Setup through Score, Calibrate, Report, Feedback handoff, and engagement completion.

**This is v0.8.** Passes 5 (Calibrate) and 6 (Report) were built in one continuous sweep. Everything in the staged plan is now wired end-to-end. The prototype is now a single-page React app you can walk a real client through to demonstrate the full Synovate AC workflow.

---

## Run locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Build for deploy

```bash
npm run build
```

`netlify.toml` is included with SPA routing configured.

---

## What's in v0.8

### Pass 5 — Calibrate destination

The Lead Assessor's workspace. Three stages in sequence.

**Landing.** Three stage cards (Reconcile / Moderate / Set OARs) with metrics. Coverage band showing scoring completeness against the 80% readiness threshold. Sign-off band that links to Report once Calibrate is signed off. For Live engagements with no scoring yet, a "scoring needed first" lock gate.

**Stage 1 — Reconcile.** A participant × competency heatmap. Cells coloured by observer disagreement spread:
- Green (≤ 1.0 spread): agreement
- Amber (1.0 – 1.5): some disagreement
- Red (> 1.5): high disagreement
- Grey: insufficient data

Click any cell → drill-in modal showing each observer's rating, evidence notes from Score, and a moderated score input with rationale. Save moderates the cell; cells with overrides show a "mod" tag.

**Stage 2 — Moderate.** Two-column layout. Participant list on left. Profile on right showing every competency with the computed score, the moderated score (if any), spread, target level, weight, critical-or-not. Edit pencil per row → inline number input + rationale textarea + save/cancel.

**Stage 3 — Set OARs.** Per-participant row with identity + computed OAR + computed band + 5-band picker (Below / Developing / Proficient / Strong / Distinguished). Click a band → expandable rationale capture. Sign-off section at bottom with confirm-twice pattern (button → "Are you sure?" inline → confirm). Sign-off locks Calibrate and unlocks Report.

### Pass 6 — Report destination

Where reports are drafted, edited, signed off, and the feedback handoff happens.

**Landing.** Three mode cards (Individual / Group / Feedback) with progress metrics. Activation handoff band tracking how many feedback handoffs have been sent to Actifyr. When everything's delivered, a "Mark engagement complete" button.

**Mode 1 — Individual reports.** Per-participant report draft and sign-off. Two-column: participant list with section completion progress, sections panel on the right. Six section types: Executive summary · Competency profile · Indicator evidence · Development areas · Next steps · Cohort context. Per section: a "Generate prompt" button copies a structured prompt to clipboard (participant identity, OAR band, competency profile with moderated scores, section-specific instructions) for the coach to paste into Claude or any preferred AI model. Then "Edit/Add" opens a textarea for the response. Save as draft or sign off section. The prompt-generation approach keeps Synovate in control of model choice and cost — no Anthropic API key needed in production.

**Mode 2 — Group view.** Cohort radar replaced with a simpler bench-strength view because radar of 7+ competencies reads poorly. Shows: OAR band distribution (5-column grid with counts and percentages), AI-spotted themes (auto-surfaced cohort strengths and gaps), per-competency bench-strength bars with target marker, and participant grid. Mask-names toggle top-right swaps real names for "Participant 1, 2…" — for unbiased calibration discussions with client leadership.

**Mode 3 — Feedback sessions.** Per-participant feedback session capture. Two-column: session list with status badges (Not started / Scheduled / Complete / Handoff sent), active session detail on the right. Active session has: prep notes (key points to cover), session notes (during/after the conversation), IDP commitments (add-remove inline; gate the "mark complete" button until at least one is captured), mark-complete action, then send Actifyr handoff. When handoff is sent, a confirmation card shows the payload sent (OAR band + IDP commitments + competency profile).

### Engagement completion

When all reports are signed off and all feedback sessions delivered, the Report landing surfaces a "Mark engagement complete" CTA. Clicking changes engagement status to `complete`, sets `completedAt`, and the engagements landing list re-renders showing the engagement in the Complete column.

---

## What to look for in this review

The two destinations are different in feel; review them separately.

**Calibrate first.** The flow is Reconcile → Moderate → OAR → Sign off. Open FirstCry → Calibrate. The seed has three score records on the FirstCry engagement (Anita's BEI scoring of one participant, Rajesh's case-study scoring of two), which means the heatmap will show real data for some cells and grey-empty cells elsewhere. Click a coloured cell. Read the observer breakdown. Set a moderated score. Move to Moderate, scan a participant profile. Move to OAR, set a band for someone. Don't sign off yet unless you want to test the unlock-to-Report flow.

**Report next.** Apollo (Complete status) has Calibrate pre-signed-off, so open it from there if you want to see Report without doing the full Calibrate dance. From the Report landing, click into Individual: pick a participant, click "Generate prompt" on Executive summary, paste it somewhere (a clipboard reader, or just inspect the alert text), then paste a synthetic response into the Edit area and sign off the section. Move to Group view — see the band distribution and themes. Move to Feedback — add a couple of commitments, mark complete, send handoff.

Three specific questions for this review:

1. **The two-pass score-then-evidence flow in Score (Pass 4) propagates through to Calibrate's drill-in modal.** Does the evidence read as useful context when moderating? Or do you wish the modal showed more — perhaps the raw indicator-by-indicator ratings, not just the competency-level average?

2. **The prompt-generation approach for Report Individual.** Is this the right Pass 6 trade-off, or should we have invested in a direct API call instead? The prompt is good enough that pasting into Claude produces usable drafts — but it's an extra step per section.

3. **The OAR band picker on Stage 3.** It's a 5-button row per participant with rationale capture on expand. Compared to a slider or numeric input, does the discrete-band picker feel right for a Lead Assessor making a categorical call?

---

## Walkthrough script

The full v0.8 walkthrough, top to bottom, takes ~25 minutes.

1. **Land on engagements.** See four engagements: FirstCry (Live), Levi Strauss (Draft), Tata Steel (Draft), Apollo (Complete).
2. **Open FirstCry.** Setup is locked; observer scoring is already in progress.
3. **Click the Score tab.** Pick Anita Rao (Lead). See her two tools (BEI, role-play). Open BEI. Open p1 (Sneha — fully scored). See phase 1 ratings. "Continue to evidence →" → phase 2 with the rich seeded notes. (This is what Pass 4 shipped — confirming it still works.)
4. **Click the Calibrate tab.** Coverage band shows current scoring %. Three stage cards.
5. **Stage 1 — Reconcile.** Heatmap. Cells with data for the scored participants and competencies; grey elsewhere. Click any green or amber cell — drill-in opens. Read the observer breakdown and evidence. Set a moderated score with rationale. Save. Cell now shows the "mod" tag.
6. **Stage 2 — Moderate.** Pick a participant from the left list. See their profile. Edit pencil → inline edit → save. Override appears with the "moderated" label.
7. **Stage 3 — Set OARs.** Per-participant row with the computed OAR. Click a band button — expandable rationale capture. Save the rationale. Repeat for a couple. Sign-off block at bottom — gated until all OARs confirmed.
8. **Click the Report tab.** Lock gate appears: "Calibrate must be signed off first." Return to Stage 3, confirm all OARs (just click "Proficient" on each for speed), sign off Calibrate. Confirm twice. Report unlocks.
9. **Report landing.** Three mode cards.
10. **Mode 1 — Individual.** Pick a participant. Click "Generate prompt" on Executive summary. Notice the toast / "Copied" indicator. Paste somewhere to verify the prompt is well-formed (you'll see participant identity, OAR band, full competency profile with scores, and section-specific instructions). Hit "Edit/Add" → paste a synthetic response → "Sign off section". Status badge updates to green.
11. **Mode 2 — Group.** OAR band distribution. Themes (auto-surfaced strengths and gaps). Per-competency bench-strength bars. Click "Show names" → "Names masked" → "Show names" again to verify the toggle.
12. **Mode 3 — Feedback.** Pick a participant. Add prep notes. Add 2-3 IDP commitments. Click "Mark session complete." Click "Send Actifyr handoff." Confirmation card appears below.
13. **Return to Report landing.** If all reports signed off and all sessions delivered, "Mark engagement complete" appears. Click it.
14. **Return to engagements list.** FirstCry now shows in the Complete column.

To see Report without doing the full Calibrate flow first, open **Apollo** (Complete status) → Report. Calibrate was pre-signed-off in the seed.

---

## Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── LandingShell.tsx           # v0.8 footer
│   │   └── EngagementShell.tsx        # v0.8 footer
│   ├── ui/...
│   ├── AddEngagementModal.tsx
│   ├── StepPageHeader.tsx
│   └── ObserverPersonaSwitcher.tsx
├── pages/
│   ├── EngagementsLanding.tsx
│   ├── SetupDashboard.tsx
│   ├── SetupStepStub.tsx
│   ├── LockReview.tsx
│   ├── SetupWizard.tsx
│   ├── Placeholders.tsx               # dead, can remove
│   ├── ScoreLanding.tsx
│   ├── ScoreCockpit.tsx
│   ├── ScoreParticipantSheet.tsx
│   ├── CalibrateLanding.tsx           # NEW in Pass 5
│   ├── CalibrateReconcile.tsx         # NEW in Pass 5
│   ├── CalibrateModerate.tsx          # NEW in Pass 5
│   ├── CalibrateOar.tsx               # NEW in Pass 5
│   ├── ReportLanding.tsx              # NEW in Pass 6
│   ├── ReportIndividual.tsx           # NEW in Pass 6
│   ├── ReportGroup.tsx                # NEW in Pass 6
│   ├── ReportFeedback.tsx             # NEW in Pass 6
│   └── steps/...
├── lib/
│   ├── cn.ts
│   ├── store.ts                       # store v7 with Pass 5/6 actions
│   ├── scoring.ts
│   └── calibrate.ts                   # NEW in Pass 5
├── mocks/
│   ├── dictionary.ts
│   ├── toolLibrary.ts
│   └── engagements.ts                 # seed updated with Calibrate/Report state
├── types/
│   └── index.ts                       # full v0.8 model
├── App.tsx
├── main.tsx
└── styles.css
```

---

## Build status

- Production build: **470 KB main JS / 120 KB gzipped**
- TypeScript strict; zero errors, zero warnings, 1560 modules
- All 11 new routes serve 200
- Tailwind with custom design tokens
- Store version: 7

---

## What's deliberately stubbed in v1

These are real-world hookup points, deliberately stubbed in the prototype:

- **AI drafting in Report Individual.** Prompt generation, not direct model calls. Paste into Claude or preferred model externally. Production: a "Draft with AI" button calling Anthropic API or another provider.
- **Activation handoff to Actifyr.** Shows the payload sent on screen but no actual API call. Production: POST to Actifyr's intake endpoint with the participant payload.
- **Clipboard for prompt copy** uses `navigator.clipboard.writeText` with a fallback that puts the prompt directly into the edit textarea. Some embedded webview clients block clipboard access.
- **PDF / PPTX export of individual reports.** No download yet. Production: server-side render to PDF using moderated content; PPTX from a template.
- **Real authentication / multi-user.** Observer picker is a sign-in stub. The Lead Assessor sign-off action attributes to whoever's acting as the picker.
- **Post-lock amendments.** Once Calibrate is signed off, the moderated scores and OARs are still editable via the store actions, but the UI doesn't expose edit affordances. Production needs an explicit "Reopen for amendment" workflow with audit log.
- **Audit log.** No history view of who moderated what when. Production needs this for assessment governance.
- **Mobile scoring.** Score is desktop/tablet only. Calibrate and Report are intentionally desktop-only (Lead workflows, not field-capture).

---

## What v1.1 should address

- Reopen-for-amendment flow with audit log
- Direct AI integration in Report Individual (replacing prompt generation)
- Real PDF/PPTX export of individual reports
- Actifyr API integration for the feedback handoff
- Per-participant cohort comparison view inside Report Individual
- Mobile-friendly Score for tablet AC days

The shape of v1 is now complete. v1.1 is polish, integration, and one or two missing affordances — not new destinations.
