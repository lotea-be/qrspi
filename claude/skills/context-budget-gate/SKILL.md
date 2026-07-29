---
name: context-budget-gate
description: In-session context-budget gate for QRSPI orchestrators. Tracks a stage-event counter in conversational context, fires a one-line advisory nudge at 8 events (no AskUserQuestion), and a never-suppressed soft-gate AskUserQuestion at 12 events. Load this at the top of each gate-scoped QRSPI command, after qrspi-version-check and before run-mode establishment.
metadata:
  audience: orchestrator
---

## What this skill does

Each gate-scoped QRSPI command loads this skill **immediately after
`qrspi-version-check`** and **before run-mode establishment**. The skill
maintains an in-context stage-event counter (no disk file, no temp marker,
no config entry) that resets to 0 on `/clear` or a new session -- a safe
lower bound. It evaluates two independent triggers on every invocation and
fires a notice or interactive gate if either crosses its threshold.

> **Shipped skill location:** `claude/skills/context-budget-gate/SKILL.md`
> (not `.claude/skills/`). It auto-registers from the `skills: ./claude/skills`
> directory and requires no `plugin.json` edit.

## Silence discipline

This skill speaks to the user on **exactly two** paths: the **nudge** (one-line
advisory only, no AskUserQuestion) and the **soft gate** (AskUserQuestion).
On every other path the skill is **completely invisible**:

- Do **not** announce that you are running or loading the budget check.
- Do **not** report the current counter value unless a gate fires.
- Do **not** narrate that "the context budget check passed silently."
- Emit **zero** user-visible tokens on the happy path -- proceed directly
  to the embedding command's next step.

## Execution order (mandatory)

Within each embedding command, execute in this exact order:

1. Session-flag guards (step 1) -- check nudge and soft-gate flags first
2. Increment the stage-event counter (step 2)
3. Dual-trigger evaluation (step 3) -- counter threshold OR qualitative self-assessment
4. Fire the appropriate level if triggered (steps 4 and 5)

## Step 1 -- Session-flag guards

Before incrementing the counter, check both in-context session flags:

**Nudge flag:** held in context only -- no disk file, no config entry. It
is lost on `/clear` or a new terminal session (correct behaviour: a fresh
session re-evaluates).

**Soft-gate flag:** same mechanism as the nudge flag; independent.

**Logic:**

- If the **soft-gate flag is already held**: return immediately. Both
  thresholds have been evaluated and the human chose to continue. Do not
  increment, do not print, do not prompt. The stage proceeds directly.
- If the **nudge flag is already held** and the soft-gate flag is NOT held:
  skip to step 2 (increment) and skip nudge evaluation in step 3, but still
  evaluate the soft-gate threshold in case this invocation crosses 12.
- If **neither flag is held**: continue normally through all steps.

## Step 2 -- Increment the stage-event counter

Retrieve the in-context stage-event counter. If no counter is held (first
invocation of the session), initialise it to 1. Otherwise increment it by 1.

The counter is held entirely in the orchestrator's conversational context.
No file is written; no disk artifact is produced. The counter resets to 0
(effectively: is absent) on `/clear` or a new session, which is correct
behaviour -- a safe lower bound.

**`/qrspi:followup` note:** when the embedding command is `/qrspi:followup`,
increment the counter **once per invocation of `/qrspi:followup`**, not once
per follow-up item processed in that invocation. If the command resolves
three follow-up items in one run, the counter goes up by exactly 1.

## Step 3 -- Dual-trigger evaluation

After incrementing, evaluate BOTH of the following triggers. The gate fires
when **either** crosses its threshold first -- whichever comes first wins.

**Trigger 1 -- counter threshold:** compare the counter to the configured
thresholds (nudge: 8, soft gate: 12).

**Trigger 2 -- qualitative self-assessment:** assess whether your current
context window feels heavily loaded with accumulated stage artifacts,
prior-stage outputs, long subagent summaries, or extensive conversation
history that would impair careful instruction-following. If the answer is
yes -- even if the counter is below 8 -- the corresponding gate fires.

Evaluate the soft-gate threshold (12) before the nudge threshold (8) in
each invocation. Reason: a single invocation might cross both; soft gate
takes precedence.

## Step 4 -- Soft gate (fires at counter >= 12 or qualitative assessment of heavy load)

**This gate is NEVER suppressed in Full auto, Semi-auto, or Manual run-mode.**

If the soft-gate flag is NOT held and either trigger fires at the soft-gate
level:

1. Issue exactly one **AskUserQuestion**:
   - question: `Orchestrator context is getting full (~<N> stage-events this session). Reset to a fresh session before continuing?`
     (substitute the current counter value for `<N>`)
   - choices (exactly these two, in this order):
     - `Reset now -- I'll start fresh`
     - `Continue in this session`

2. **On "Reset now -- I'll start fresh":**
   - Print the self-contained resume one-liner:
     ```
     Run /clear to reset this session in place, then /qrspi:<next-stage> <id> -- the change folder on disk is the truth; run-mode is re-asked (correct, not a bug). /qrspi:status shows where you are. (A full relaunch is only needed when the plugin files themselves changed.)
     ```
     (Substitute the actual next-stage name and change id. For stage I, use
     `implement <id>` -- the current slice carries forward. For stage PR, use
     `pr <id>`. For `/qrspi:followup`, use `followup <id>`.)
   - **END THE TURN.** Do not auto-advance to any next stage. Do not chain.
     The human opens a new session and re-enters the slash command.

3. **On "Continue in this session":**
   - Set the in-context soft-gate session flag.
   - Return. The embedding command continues from its next step.
   - The soft gate does NOT re-fire in this session.

## Step 5 -- Nudge (fires at counter >= 8 or qualitative assessment of accumulation)

Evaluated only if the soft gate did NOT fire in step 4 (i.e., the counter
is below 12 and the qualitative soft-gate trigger did not fire).

If the nudge flag is NOT held and either trigger fires at the nudge level
(counter >= 8, or qualitative assessment of meaningful accumulation):

1. Print exactly one line:
   ```
   Context advisory: ~<N> stage-events this session -- consider starting fresh if stages feel less sharp.
   ```
   (Substitute the current counter value for `<N>`.)
2. Set the in-context nudge session flag.
3. Return. The stage proceeds normally without any AskUserQuestion.

The nudge MUST NOT issue an AskUserQuestion. The nudge MUST NOT block the
stage. After the nudge fires once, the nudge flag suppresses all subsequent
nudge output for the remainder of the session.

## End of check

After steps 1-5, the embedding command resumes its next step (run-mode
establishment or precondition check) without any further action from this
skill.

## Followup once-per-invocation

When this skill is embedded in `/qrspi:followup`, the counter increments
**once per invocation** (step 2 above), not once per follow-up item
resolved. A session in which `/qrspi:followup` is called three times will
see the counter increment by 3 total across those calls, regardless of how
many items each call resolves.
