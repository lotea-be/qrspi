# Claude instructions for the QRSPI kit repo

## Never hand-edit `copilot/`

`copilot/` is **generated**, not authored. The source of truth is `claude/`
(plus `openspec-templates/`). The entire `copilot/` tree is wiped and rebuilt
by [`sync-copilot.ps1`](sync-copilot.ps1), so any manual edit there is lost on
the next sync.

**Do not edit, create, or delete files under `copilot/` directly.** If a change
needs to reach the Copilot artifacts:

1. Make the change in the corresponding `claude/` source file (or, for a
   systematic mapping gap, in `sync-copilot.ps1` itself — never in the output).
2. Propose running the sync script and let the user run/approve it:

   ```powershell
   ./sync-copilot.ps1            # regenerate copilot/ from claude/
   ./sync-copilot.ps1 -Check     # verify zero drift (CI-style check)
   ```

   For a reviewed pass, `/qrspi-sync-copilot` runs the script and improves the
   script when it finds a gap.

If you catch yourself about to use Edit/Write on a path under `copilot/`, stop
and propose the sync instead.

## Don't shell out in slash commands — use Glob

In slash-command files (`claude/commands/*.md` and the dev-tooling
`.claude/commands/*.md`), do not use `!`...`` shell-injection to peek at the
repo (e.g. `ls … 2>/dev/null`). The permission checker statically parses those
and rejects bash redirects on Windows/PowerShell ("Unrecognized redirect
shape"). Instead, instruct the agent to use the **Glob** tool:

> Do not shell out — Glob has no permission requirements and works on every
> platform.

Write "use the Glob tool with pattern `…`" rather than embedding a shell `ls`.

## Don't write `!`-then-backtick literally — even in prose

The same static scanner that powers shell-injection also fires on
**documentation** of the syntax. In any command/skill markdown (`claude/**`,
`.claude/**`), an exclamation mark placed immediately before a backticked span is
read as a real auto-run directive — there is no "this is just an example" escape.
If the span holds a placeholder like `<shell>`, its leading `<` parses as an
input redirect and the whole file fails to load ("Unrecognized redirect shape"),
which is what broke `/qrspi-sync-copilot`.

When you need to *describe* that syntax, never put `!` directly against a
backtick. Split it — keep the `!` in its own code span or spell it out in words
(e.g. "an exclamation-prefixed shell-injection line"), the way this very file and
[`SKILL.md`](.claude/skills/qrspi-sync-copilot/SKILL.md) do.
