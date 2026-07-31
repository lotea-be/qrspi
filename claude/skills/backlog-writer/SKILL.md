---
name: backlog-writer
description: Shared append procedure for adding a Check-22-valid idea row to openspec/backlog.md. Load this skill whenever you need to capture a separable future change as a new idea row. Handles dedup, P-band proposal, row construction, and staging.
---

## What this skill does

This skill owns the canonical row-append procedure for `openspec/backlog.md`.
It handles dedup, P-band proposal, row construction, and file staging in a
single repeatable flow. Any command or agent that needs to capture a separable
future change as a new `idea` row delegates to this procedure rather than
implementing its own grammar.

The frozen row grammar and body rules are the single source of truth defined in
`openspec-templates/backlog.template.md` and enforced by Check 22
(`checkBacklogSchema`). This skill references them -- it does NOT restate the
grammar inline.

## When to load this skill

Load this skill when you are about to append a new `idea` row to
`openspec/backlog.md`. Do not load it for reads or for updating existing rows.

## Append procedure

Follow these steps in order. Do not skip or reorder them.

### Step 1 -- Dedup check

Read `openspec/backlog.md`. Extract all existing row slugs (each `### <slug>`
heading). Scan the existing rows for any that match the candidate idea **by
intent**, not just by exact wording. A match on intent means the idea would
solve the same problem or overlap substantially with an existing row.

- If a matching row exists: report the existing slug and its `**Why:**` line
  to the caller. Do NOT proceed with the append. The caller decides whether to
  proceed anyway (after human confirmation) or abort.
- If no matching row exists: continue to Step 2.

### Step 2 -- Derive and confirm the slug

If the caller has not already derived a slug: derive a kebab-case slug from the
idea title or intent. Slug grammar: lowercase letters, digits, and single
hyphens only (no leading or trailing hyphens, no consecutive hyphens). The slug
must be unique among existing `### <slug>` headings in the backlog.

Present the derived slug to the human and confirm acceptance. Adjust if
requested.

### Step 3 -- Propose a P-band

Use **AskUserQuestion** with:

- question: `What priority band for "<slug>"?`
- choices (exactly these three, with the preamble descriptions):
  - `P1 -- correctness/safety or highly visible defect; do next`
  - `P2 -- high-value enhancement or lightly dependent on another change`
  - `P3 -- strategic bet or sequenced behind another change`

Record the chosen band as `P1`, `P2`, or `P3`.

### Step 4 -- Collect the one-sentence Shape

Use **AskUserQuestion** with:

- question: `One-sentence **Shape:** for "<slug>" (the mechanism, surfaces it touches, cheapest-first cut -- no TBD placeholders):`
- choices: (free-text -- use the free-text form, do not enumerate choices)

If the AskUserQuestion tool requires a choices array, provide a single entry
`["<type your one-sentence shape here>"]` and accept whatever the human types.

Do NOT accept a `TBD` answer. If the human provides `TBD` or equivalent, re-ask
and explain that a valid Check-22 row requires a concrete `**Shape:**` sentence.

### Step 5 -- Construct the row

Build the row using the frozen grammar from `openspec-templates/backlog.template.md`:

```
### <slug> -- `idea` * **P<n>**

**Why:** <one-line problem statement supplied earlier>

**Shape:** <one-sentence shape from Step 4>
```

Important grammar details (the em-dash and middle-dot are load-bearing for
Check 22; use the exact Unicode characters):
- The separator between `<slug>` and `` `idea` `` is an EM-DASH (U+2014) -- the
  character `--` (two hyphens) is NOT valid.
- The separator between `` `idea` `` and `**P<n>**` is a MIDDLE-DOT (U+00B7) --
  the character `*` (asterisk) is NOT valid.
- Both separators are surrounded by single spaces.

In this skill file the literal em-dash and middle-dot cannot be embedded in a
fenced code block without risking copy errors. When constructing the actual row:
- Replace `--` in the heading line above with U+2014 (em-dash).
- Replace `*` in the heading line above with U+00B7 (middle-dot).

### Step 6 -- Locate the insertion point in ## Ideas

The new row goes under the `## Ideas` section. Insert it:
- After the P-band preamble block (the paragraph that describes P1/P2/P3) and
  before the first existing row of equal or lower priority, OR
- At the end of the `## Ideas` section when no lower-priority row exists.

Priority order: P1 rows before P2 rows before P3 rows.

If the `## Ideas` section does not exist in the file, abort and report the
error -- do NOT create the section; the file is malformed and the human must
fix it.

### Step 7 -- Stage the edit

Apply the edit to `openspec/backlog.md` using the Edit tool. Do NOT commit --
the caller is responsible for including the edit in the correct commit.

After staging, report:
- The slug that was appended.
- The P-band that was assigned.
- The full row that was inserted (so the human can verify grammar).
