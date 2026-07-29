---
description: Bump the qrspi plugin's pinned source ref in the separate lotea-be/ai-agent-marketplace repo to a published release tag, as a reviewed PR (never a direct push to the marketplace main). Run it after /qrspi-release publishes a tag, to deliver the release to installed consumers. Local repo dev-tooling, not shipped in the plugin.
agent: build
---

Perform the **external marketplace step** that `/qrspi-release` cannot do from
inside the kit repo: point the consumer-facing qrspi pin at a freshly published
release tag. Pushing a `vX.Y.Z` tag publishes a GitHub Release, but installed users
stay on the old version until the qrspi entry's `source.ref` is bumped to that tag in
the **separate** `lotea-be/ai-agent-marketplace` repo. This command does that bump as
a **reviewed PR** — never a direct push to the marketplace `main`, because that pin is
every consumer's install source.

Optional argument — the target version `X.Y.Z` (no `v` prefix): $ARGUMENTS
(If omitted, defaults to the kit's current `.claude-plugin/plugin.json` `version` —
the one `/qrspi-release` just cut.)

**Load skill `qrspi-marketplace-bump` first** — it carries the authoritative checklist
(preconditions, the sibling-repo locate, the ref edit, the PR handoff, and the safety
rules). Follow it exactly.

Summary of what happens (the skill is the source of truth):

1. **Resolve the version** — from the argument, or the kit's current `plugin.json`
   `version`. Validate the SemVer shape.
2. **Verify preconditions** — the `vX.Y.Z` tag is actually published on the qrspi
   remote; the marketplace repo is present as a sibling folder (located via **Glob**);
   the pin is not already at that tag (and not a downgrade); the marketplace tree is
   clean and `main` fast-forwards. Stop on any failure.
3. **Branch off the marketplace `main`** — `chore/bump-qrspi-vX.Y.Z`.
4. **Edit only the qrspi entry's `source.ref`** to `vX.Y.Z`, leaving every other
   plugin and field untouched; confirm the manifest is still valid JSON.
5. **Commit** the manifest (`chore: bump qrspi source to vX.Y.Z`), **push the
   branch**, and **open a PR** against the marketplace `main` — the PR is the review
   gate; the command does not merge it or push to `main`.
6. **Report** the PR URL and that merging it delivers the release to consumers; offer
   to clean up a stale, already-merged prior bump branch.

Local dev-tooling — not shipped in the plugin.
