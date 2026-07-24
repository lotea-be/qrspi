---
description: Bootstrap (or refresh) this repo's stack-cheatsheet skill — the project-scope skill every QRSPI stage loads for tech-stack and convention context. Detects the stack from the repo's manifests, then interviews to fill gaps. Re-runnable.
agent: build
---

Bootstrap or refresh **this repository's stack-cheatsheet skill** — a
project-scope Claude Code skill that the QRSPI agents (researcher, designer,
architect, implementer, reviewer) load whenever they need to know the project's
languages, frameworks, libraries, and coding conventions. Without it the agents
fall back to generic assumptions; with it, every stage is stack-aware.

This is **per-repo onboarding**, a sibling to `/qrspi:init`. Run it once per
repo (re-run any time the stack changes). The skill lives in **project scope**
(`.claude/skills/<repo>-stack/`), not user scope — it is specific to this repo
and is committed so the whole team shares it.

Steps:

1. **Decide the skill name and path.** Derive `<repo>` from the repository root
   directory name, kebab-cased and lowercased (e.g. `MyApp.Web` → `myapp-web`).
   The skill name is `<repo>-stack` and the target file is
   `.claude/skills/<repo>-stack/SKILL.md`. If that file already exists, **Read
   it first** — this is a refresh: preserve any hand-written detail and update
   in place rather than clobbering.

2. **Detect the stack from the repo (read-only, no shelling out).** Use Glob,
   Grep, and Read to inspect whatever is present. Do not execute project files.
   - **Manifests / build:** `package.json`, `*.csproj` / `*.sln` / `global.json`,
     `go.mod`, `Cargo.toml`, `pyproject.toml` / `requirements.txt`,
     `pom.xml` / `build.gradle*`, `Gemfile`, `composer.json`.
   - **Exact versions:** the matching lockfiles (`package-lock.json`,
     `pnpm-lock.yaml`, `yarn.lock`, `Cargo.lock`, `poetry.lock`, `go.sum`, …).
   - **Tooling / conventions already written down:** `Dockerfile`,
     `.github/workflows/*`, `.editorconfig`,
     linter/formatter configs, an existing `README`.
   - **Tests:** infer the framework and how it is run (xUnit/NUnit, Jest/Vitest,
     pytest, `go test`, …).
   - **Git host & PR workflow:** infer from `.git/config` (the remote URL),
     `.github/` (GitHub → `gh`), `azure-pipelines.yml` (Azure DevOps →
     `az repos`), `.gitlab-ci.yml` (GitLab → `glab`) — so the cheatsheet can
     name the PR-create CLI and the default branch the QRSPI PR stage targets.
   Summarise to the user what you inferred: language(s) + version(s),
   framework(s), key libraries and their idioms, the test framework + run
   command, build/lint/test commands, the git host + PR-create CLI, and the
   high-level project layout (where code, tests, and config live).

3. **Interview to fill the gaps.** Use the **AskUserQuestion** tool only for what
   detection could not answer or where you need confirmation — keep it to a few
   targeted questions, and prefer sensible detected defaults over asking. Good
   things to confirm: naming conventions, error-handling / logging patterns,
   async style, preferred libraries for common tasks, dependency policy (e.g.
   "prefer stable releases over prereleases"), and any "don't do X" rules.

4. **Write `.claude/skills/<repo>-stack/SKILL.md`.** Create the directory if
   needed. Use this shape — the `description` is what lets the QRSPI agents
   discover this as the project's stack-cheatsheet, so keep that phrasing:

   ```markdown
   ---
   name: <repo>-stack
   description: Stack cheatsheet for <repo> — languages, runtime versions, frameworks, key libraries, project layout, testing, and coding conventions. This is the QRSPI stack-cheatsheet skill for this repo; load it whenever you need the project's tech stack or conventions.
   ---

   ## Languages & runtime
   <!-- language(s) and pinned/target versions -->

   ## Frameworks & key libraries
   <!-- framework(s); each major library + the idiom this repo uses it with -->

   ## Project layout
   <!-- where source, tests, and config live; module/assembly boundaries -->

   ## Conventions
   <!-- naming, error handling, logging, async, formatting/lint rules -->

   ## Testing
   <!-- framework, how to run, test naming/structure conventions -->

   ## Build, lint & test commands
   <!-- the exact commands the QRSPI stages run to verify a change: build,
        lint/format check, test, and (if any) the dev/run loop. These are what
        the implementer, reviewer, and follow-up stages invoke. -->

   ## PR & git workflow
   <!-- the git host and its PR-create CLI (e.g. `gh pr create`,
        `az repos pr create`, `glab mr create`); the PR-status-query CLI used
        to check whether a PR has merged (e.g. `gh pr view <N> --json state`,
        `az repos pr show --id <N>`, `glab mr view <N>`); the source-branch
        naming convention (e.g. `features/<id>`); the default target branch
        (e.g. `main`); any PR-description size cap to stay under. -->

   ## Dependency policy
   <!-- e.g. prefer stable over prerelease; how versions are pinned; the
        default package source and how to add one outside it -->

   ## Gotchas / house rules
   <!-- repo-specific "always / never" rules the agents must respect; where
        the project's contributor-guidance file lives, if any -->

   ## Repo surface
   <!-- An authoritative ALLOWLIST of the surfaces this repo HAS. List only the
        surfaces that are present, one per line (`- data-store`). A surface not
        listed is treated as absent -- do NOT enumerate absent ones. This block is
        read by the repo-surface filter to determine which artifact sections
        (Data model, API, UI, Auth, nullable suppression) to emit or omit; when
        the block is present it is authoritative and prose inference is skipped.
        If the repo has no present surfaces, write "_No present surfaces._" so the
        block reads as present-but-empty rather than forgotten. -->
   - data-store
   - http-api
   ```

   Fill every section from detection + the interview. Leave a section out only
   if it genuinely does not apply (say so to the user rather than inventing).
   For the `## Repo surface` block, list only the surfaces the repo actually has,
   drawn from the five in the `repo-surface` skill: data-store when the repo uses
   a database, ORM, or persistent file store; http-api when it exposes HTTP
   endpoints; ui when it ships a browser or desktop UI; auth when it has user
   login, roles, or permission checks; typed-nullable when the language has a
   non-null type system with nullable suppression operators (e.g. C# `!`,
   TypeScript `!`). Omit the rest. For a pure markdown/script kit like QRSPI
   itself, no surfaces are present -- write "_No present surfaces._".

5. **Commit and report.** Stage and commit just the new skill file with message
   `chore(qrspi): add <repo>-stack cheatsheet skill` (or `refresh …` on a
   re-run). Then tell the user:
   - the file path and that it is **project scope**;
   - that they should **restart Claude Code** so it is picked up;
   - that from then on the QRSPI stages load it automatically — no flag needed.

To seed detection, look for common manifests with the **Glob** tool (pattern
`{package.json,go.mod,Cargo.toml,pyproject.toml,pom.xml,*.csproj,*.sln}`) — do
not shell out. (Step 2's detection sweep covers this in full.)

User argument (optional — a stack hint or the skill name to use): $ARGUMENTS
