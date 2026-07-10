# Tasks — archive-requires-merged-pr

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Block path: the PR-merge gate refuses to archive

**Model:** sonnet — the entire branch structure, wording, and per-host
logic is pinned down verbatim in design.md D1–D6 and D8; this is templated
hard-stop authoring against a pattern (`workflow` skill's hard-stop
procedure) the kit already documents elsewhere, not a novel design decision.

- [x] 1.1 In `claude/commands/archive.md`, insert a new step 3 (renumbering
  the existing skill-delegation step to step 4) that reads
  `openspec/changes/<id>/pr.md` via Read/Glob and extracts the PR number,
  tolerating field drift: prefer a `#<N>` token on the `- **PR:** #<N>`
  line, else fall back to a number parsed from a `URL:` / `PR link:` line
  (D2).
- [x] 1.2 In the same step, hard-block with instructions to run `/qrspi:pr`
  first when `pr.md` is absent, and hard-block showing what was found in
  `pr.md` (asking the human to fix it) when no PR number can be extracted
  at all (D2).
- [x] 1.3 Add host CLI + status-query resolution: read the status-query
  line from the project stack-cheatsheet's `## PR & git workflow` section
  when present; otherwise infer the host from repo signals (`.github/`/
  GitHub remote → `gh`; `azure-pipelines.yml` → `az repos`; `.gitlab-ci.yml`
  → `glab`), defaulting to `gh` when signals are ambiguous (D3).
- [x] 1.4 Add the per-host "merged" definition and invoke the resolved
  status-query command via the Bash tool at runtime (not literal
  shell-injection syntax): GitHub `state == MERGED`; Azure DevOps
  `status == completed`; GitLab `state == merged` (D4).
- [x] 1.5 Add the "surface first, then decide" behavior: always fetch and
  print the PR's number/state/URL before deciding; on `merged`, proceed
  silently to step 4 (skill delegation); on any non-merged state, hard-stop
  unconditionally with the "PR #<N> is <state> (not merged) … merge PR
  #<N>, then re-run `/qrspi:archive <id>`" wording, uniform across `open`
  and closed-unmerged (D5).
