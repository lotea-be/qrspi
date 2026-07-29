# Tasks — reassess-openspec-dependency

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Verdict of record (keep)

**Compute:** effort=low model=sonnet — no-code human-confirmation slice; the verdict is already written and validated

- [x] 1.1 (human) Open `openspec/changes/reassess-openspec-dependency/design.md` and confirm that decisions D1 (keep verdict), D2 (two failure legs), and D3 (config assertion goes inside existing Check 1, not a new check number) are the decisions you want on record before implementation of Slice 2 begins. (D1) — confirmed: all three approved at the D review this session.

## 2. Pin-coupling guard, end-to-end

**Compute:** effort=medium model=sonnet — single-file edit with clear design reasoning already settled; mirrors existing self-test pattern but requires understanding the `checkPinAgreement` control flow to place the new assertion correctly after the cross-occurrence agreement check (D2, D3, D6)

- [ ] 2.1 In `scripts/lint.mjs`, extend `checkPinAgreement` with the config-coupling assertion: after the existing cross-occurrence agreement check, read `openspec/config.yaml` and (a) push an error when `openspec_version` is absent (config-absent failure leg), and (b) push an error when `openspec_version` is present but does not equal the pin extracted from the README (config-mismatch failure leg). No new check number -- the assertion lives inside the existing Check 1 body. (D2, D3)
- [ ] 2.2 Inside `checkPinAgreement`, add an inline self-test that exercises three fixtures: absent-config (expects pushed error), present-but-wrong-value (expects pushed error), and agrees (expects no error). Wire self-test failures as pushed errors so CI catches regressions automatically, in the style of the existing Check 14/15 self-tests in the file. (D6)
- [ ] 2.3 Unit/integration test: run `node scripts/lint.mjs` against the real repo and confirm exit 0 and all checks green (happy path); then run with `openspec_version` temporarily removed from `openspec/config.yaml` and confirm exit non-zero naming the config-absent failure (error case 1); then run with `openspec_version` set to a wrong value (e.g. `"1.3.0"`) and confirm exit non-zero naming the config-mismatch failure (error case 2).
- [ ] 2.4 (human) Checkpoint: run `node scripts/lint.mjs` in the repo root. Expected: all checks report green (including Check 1) and the run exits 0. Then temporarily remove `openspec_version` from `openspec/config.yaml` and re-run: Check 1 must exit non-zero and name the config-absent failure. Restore the field and set it to a wrong version (e.g. `"1.3.0"`), re-run: Check 1 must exit non-zero and name the config-mismatch failure. Restore to the correct value; final run must be green.
