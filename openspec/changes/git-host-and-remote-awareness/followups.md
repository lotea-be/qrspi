# Follow-ups -- git-host-and-remote-awareness

> Post-PR fix queue. Resolve with `/qrspi:followup git-host-and-remote-awareness`.
> Archived with the change; every box should be ticked before archival.

- [ ] **Verify task 3.5 at release-cut (release-time dogfood).** The legacy-cheatsheet prompt-once/write-back and the `/qrspi:update` `0.14.0.yaml` manual-step surfacing are structurally unobservable pre-release: `feature`/`archive` always resolve via built-in defaults (so the missing-field prompt never fires), and `/qrspi:update` only walks `migrations/0.14.0.yaml` once `plugin.json` is bumped to `0.14.0`. Verify both when cutting the release that ships this change. (source: PR review)
- [ ] **Spot-check the Full-auto no-remote path and live `gh` resolution.** The Full-auto no-remote push path (no hard-stop at push; merge-back still gated) and live `gh` vendor resolution against a real GitHub remote were not exercised end-to-end in the dogfood environment (`az`/`glab` unavailable; Azure/GitLab verified by reading the skill's lookup table vs spec). Both reuse already-verified mechanisms; spot-check where those CLIs and a remote are available. (source: PR review)
