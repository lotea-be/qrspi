# Tasks — archive-auto-create-pr

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Command prose edits and README update

**Compute:** effort=low model=haiku — single-file prose rewrites against a fully specified contract; zero branching logic or cross-file coordination beyond README prose

- [x] 1.1 Edit `claude/commands/archive.md` step-5 new-branch sub-path: replace print-only sentences with mode-aware create gate (Manual AskUserQuestion; Full/Semi auto-create), host-CLI reuse from step 3, title-only `--body ""` create targeting default branch, stdout capture of `#<N>` and URL, and graceful-degrade prose on failure (D1, D2, D3, D4, D5)
- [x] 1.2 Edit `claude/commands/archive.md` step-6 "New branch chosen" bullet: replace "repeat the suggested PR-create command" with "report the created archive PR (`#<N>` + URL)"; add fallback wording for show-command-first and create-failed paths (D3, D5)
- [x] 1.3 Update `README.md` archive-flow prose to reflect auto-create behaviour rather than print-only (no change needed: README has no step-level prose describing the print-only behaviour)
- [x] 1.4 Unit/integration test: run `node scripts/lint.mjs` — all checks must exit 0 with no regression
- [x] 1.5 Checkpoint: open `claude/commands/archive.md` and confirm step 5 contains the mode-aware create gate prose and step 6 contains capture-and-report wording (not print-only); open `README.md` and confirm the archive-flow description no longer says the command prints the PR-create command; confirm `node scripts/lint.mjs` exits 0

## 2. Dogfood runtime verification

**Compute:** effort=low model=sonnet — no code to write; the implementer's job is to produce fixture instructions and the human-verification task card; reasoning is moderate (translating spec scenarios into a testable sequence) but the output is short prose

- [x] 2.1 Prepare a throwaway consumer fixture outside this repo (e.g. in the scratchpad) with a completed, unarchived QRSPI change and a pushed feature branch, suitable for driving `/qrspi:archive` to step 5's new-branch path
- [x] 2.2 (human) In a `claude --plugin-dir /workspaces/git/qrspi` session on the fixture, run `/qrspi:archive <id>` in Full-auto mode and verify: PR created without an AskUserQuestion, `#<N>` and URL reported in step 6 (D2) — observed 2026-08-10: no create-gate prompt in Full auto; step 6 reported the archive PR #N + URL
- [x] 2.3 (human) Re-run in Manual mode and choose "Create the PR now": verify that the create command runs and step 6 reports `#<N>` + URL (D2, D3) — verified 2026-08-10 on the fixture remote: PR #3 created (OPEN), base=main, empty body (D4 title-only), head=chore/archive-demo-change; step 6 reported #N + URL
- [x] 2.4 (human) Re-run in Manual mode and choose "Show me the command first": verify the command is printed and not run, and step 6 reports not auto-created (D3) — verified 2026-08-10 on the fixture remote: archive branch pushed (chore/archive-demo-change) but NO PR created (create command printed, not run); step 6 reported not auto-created
- [x] 2.5 (human) Simulate a create failure (e.g. delete the remote branch or pass a bad flag) and confirm step 6 reports "branch pushed, PR not auto-created" rather than hard-stopping (D5) — verified 2026-08-10: forced create failure via bogus stack-cheatsheet default branch; `gh pr create` failed ("Base ref must be a branch"), archive did NOT hard-stop, reported "Archive PR not auto-created / branch pushed and safe" + printed manual command; remote confirms branch pushed (c1acc0d), no PR created
- [x] 2.6 (human) Checkpoint: all four scenarios above observed and passing — Full-auto auto-create, Manual "Create now", Manual "Show command first", graceful-degrade on create failure — all four verified 2026-08-10 against a live `--plugin-dir` session on a throwaway GitHub fixture, each confirmed against remote ground truth (PRs #2/#3 created for auto/manual-create with title-only body targeting main; branch-pushed-no-PR for show-command-first and graceful-degrade)
