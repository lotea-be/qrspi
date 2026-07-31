---
description: Capture a new idea row in openspec/backlog.md via an interactive interview. Derives a slug, deduplicates by intent, proposes a P-band, collects a one-sentence Shape, then delegates row construction and staging to the backlog-writer skill.
---

Capture a new separable-future-change idea in `openspec/backlog.md`.

This command runs on the **main-loop orchestrator** (it carries no `agent:`
frontmatter). That is deliberate: the interview flow uses `AskUserQuestion`
for the P-band proposal and the Shape prompt, which are main-loop-only gates
unavailable inside a subagent.

Load skill `backlog-writer` before doing any other work. That skill owns the
canonical row-append procedure (dedup, P-band proposal, row construction, and
staging). This command body owns the interview -- it drives the flow, hands
off to the skill's steps, and reports the result.

## Argument

`$ARGUMENTS` is an **optional** free-text seed: a short phrase or sentence
describing the idea (e.g. `"add usage telemetry dashboard"`). If present,
use it as the starting point for slug derivation in Step 1. If absent, prompt
the human for the idea intent in Step 1 before proceeding.

## Interview flow

### Step 1 -- Derive and confirm the slug

Derive a kebab-case slug from the seed argument (or from the intent the human
provides when no seed is given). Slug grammar: lowercase letters, digits, and
single hyphens only (no leading or trailing hyphens, no consecutive hyphens).

Present the derived slug and the intent summary to the human using
**AskUserQuestion**:

- question: `Slug for this idea: "<derived-slug>" -- confirm or type a replacement:`
- choices: `["Use this slug", "<type a different slug>"]`

Accept the human's choice or substitution. Adjust until the slug is approved.

If no seed argument was provided, first ask:

- question: `What is the idea? (a short phrase or sentence describing the problem to solve):`
- choices: `["<type the idea here>"]`

Use the response as the seed for slug derivation.

### Step 2 -- Dedup check (skill Step 1)

Follow the `backlog-writer` skill's **Step 1 -- Dedup check**.

Read `openspec/backlog.md` (use the Read tool -- do not shell out). Scan for
existing rows whose intent overlaps with this idea. If a match is found:

Use **AskUserQuestion**:

- question: `A similar idea already exists: "<matching-slug>" -- "<matching-Why-line>". Proceed anyway (append a new row) or abort?`
- choices: `["Abort -- the existing row covers it", "Proceed -- this is distinct enough"]`

On Abort: stop and tell the human the backlog already captures this idea.
On Proceed: continue with the confirmed slug and proceed to Step 3.

### Step 3 -- P-band proposal (skill Step 3)

Follow the `backlog-writer` skill's **Step 3 -- Propose a P-band**. Use
**AskUserQuestion** with the three P-band choices as described in the skill.

### Step 4 -- Shape prompt (skill Step 4)

Follow the `backlog-writer` skill's **Step 4 -- Collect the one-sentence Shape**.
The **Why:** is derived from the idea intent established in Step 1. Confirm it
with the human or let them refine it before collecting the Shape.

Ask for the `**Why:**` line if not already established:

Use **AskUserQuestion**:

- question: `One-line **Why:** for "<slug>" (the problem this idea solves and why it is worth doing):`
- choices: `["<type the one-line Why here>"]`

Then follow the skill's Step 4 for the **Shape:** sentence.

### Step 5 -- Construct and stage (skill Steps 5-7)

Follow the `backlog-writer` skill's **Step 5 -- Construct the row** through
**Step 7 -- Stage the edit**. Pass the confirmed slug, P-band, Why line, and
Shape sentence to the skill steps.

The skill will apply the edit to `openspec/backlog.md` using the Edit tool.

### Step 6 -- Report and commit guidance

After the skill stages the edit, report:

- The slug appended and its P-band.
- The full heading line of the new row (so the human can verify grammar).
- A ready-to-run commit command:

  ```
  git add openspec/backlog.md
  git commit -m "chore(backlog): add idea <slug>"
  ```

Do not commit automatically. The human runs the commit command.

Resolve `openspec/backlog.md` against the **current working repo root** (the
consumer's CWD), not the plugin install directory -- the backlog lives in
the repo you are running the command in. Use the Read tool to read it; do not
shell out.
