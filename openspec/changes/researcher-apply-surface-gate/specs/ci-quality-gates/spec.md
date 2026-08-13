# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the `researcher-apply-surface-gate` change.
> Adds a new Check 24 static lint assertion that verifies the researcher's step 1 contains the gate-instruction phrase, preventing silent regression.

## ADDED Requirements

### Requirement: Lint job asserts researcher step 1 contains the gate-instruction phrase via Check 24
The system MUST include a Check 24 (`checkResearcherGateInstruction`) registered
in `scripts/lint.mjs` after Check 23, using the same dependency-free ESM pattern
(async function pushing to `errors[]`,
`process.stdout.write('Check 24: ...')` label in `main()`). Check 24 MUST read
`claude/agents/researcher.md` and assert that step 1 of `## What to do` contains
the stable substring `surface-gate rule per the \`repo-surface\` skill` (or an
equivalent fragment specific enough that dropping the gate instruction fails the
check). The check MUST prefer a stable-substring match over a byte-for-byte match
so that trivial rewording (punctuation, line wrapping) does not cause false
failures. Check 24 MUST carry an inline in-memory self-test: a synthetic fixture
string containing the required phrase MUST pass, and a synthetic fixture string
omitting it MUST fail; if any self-test assertion fails, a Check 24 self-test
error MUST be pushed to `errors[]` so CI reports the regression. Check 24 MUST
exit non-zero when the phrase is absent.

#### Scenario: researcher step 1 containing the gate-instruction phrase passes Check 24
- **WHEN** `claude/agents/researcher.md` step 1 contains the phrase
  `surface-gate rule per the \`repo-surface\` skill` and `node scripts/lint.mjs`
  is run
- **THEN** Check 24 reports `OK` and does not contribute a non-zero exit.

#### Scenario: researcher step 1 missing the gate-instruction phrase fails Check 24
- **WHEN** a contributor edits `claude/agents/researcher.md` and removes the
  gate-instruction sentence from step 1, and `node scripts/lint.mjs` is run
- **THEN** Check 24 reports a violation naming `researcher.md` and exits non-zero,
  preventing silent regression of the surface-gate instruction.

#### Scenario: inline self-test covers both pass and fail legs
- **WHEN** Check 24's inline self-test runs at the top of `checkResearcherGateInstruction`
- **THEN** the fixture containing the required phrase is accepted (no error pushed)
  and the fixture omitting the phrase is rejected (error pushed); if either
  assertion behaves incorrectly, a `[researcher-gate-instruction] SELF-TEST FAILED`
  error is pushed to `errors[]` so CI reports the regression.

#### Scenario: future edit that rewrites the gate-instruction sentence while preserving the stable substring still passes
- **WHEN** a contributor rephrases the gate-instruction sentence in researcher.md
  but keeps the stable substring `surface-gate rule per the \`repo-surface\` skill`
  and `node scripts/lint.mjs` is run
- **THEN** Check 24 reports `OK`, because the stable-substring match is robust to
  trivial rewording around the anchoring phrase.
