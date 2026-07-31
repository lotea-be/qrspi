<!--
  Backlog schema legend (frozen by standardize-backlog-format).

  This file is the canonical template for openspec/backlog.md. /qrspi:init seeds
  it verbatim when a repo has no backlog yet. Copied verbatim, it satisfies every
  content assertion of lint Check 22 (checkBacklogSchema) out of the box.

  Heading grammar (one level-3 heading per row):

      ### <id> — `<status>` · **P<n>**

    - <id>       kebab-case slug (lowercase letters/digits, single hyphens).
    - —          an EM-DASH (U+2014), surrounded by single spaces. NOT `--`.
    - `<status>` the status field, backtick-wrapped. Its LEADING keyword is
                 what the enum below validates; any text after the keyword
                 (a note in parentheses, or `into <id> (<date>)`) is free text.
    - ·          the separator is a MIDDLE-DOT (U+00B7), surrounded by single
                 spaces:  ` · `.
    - **P<n>**   the priority band, bold, where <n> is 1, 2, or 3.

  Status enum (the leading keyword only):

      idea | proposed | in-progress | merged | bundled

  Section headings (all three required, presence-only; order not asserted):

      ## In progress | ## Proposed | ## Ideas

  Body rule (scoped by the status KEYWORD, not by presence of a pointer note):

    - idea / proposed (standalone) rows MUST carry BOTH a `**Why:**` line and a
      `**Shape:**` line in the body.
    - bundled / merged rows are EXEMPT from Why/Shape; they carry a `>`
      blockquote pointer note in lieu of a full body.
    - in-progress rows are checked for grammar + enum only (transient; scoped by
      the change's own tasks.md while it is mid-flight).

  The `## Ideas` section MUST open with a P-band preamble line mentioning P1, P2,
  and P3 before its first `### ` row.
-->

# Backlog

Candidate changes for this repo, tracked before they enter the QRSPI flow
(Q → R → D → S → V → P → I → PR). Status is one of `idea` / `proposed` /
`in-progress` / `merged` / `bundled`. Completed work lives under
`openspec/changes/archive/`, not here.

## In progress

_None._

---

## Proposed

_None._

---

## Ideas

Listed in priority order (highest first). Each carries a band — `P1`, `P2`, or `P3`:
**P1** = correctness/safety of the live workflow, a highly visible defect, or a
systemic cost regression that recurs on every run — do next;
**P2** = high-value enhancements, larger or lightly dependent;
**P3** = strategic bets or items sequenced behind another change.

### sample-idea-row — `idea` · **P2**

**Why:** A one-line statement of the problem this idea would solve and why it is
worth doing. Delete this sample row once you have real backlog items.

**Shape:** A short sketch of the likely solution — the mechanism, the surfaces it
touches, and the cheapest-first cut. This is design intent, not a full plan.

### sample-bundled-row — `bundled into sample-change (2026-01-01)` · **P3**

> **Bundled into `sample-change`** (2026-01-01) — this idea was folded into
> another QRSPI run; see the `## Proposed` entry for the anchor change. Bundled
> rows carry a pointer note like this in lieu of a `**Why:**` / `**Shape:**` body.