- [x] 1.6 Add the CLI-unavailable/unauthenticated branch: when the resolved
  CLI is missing or the query fails on an auth error, hard-stop with a
  distinct, actionable message naming the fix (e.g. "run `gh auth login`,
  then re-run `/qrspi:archive <id>`") — never a silent skip (D6).
- [x] 1.7 In `claude/commands/stack.md`'s `## PR & git workflow` section
  template, add a parallel PR-status-query line next to the existing
  PR-create line (e.g. `gh pr view <N> --json state`, `az repos pr show
  --id <N>`, `glab mr view <N>`) (D8).
- [x] 1.8 Regenerate Copilot: run `node sync-copilot.mjs`, then `node
  sync-copilot.mjs --check` and confirm it exits 0 (confirms
  `copilot/prompts/qrspi-archive.prompt.md` picked up the new step).
- [ ] 1.9 (human) Dev-install the in-progress plugin (`claude --plugin-dir
  /workspaces/git/qrspi`, then `/reload-plugins`) so the dogfood runs below
  exercise this branch's edits, not the last-released `archive.md`.
- [ ] 1.10 (human) Dogfood: run `/qrspi:archive <id>` against a change
  whose `pr.md` is absent — confirm hard-block naming `/qrspi:pr`, no
  skill delegation (D2).
- [ ] 1.11 (human) Dogfood: run `/qrspi:archive <id>` against a change
  whose `pr.md` records an open PR — confirm the command prints
  number/state/URL, then hard-stops with the "merge PR #<N>, then re-run"
  wording (D5).
- [ ] 1.12 (human) Dogfood: simulate (or point at a real) closed-unmerged
  PR — confirm the same hard-stop shape as 1.11, no softer path (D5).
- [ ] 1.13 (human) Dogfood: simulate CLI-unauthenticated (e.g. `gh auth
  logout` in a disposable shell, or temporarily rename the CLI) — confirm
  the distinct D6 wording naming `gh auth login`, worded differently from
  1.11/1.12's message (D6).
- [ ] 1.14 Checkpoint: all five dogfood steps above pass, plus
  `sync-copilot.mjs --check` exits 0; a human reviewing the transcript can
  confirm each hard-stop's wording matches design.md D2/D5/D6 and that no
  path reached the `openspec-archive-change` skill delegation.

## 2. Merge path: archive proceeds, backlog row disappears, one atomic commit

**Model:** sonnet — D7's commit-staging mechanics and D9's one-sentence
wording edit are both fully specified; the only care point (plain `mv`
staging, per design's risk note) is a mechanical `git add` detail already
called out verbatim in D7, not a judgment call.

- [x] 2.1 In `claude/commands/archive.md`, add a new post-skill step (after
  the unchanged `openspec-archive-change` skill delegation succeeds) that
  removes the `<id>` row from `openspec/backlog.md` (D7).
- [x] 2.2 In the same step, stage explicit paths only — the new
  `openspec/changes/archive/YYYY-MM-DD-<id>/` tree, the deletion of the old
  `openspec/changes/<id>/` path, and `openspec/backlog.md` — never
  `git add -A` (D7).
- [x] 2.3 Commit with the exact message
  `chore(<id>): archive change + remove backlog row`, then `git push` (D7).
- [x] 2.4 On any non-zero `git commit`/`git push` exit code, hard-stop and
  surface the git error verbatim rather than leaving the tree
  moved-but-uncommitted (D7).
- [x] 2.5 Edit `claude/skills/workflow/SKILL.md`'s "Before Q — the
  backlog" wording to name `/qrspi:archive` as the command that performs
  the archived-row removal, atomically with the folder move (D9).
- [x] 2.6 Regenerate Copilot again: run `node sync-copilot.mjs`, then
  `node sync-copilot.mjs --check` and confirm it exits 0 (confirms
  `copilot/instructions/workflow.instructions.md` picked up the D9
  wording via the sync, not a hand-edit).
- [ ] 2.7 (human) Dogfood: pick (or confirm) a change with a genuinely
  merged PR — `example-greeting` already has one and can double as the
  happy path (D10, Q23).
- [ ] 2.8 (human) Dogfood: run `/qrspi:archive <id>` — confirm the gate
  prints `merged` and proceeds without asking for confirmation, and that
  the folder lands under `openspec/changes/archive/YYYY-MM-DD-<id>/`
  (Requirement: PR-merge gate ... Scenario: PR is merged).
- [ ] 2.9 (human) Dogfood: confirm `openspec/backlog.md` no longer
  contains the `<id>` row (D7).
- [ ] 2.10 (human) Dogfood: run `git log -1 --stat` — confirm exactly one
  commit `chore(<id>): archive change + remove backlog row` containing
  the archived tree, the old-path deletion, and the backlog edit together
  — no separate commit for the backlog row (D7).
- [x] 2.11 Read the edited `claude/skills/workflow/SKILL.md` passage to
  confirm it names `/qrspi:archive` as the row-removal owner (D9), and
  spot-check the regenerated `copilot/instructions/workflow.instructions.md`
  picked up the wording via the sync.
- [ ] 2.12 Checkpoint: one commit lands with the exact message and file
  set D7 specifies, the backlog row is gone, the archived folder exists at
  the dated path, `sync-copilot.mjs --check` exits 0, and the `workflow`
  skill wording reads as D9 describes.

## 3. Closeout

**Model:** sonnet — mechanical repo-wide verification, no new decisions.

- [x] 3.1 Run `node scripts/lint.mjs` and confirm it passes (README↔command
  bidirectional coverage, Check 4) — no README edit is expected since
  `/qrspi:archive` is already documented and D10/Q18 confirmed no stale
  README prose describes today's unconditional-move behavior.
- [ ] 3.2 (human) Confirm the exact `gh pr view`/`az repos pr show`/`glab
  mr view` `--json`/`-q` flag shapes used in step 1.4 against the CLI(s)
  actually installed; if a flag differs, fall back to the CLI's default
  human-readable output and read the state from it (D4 watch-item).
- [ ] 3.3 (human) Confirm the `pr.md` drift-tolerant extraction in step 1.1
  against the documented field-drift shapes (bare `PR link:` URL, `PR:`
  URL-with-"(draft)") so a real-world `pr.md` is not falsely hard-blocked
  (D2 watch-item).
