# Slices — archive-auto-create-pr

> Stage V of QRSPI. Generated 2026-08-09.
> Vertical slices, not horizontal layers.

## Overview

This change is a prose-only edit to one command file (`claude/commands/archive.md`)
and a README prose update — there is no DB, no HTTP API, and no browser UI. The
canonical M/F/D/T ladder does not apply. The approved proposal anticipated a
single coherent user-facing path, and the work splits into exactly two honest,
independently-verifiable units:

1. **Slice 1** — write the command prose edits that produce the desired runtime
   behaviour (step-5 mode-aware create gate + step-6 relay + README update).
   This slice is fully static-lint-verifiable and ends with a passing
   `node scripts/lint.mjs` run.

2. **Slice 2** — exercise the create-path behaviour that static lint cannot
   reach: a `(human)` dogfood checkpoint in a `claude --plugin-dir` session,
   verifying Full-auto and Manual-"Create now" paths. This is the only slice
   that requires a live run.

Splitting further would be artificial: the README update is only meaningful once
the command prose is correct, and the dogfood checkpoint depends on slice 1 being
fully applied. Three slices would pad rather than clarify. Two is the honest
number.

The `(D<n>)` tags embedded throughout this file are required — this `slices.md`
dogfoods the rule it describes.

## Slices

### Slice 1 — Command prose edits and README update

**Deliverable:** `claude/commands/archive.md` step-5 new-branch sub-path and
step-6 relay are rewritten per the approved spec. `README.md` archive-flow prose
is updated to describe auto-create rather than print-only behaviour. Static lint
passes with no regressions. A human can read the two edited files and confirm the
prose matches the spec requirements without running anything.

- M: no mock service stub — this is a command-file prose edit, not a service layer (D1, D3, D4, D5)
- F: edit `claude/commands/archive.md` step 5 new-branch sub-path: replace print-only sentences with mode-aware create gate (Manual AskUserQuestion; Full/Semi auto-create), host-CLI reuse from step 3, title-only `--body ""` create targeting default branch, stdout capture of `#<N>` and URL, and graceful-degrade prose on failure (D1, D2, D3, D4, D5)
- F: edit `claude/commands/archive.md` step 6 "New branch chosen" bullet: replace "repeat the suggested PR-create command" with "report the created archive PR (`#<N>` + URL)"; add fallback wording for show-command-first and create-failed paths (D3, D5)
- F: update `README.md` archive-flow prose to reflect auto-create behaviour rather than print-only
- T: run `node scripts/lint.mjs` — all checks must pass with no regression (the lint asserts command presence and README command-table entries but cannot verify runtime create behaviour)
- **Compute:** effort=low model=haiku — single-file prose rewrites against a fully specified contract; zero branching logic or cross-file coordination beyond README prose
- Checkpoint: open `claude/commands/archive.md` and confirm that step 5 contains the mode-aware create gate prose and that step 6 contains capture-and-report wording (not print-only); open `README.md` and confirm the archive-flow description no longer says "the command prints the PR-create command"; run `node scripts/lint.mjs` and confirm it exits zero.

### Slice 2 — Dogfood runtime verification

**Deliverable:** the create-path behaviour confirmed working in a live
`claude --plugin-dir /workspaces/git/qrspi` session. This is a `(human)`
checkpoint — the implementer prepares the fixture and instructions; the human
runs the session. Slice 2 has no additional file edits: all prose was applied in
slice 1. The slice is complete when the human observes the expected behaviour and
marks the checkpoint done.

- M: no stub — this slice exercises the real edited command in a dev-install session
- F: no additional file edits — slice 1 applied all prose changes
- D: no data-store — not applicable to this repo surface
- T: `(human)` dogfood checkpoint — run `claude --plugin-dir /workspaces/git/qrspi` in a separate terminal on a throwaway consumer fixture (outside this repo, e.g. in the scratchpad); in that session run `/qrspi:archive <some-archived-id>` and reach step 5's new-branch path; verify Full auto skips the AskUserQuestion and runs the host create command directly (D2); then re-run in Manual mode and verify that "Create the PR now" runs the create command and step 6 reports `#<N>` + URL, while "Show me the command first" prints the command and does not run it (D2, D3); confirm graceful degrade by simulating a create failure and checking that step 6 reports "branch pushed, PR not auto-created" rather than hard-stopping (D5)
- **Compute:** effort=low model=sonnet — no code to write; the implementer's job is to produce fixture instructions and the human-verification task card; reasoning is moderate (translating spec scenarios into a testable sequence) but the output is short prose
- Checkpoint: `(human)` — in the `--plugin-dir` session, the human observes: (a) Full auto: PR created without an AskUserQuestion, `#<N>` and URL reported in step 6; (b) Manual "Create the PR now": same outcome with a prior AskUserQuestion; (c) Manual "Show me the command first": command printed, not run, step 6 says not auto-created; (d) graceful degrade: no hard-stop on create failure, step-6 fallback wording shown.
