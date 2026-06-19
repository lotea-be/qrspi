# Tasks -- example-greeting

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Greeting command + Copilot prompt

**Model:** sonnet -- additive command authoring with no novel logic; the
sync generator handles the Copilot prompt automatically once the source file
exists

- [x] 1.1 Create `claude/commands/greeting.md` with `description:` frontmatter
  and a command body that reads git user name, branch, kit version, and active
  change IDs, with graceful degradation when git context is absent (D2)
- [x] 1.2 Run `node sync-copilot.mjs`; confirm
  `copilot/prompts/qrspi-greeting.prompt.md` appears in the output (D3)
- [x] 1.3 Run `node sync-copilot.mjs --check`; confirm exit 0 (no uncommitted
  drift after the regen)
- [x] 1.4 Run `node scripts/lint.mjs`; confirm exit 0 (new command has
  required `description:` frontmatter; no dangling skill references)
- [x] 1.5 Manual checkpoint: invoke `/qrspi:greeting` in a terminal and confirm
  the banner includes user name, branch, kit version, and at least one active
  change ID

## 2. Quality gate

**Model:** sonnet -- mechanical verification only

- [x] 2.1 Confirm `copilot/prompts/qrspi-greeting.prompt.md` is committed
  alongside `claude/commands/greeting.md` (atomicity: source + generated)
- [x] 2.2 Confirm CI drift job passes (`node sync-copilot.mjs --check` in CI)
- [x] 2.3 Confirm CI lint job passes (`node scripts/lint.mjs` in CI)
