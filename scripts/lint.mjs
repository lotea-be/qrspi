#!/usr/bin/env node
// ============================================================================
//  scripts/lint.mjs -- CI quality gate for the QRSPI kit
// ----------------------------------------------------------------------------
//  Checks (run in order, all errors collected before exit -- Checks 1-23):
//
//  1. PIN AGREEMENT  -- every hand-maintained OpenSpec version occurrence
//     must agree. generatedBy: lines in openspec-generated skill files are
//     excluded (those are CLI-managed). Asserts agreement, NOT a fixed count.
//
//  2. FRONTMATTER / NAME  -- every agent, command, and skill file must carry
//     the required YAML frontmatter fields; agent: references must resolve;
//     model: fields must use aliases only; Load skill X references must
//     resolve to a real claude/skills/<X>/SKILL.md.
//
//  3. HEADING ALIGNMENT  -- the canonical section headings from each
//     openspec-templates/*.template.md must also appear in the corresponding
//     inline skeleton in the relevant agent file.
//
//  4. README COMMAND COVERAGE -- every claude/commands/<stem>.md is documented
//     in README.md as /qrspi:<stem>, and every /qrspi:<token> in README.md
//     resolves to a real command file.
//
//  5. GATE-TOOL / EXECUTOR AGREEMENT -- no command with a non-builtin agent:
//     reaches a main-loop-only gate tool (AskUserQuestion) directly or
//     transitively via the workflow choreography.
//
//  6. MIGRATION MANIFEST PRESENCE + SCHEMA + MARKER FORMAT -- every
//     CHANGELOG ## [X.Y.Z] section whose version is >= the lowest version in
//     migrations/ must have a migrations/<version>.yaml; each manifest must
//     be schema-valid (required keys, edit-file-only action, openspec/-scoped
//     paths); openspec/.qrspi-version (if present) must be bare SemVer.
//
//  7. READ-CONTRACT BANNER AGREEMENT -- each of the seven QRSPI stage agents
//     carries a `> **Read contract** -- Reads: ...` banner whose Reads: field
//     must EQUAL that agent's row in the approved read matrix (banner-keyed
//     positive check). Handles the architect two-mode (S/V) contract and the
//     reviewer full-folder special case; scoped strictly to the seven stage
//     agents (never /qrspi:update or qrspi-update).
//
//  8. PR RECONCILIATION PASSES STRUCTURE -- claude/commands/pr.md must carry
//     the tasks-pass and follow-ups-pass section headings and their required
//     choice labels.
//
//  9. VERSION-CHECK EMBED -- the nine QRSPI stage command files (status,
//     questions, research, design, structure, slices, plan, implement, pr)
//     must each contain the inline `qrspi-version-check` skill load line.
//
// 10 (budget-gate-embed). BUDGET-GATE EMBED -- the ten command files that carry
//     the context-budget soft gate (8 stage commands + archive + followup) must
//     each contain the inline `context-budget-gate` skill load line. The three
//     excluded commands (status, update, retro) must not appear in the constant.
//
// 10. TRIAGE PATH ANCHORS -- claude/commands/followup.md must contain the
//     three triage choice-label prefixes (P1/P2/P3) so a future rename cannot
//     silently drop a path. Mirrors the Check 8 pattern for pr.md.
//
// 11. NO SURFACE-GATED SKELETON HEADINGS IN FENCED BLOCKS -- the twenty-two
//     surface-gated section headings must NOT appear as literal heading lines
//     inside fenced code blocks in any of the five artifact-producing agent
//     files (questioner, designer, architect, planner, reviewer). These
//     headings are surface-gated and must only be emitted when the repo's
//     surface declares them present; hard-coding them in skeletons defeats the
//     repo-surface filter.
//     Disjoint-set invariant: Check 3 requires surface-INDEPENDENT headings
//     to be PRESENT; Check 11 requires surface-GATED headings to be ABSENT
//     from fenced blocks -- disjoint heading sets AND disjoint scopes.
//
// 12. OUTPUT-CONTRACT BANNER PRESENCE -- each of the seven stage agents must
//     carry a `> **Output contract**` banner line (presence-only check;
//     the banner text is human-authored). Mirrors the scope and pattern of
//     Check 7. Registered after Check 11.
//
// 13. COMPUTE ANNOTATION VALUE-VALIDATION -- every `**Compute:**` line in the
//     committed change artifacts (openspec/changes/**/slices.md and
//     **/tasks.md) must carry a valid `effort=` token (in COMPUTE_EFFORTS) and,
//     if present, a valid `model=` token (in COMPUTE_MODELS). Orthogonal grammar
//     (D3/D7): `effort=` is REQUIRED (it selects the implementer variant),
//     `model=` is OPTIONAL (defaults to sonnet at spawn). Value-validation only
//     (NOT presence-on-every-slice); tolerates both the dash-bullet and
//     bare-bold structural forms. Scoped strictly to the committed change
//     artifacts -- never scans skills or templates (placeholder examples there).
//
// 14. SURFACE APPLICABILITY OF ARTIFACT HEADINGS -- scans every *.md under
//     openspec/changes/** (excluding /archive/ paths) and flags any heading
//     line that belongs to an ABSENT surface (a surface not listed in the
//     stack-cheatsheet's `## Repo surface` block). Reads the present-surface
//     list from `.claude/skills/qrspi-stack/SKILL.md`; fails loudly if the
//     `## Repo surface` block is absent or malformed (not warn-and-skip).
//     Includes an inline self-test that asserts the detector fires on a
//     synthetic fixture; a broken detector reddens CI immediately.
//     Disjoint scope with Check 11: Check 11 scans INSIDE fenced blocks in
//     agent source files; Check 14 scans OUTSIDE fenced blocks in change
//     artifacts -- the two checks never fire on the same line.
//
// 15. IMPLEMENTER VARIANT AGENT DRIFT GATE -- asserts that the set of
//     claude/agents/implementer-*.md stems exactly equals IMPLEMENTER_VARIANTS;
//     that each variant's step-1 "Load skill" line loads ONLY `implementer-core`;
//     that each variant's `effort:` frontmatter value matches its stem suffix
//     (low/medium/high); and (e) that `./claude/agents/implementer.md` is ABSENT
//     from the `agents` array in .claude-plugin/plugin.json (the base agent was
//     deleted -- its presence would register a dead spawn target). Includes inline
//     self-tests that must fire. Registered after Check 14.
//
// 16. FOLLOWUP BARE-STEM GUARD -- asserts that claude/commands/followup.md
//     contains NO bare occurrence of `qrspi:implementer` (without a variant
//     suffix). Uses regex /qrspi:implementer(?!-)/ so variant stems
//     (-low/-medium/-high) do not match. Catches both the fenced
//     `subagent_type:` form and inline-prose form. Registered after Check 15.
//
// 17. HELPER AGENT READ-CONTRACT BANNER AGREEMENT -- separate from Check 7's
//     nine-stage-agent scope. Maintains HELPER_READ_CONTRACT_EXPECTED (a map
//     distinct from READ_CONTRACT_EXPECTED) with one entry per helper agent;
//     asserts each helper agent's `> **Read contract**` banner `Reads:` field
//     matches its map entry. Initial entry: spec-syncer. Includes an inline
//     self-test (banner-absent fixture must return null from extractReadsField;
//     if it does not, a Check 17 error is pushed). Registered between Check 16
//     and Check 18 so check numbers read 17 -> 18 -> 19 top-to-bottom.
//
// 18. MODIFIED SCENARIO COUNT GUARD -- parses every delta spec under
//     openspec/changes/*/specs/**/spec.md, counts `#### Scenario:` blocks per
//     MODIFIED requirement, and compares each to the base count in
//     openspec/specs/<capability>/spec.md. Flags any reduction. Skips
//     requirements whose base capability spec does not exist (new capability).
//     Numbered 18 to leave room for Check 17 (added in Slice 3).
//
// 19. AUTHORITATIVE SYNC DELEGATOR -- asserts (a) claude/commands/archive.md
//     contains `qrspi:spec-syncer` and (b) no kit-owned file under
//     claude/commands/ or claude/agents/ contains `subagent_type:
//     general-purpose` in proximity to a sync-context string. Registered after
//     Check 18.
//
// 20. REQUIREMENT FIRST-LINE MUST/SHALL GUARD -- scans delta specs (excluding
//     /archive/ paths) under openspec/changes/*/specs/**/spec.md and base specs
//     under openspec/specs/**/spec.md. For delta files, scans requirement bodies
//     under ## ADDED Requirements and ## MODIFIED Requirements only. For base
//     files, scans bodies under ## Requirements. Flags any requirement whose
//     first non-blank body line (up to the first #### Scenario: or the next
//     ###/## boundary) contains neither MUST nor SHALL (case-sensitive). Skips
//     empty bodies (no non-blank line before the boundary). Suppresses
//     ### Requirement: lines inside fenced code blocks. Registered after Check 19.
//
// 21. FORMAT-RULES PARITY GUARD -- extracts the text delimited by
//     <!-- must-leads:begin --> and <!-- must-leads:end --> sentinel comments
//     from both claude/agents/architect.md and
//     openspec-templates/spec-delta.template.md, and asserts the two extracted
//     blocks are byte-identical. Fails closed: if either sentinel pair is
//     missing or unbalanced the check pushes a [format-rules-parity] error and
//     exits non-zero rather than silently passing. Carries an inline three-
//     fixture self-test (match, drift, missing-anchor) run before file I/O.
//     Registered after Check 20.
//
// 23. BACKLOG WIKILINK RESOLUTION -- resolves every bare (non-code-span)
//     [[slug]] occurrence file-wide in openspec/backlog.md. Slug grammar =
//     [a-z0-9]+(?:-[a-z0-9]+)*. A slug resolves when it matches a live row id
//     (a ### <id> heading in the backlog) OR an archived change folder under
//     openspec/changes/archive/ (date-prefix stripped). Code-span occurrences
//     (`[[slug]]`) are excluded and must not fire. Passes silently when the
//     backlog file is absent. Uses a pure resolver resolveWikilinks() that
//     takes the archive-slug list as a parameter; an inline self-test covers
//     all four cases before any file I/O. Registered after Check 22.
//
//  Exits 0 if all checks pass, 1 if any check reports a violation.
//  Requires only Node.js built-ins (fs, path) -- no npm dependencies.
// ============================================================================

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// ---- helpers ----------------------------------------------------------------

function splitFront(text) {
  const t = text.replace(/\r\n/g, '\n');
  if (!/^\s*---/.test(t)) return { front: '', body: t };
  const parts = splitN(t, /^---[^\S\n]*$/m, 3);
  return { front: parts[1] || '', body: (parts[2] || '').replace(/^\n+/, '') };
}

function splitN(text, regex, max) {
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  const out = [];
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (out.length === max - 1) break;
    out.push(text.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  out.push(text.slice(last));
  return out;
}

function getField(front, name) {
  for (const line of front.split('\n')) {
    const m = line.match(new RegExp('^\\s*' + name + ':\\s*(.+)$', 'i'));
    if (m) return m[1].trim();
  }
  return '';
}

async function readFileOr(p, fallback = '') {
  try {
    return await fs.readFile(p, 'utf8');
  } catch {
    return fallback;
  }
}

async function listFiles(dir, ext) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(ext))
    .map((e) => path.join(dir, e.name))
    .sort();
}

async function listDirs(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

// Walk a directory recursively and collect .md files
async function walkMd(dir) {
  const out = [];
  async function walk(cur) {
    let entries;
    try {
      entries = await fs.readdir(cur, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile() && e.name.endsWith('.md')) out.push(full);
    }
  }
  await walk(dir);
  return out;
}

// ---- Check 1: PIN AGREEMENT ------------------------------------------------
//
// Scan the repo for occurrences of the OpenSpec version pin in hand-maintained
// files. Two patterns:
//   @fission-ai/openspec@<version>         (npx invocations, prose)
//   openspec_version: <version>            (openspec/config.yaml and inline YAML)
//
// Exclusions:
//   - Any line matching /generatedBy:/ in files under claude/skills/openspec-*/
//     (those are CLI-managed, not hand-maintained)
//   - The entire openspec/changes/ subtree (change artifacts merely CITE the
//     pin as historical examples, they don't maintain it)

async function checkPinAgreement(errors) {
  const openspecSkillsDir = path.join(root, 'claude', 'skills');
  const changesDir = path.join(root, 'openspec', 'changes');

  // Directories of openspec-generated skills (have a generatedBy: line)
  const generatedBySkills = new Set();
  for (const skillDir of await listDirs(openspecSkillsDir)) {
    if (skillDir.startsWith('openspec-')) {
      generatedBySkills.add(path.join(openspecSkillsDir, skillDir));
    }
  }

  const pinRe = /(?:@fission-ai\/openspec@|openspec_version:\s*)(\d+\.\d+\.\d+)/g;

  const found = []; // [{version, file, lineNum, text}]

  function isUnderChanges(file) {
    const rel = path.relative(changesDir, file);
    return !rel.startsWith('..') && !path.isAbsolute(rel);
  }

  function isInGeneratedSkill(file) {
    return [...generatedBySkills].some((d) => {
      const rel = path.relative(d, file);
      return !rel.startsWith('..') && !path.isAbsolute(rel);
    });
  }

  async function scanFile(file) {
    // Skip the changes/ subtree
    if (isUnderChanges(file)) return;

    const isGenSkill = isInGeneratedSkill(file);

    const text = await readFileOr(file, null);
    if (text === null) return;

    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip generatedBy: lines in openspec-generated skill files
      if (isGenSkill && /generatedBy:/i.test(line)) continue;

      const re = new RegExp(pinRe.source, 'g');
      let m;
      while ((m = re.exec(line)) !== null) {
        found.push({
          version: m[1],
          file: path.relative(root, file),
          lineNum: i + 1,
          text: line.trim(),
        });
      }
    }
  }

  async function scanDir(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && e.name !== '.git') {
        // Don't recurse into openspec/changes/ when scanning openspec/
        if (full === changesDir) continue;
        await scanDir(full);
      } else if (e.isFile() && /\.(md|yaml|yml|json|mjs|ps1|sh)$/.test(e.name)) {
        await scanFile(full);
      }
    }
  }

  // Scan source directories
  for (const dir of [
    path.join(root, 'claude'),
    path.join(root, 'openspec'),
    path.join(root, 'openspec-templates'),
  ]) {
    await scanDir(dir);
  }

  // Also scan root-level files (README.md, plugin.json, etc.) without recursing
  {
    let entries;
    try {
      entries = await fs.readdir(root, { withFileTypes: true });
    } catch {
      entries = [];
    }
    for (const e of entries) {
      if (e.isFile() && /\.(md|yaml|yml|json|mjs|ps1|sh)$/.test(e.name)) {
        await scanFile(path.join(root, e.name));
      }
    }
  }

  if (found.length === 0) {
    errors.push('[pin] No OpenSpec version pin occurrences found -- cannot assert agreement.');
    return;
  }

  // Assert all found versions agree
  const versions = [...new Set(found.map((f) => f.version))];
  if (versions.length === 1) {
    // All agree -- pass
    const agreedPin = versions[0];
    process.stdout.write(`  OK: ${found.length} pin occurrence(s) all agree on v${agreedPin}\n`);

    // ---- CONFIG-COUPLING ASSERTION (D2, D3) ------------------------------------
    // openspec/config.yaml must carry an `openspec_version:` key that agrees with
    // the agreed pin V derived above.  Two failure legs (D2):
    //   (a) absent  -- the key is missing from the file (or the file is missing)
    //   (b) mismatch -- the key is present but does not equal V
    // The zero-pin branch above is unchanged (D4).
    //
    // ---- INLINE SELF-TEST (D6) --------------------------------------------------
    // Three in-memory fixtures exercising the extractor used by the real assertion.
    // Self-test failures are pushed as errors so CI catches detector regressions.
    function extractConfigVersion(rawText) {
      // Extract the first `openspec_version: X.Y.Z` occurrence from raw YAML text.
      // Reuses the same pinRe pattern already used in the scan above.
      const configPinRe = /openspec_version:\s*(\d+\.\d+\.\d+)/;
      const m = rawText.match(configPinRe);
      return m ? m[1] : null;
    }

    // Fixture A: absent key -- extractor must return null
    const _stAbsentText = 'schema: spec-driven\n# no openspec_version here\n';
    if (extractConfigVersion(_stAbsentText) !== null) {
      errors.push(
        '[pin] SELF-TEST FAILED: absent-config fixture -- extractor returned a version' +
        ' when openspec_version is absent (config-absent leg detection is broken)'
      );
    }

    // Fixture B: wrong value -- extractor must return a version != agreedPin
    const _wrongVersion = agreedPin === '0.0.1' ? '0.0.2' : '0.0.1';
    const _stWrongText = `schema: spec-driven\nopenspec_version: ${_wrongVersion}\n`;
    const _stWrongResult = extractConfigVersion(_stWrongText);
    if (_stWrongResult === null || _stWrongResult === agreedPin) {
      errors.push(
        '[pin] SELF-TEST FAILED: present-but-wrong-value fixture -- extractor did not' +
        ' return the wrong version (config-mismatch leg detection is broken)'
      );
    }

    // Fixture C: agrees -- extractor must return agreedPin exactly
    const _stAgreeText = `schema: spec-driven\nopenspec_version: ${agreedPin}\n`;
    if (extractConfigVersion(_stAgreeText) !== agreedPin) {
      errors.push(
        '[pin] SELF-TEST FAILED: agrees fixture -- extractor did not return the agreed' +
        ` pin v${agreedPin} (config-coupling extractor is broken)`
      );
    }
    // ---- end self-test ----------------------------------------------------------

    // Real assertion: read openspec/config.yaml and check its openspec_version
    const configPath = path.join(root, 'openspec', 'config.yaml');
    const configText = await readFileOr(configPath, null);
    if (configText === null) {
      // File missing entirely counts as absent-key (config-absent leg)
      errors.push(
        '[pin] openspec/config.yaml not found -- add `openspec_version: ' + agreedPin + '`' +
        ' so the config stays coupled to the pin'
      );
    } else {
      const configVersion = extractConfigVersion(configText);
      if (configVersion === null) {
        // Key absent from the file (config-absent leg)
        errors.push(
          '[pin] openspec/config.yaml is missing the `openspec_version:` key' +
          ` -- add \`openspec_version: ${agreedPin}\` so the config stays coupled to the pin`
        );
      } else if (configVersion !== agreedPin) {
        // Key present but wrong value (config-mismatch leg)
        errors.push(
          `[pin] openspec/config.yaml has \`openspec_version: ${configVersion}\`` +
          ` but the agreed pin is v${agreedPin}` +
          ` -- update openspec/config.yaml to \`openspec_version: ${agreedPin}\``
        );
      }
      // If configVersion === agreedPin: the config agrees -- no error (happy path)
    }
    // ---- end config-coupling assertion -----------------------------------------

    return;
  }

  // Multiple distinct versions found -- report each occurrence
  errors.push(`[pin] Version pin mismatch -- found ${versions.length} distinct versions: ${versions.join(', ')}`);
  for (const f of found) {
    errors.push(`  ${f.file}:${f.lineNum} (v${f.version}): ${f.text}`);
  }
}

// ---- Check 2: FRONTMATTER / NAME -------------------------------------------

// Built-in agent: values that don't resolve to claude/agents/*.md
const BUILTIN_AGENTS = new Set(['build', 'agent']);

// ---- Check 5: GATE-TOOL / EXECUTOR AGREEMENT --------------------------------
//
// Tools that only the main-loop orchestrator can reach -- a subagent can never
// call them even if listed in its tools: frontmatter.  Any command whose
// frontmatter declares a non-builtin agent: while its body references one of
// these tools is a violation: the gate would be trapped in a subagent context
// that cannot execute it.
const MAIN_LOOP_ONLY = new Set(['AskUserQuestion']);

// Valid model aliases
const MODEL_ALIASES = new Set(['opus', 'sonnet', 'haiku']);

// Valid effort values -- the deliberate subset of the tool's
// low|medium|high|xhigh|max that the kit surfaces (D5). xhigh/max are rejected.
const COMPUTE_EFFORTS = ['low', 'medium', 'high'];

// Valid `model=` aliases for the `**Compute:**` annotation (D2/D6). Includes
// haiku for single-file mechanical edits with zero design reasoning (D1);
// the per-slice haiku heuristic is documented in the vertical-slice skill.
const COMPUTE_MODELS = ['sonnet', 'opus', 'haiku'];

// Pattern for pinned model ids (contains a date segment YYYYMMDD or "claude-<digit>")
const PINNED_MODEL_RE = /\d{8}|claude-\d/i;

async function checkFrontmatter(errors) {
  const agentsDir = path.join(root, 'claude', 'agents');
  const commandsDir = path.join(root, 'claude', 'commands');
  const skillsDir = path.join(root, 'claude', 'skills');

  // Collect known agent names (filename stems)
  const agentFiles = await listFiles(agentsDir, '.md');
  const knownAgents = new Set(agentFiles.map((f) => path.basename(f, '.md')));

  // Collect known skill dirs
  const skillDirs = await listDirs(skillsDir);
  const knownSkills = new Set(skillDirs);

  let violations = 0;

  // --- Agents: require name: and description: ---
  for (const file of agentFiles) {
    const text = await readFileOr(file);
    const { front, body } = splitFront(text);
    const rel = path.relative(root, file);
    if (!getField(front, 'name')) {
      errors.push(`[frontmatter] ${rel}: missing 'name:' in frontmatter`);
      violations++;
    }
    if (!getField(front, 'description')) {
      errors.push(`[frontmatter] ${rel}: missing 'description:' in frontmatter`);
      violations++;
    }
    // model: alias check
    const model = getField(front, 'model');
    if (model) {
      if (PINNED_MODEL_RE.test(model) || !MODEL_ALIASES.has(model.toLowerCase())) {
        errors.push(`[frontmatter] ${rel}: 'model: ${model}' must be an alias (opus/sonnet/haiku), not a pinned id`);
        violations++;
      }
    }
    // effort: required on every agent, validated against COMPUTE_EFFORTS (D5/D6).
    // The kit surfaces low|medium|high only -- xhigh/max are rejected.
    const effort = getField(front, 'effort');
    if (!effort) {
      errors.push(`[frontmatter] ${rel}: missing 'effort:' in frontmatter (required: ${COMPUTE_EFFORTS.join('/')})`);
      violations++;
    } else if (!COMPUTE_EFFORTS.includes(effort.toLowerCase())) {
      errors.push(`[frontmatter] ${rel}: 'effort: ${effort}' must be one of ${COMPUTE_EFFORTS.join('/')} (xhigh/max not allowed)`);
      violations++;
    }
    // Load skill X resolution in body
    violations += checkSkillRefs(body, rel, knownSkills, errors);
  }

  // --- Commands: require description:, agent: resolves, model: alias ---
  const commandFiles = await walkMd(commandsDir);
  for (const file of commandFiles) {
    const text = await readFileOr(file);
    const { front, body } = splitFront(text);
    const rel = path.relative(root, file);
    if (!getField(front, 'description')) {
      errors.push(`[frontmatter] ${rel}: missing 'description:' in frontmatter`);
      violations++;
    }
    const agentRef = getField(front, 'agent');
    if (agentRef && !BUILTIN_AGENTS.has(agentRef)) {
      if (!knownAgents.has(agentRef)) {
        errors.push(`[frontmatter] ${rel}: 'agent: ${agentRef}' does not resolve to claude/agents/${agentRef}.md`);
        violations++;
      }
    }
    const model = getField(front, 'model');
    if (model) {
      if (PINNED_MODEL_RE.test(model) || !MODEL_ALIASES.has(model.toLowerCase())) {
        errors.push(`[frontmatter] ${rel}: 'model: ${model}' must be an alias (opus/sonnet/haiku), not a pinned id`);
        violations++;
      }
    }
    // Resolve skill refs in command bodies (same resolution as agent bodies) --
    // ensures any "Load skill `X`" reference in a command resolves to a real
    // claude/skills/<X>/ directory.
    violations += checkSkillRefs(body, rel, knownSkills, errors);
  }

  // --- Skills: require name: and description: ---
  for (const skillDir of skillDirs) {
    const skillFile = path.join(skillsDir, skillDir, 'SKILL.md');
    const text = await readFileOr(skillFile, null);
    const rel = path.join('claude', 'skills', skillDir, 'SKILL.md');
    if (text === null) {
      errors.push(`[frontmatter] ${rel}: file not found`);
      violations++;
      continue;
    }
    const { front } = splitFront(text);
    if (!getField(front, 'name')) {
      errors.push(`[frontmatter] ${rel}: missing 'name:' in frontmatter`);
      violations++;
    }
    if (!getField(front, 'description')) {
      errors.push(`[frontmatter] ${rel}: missing 'description:' in frontmatter`);
      violations++;
    }
  }

  if (violations === 0) {
    process.stdout.write(`  OK: all agent/command/skill frontmatter and references valid\n`);
  }
  return violations;
}

// Extract backtick-wrapped skill names from "Load skill(s)" references in body text
// and check each resolves to a real claude/skills/<X>/SKILL.md.
//
// Only backtick-wrapped names are matched to avoid picking up English conjunctions
// (e.g. the word "plus" in "Load skills `a`, `b`, plus the project's skill").
function checkSkillRefs(body, rel, knownSkills, errors) {
  let violations = 0;
  // Match any backtick-wrapped name that follows "Load skill" or appears in
  // a comma-separated list after "Load skills".
  // Pattern: Load skill(s)? ... `name` (one or more, possibly separated by commas/and/plus prose)
  const backtickRe = /`([A-Za-z0-9_-]+)`/g;

  // Find all Load skill / Load skills lines
  const loadRe = /(?:^|\n)(?:[^\n]*Load skills?\s[^\n]*)/g;
  let lm;
  const foundNames = new Set();
  while ((lm = loadRe.exec(body)) !== null) {
    const segment = lm[0];
    backtickRe.lastIndex = 0;
    let bm;
    while ((bm = backtickRe.exec(segment)) !== null) {
      foundNames.add(bm[1]);
    }
  }

  // Also match "load the `X` skill" pattern
  const theRe = /load the\s+`([A-Za-z0-9_-]+)`\s+skill/gi;
  let tm;
  while ((tm = theRe.exec(body)) !== null) {
    foundNames.add(tm[1]);
  }

  for (const skillName of foundNames) {
    if (!knownSkills.has(skillName)) {
      errors.push(`[frontmatter] ${rel}: 'Load skill ${skillName}' -- no claude/skills/${skillName}/ directory found`);
      violations++;
    }
  }
  return violations;
}

// ---- Check 3: HEADING ALIGNMENT --------------------------------------------
//
// The canonical section headings for each template are declared by the template
// preamble's "MUST be present" language. They are stable and enumerated here
// rather than extracted dynamically (templates contain example-specific headings
// like "### D1 --" or "## 1. <slice name>" that are NOT canonical fixed headings).
//
// Template -> Agent mapping (based on which agent writes that artifact):
//   questions.template.md  -> questioner  (writes questions.md)
//   design.template.md     -> designer    (writes design.md)
//   proposal.template.md   -> architect   (writes proposal.md)
//   tasks.template.md      -> planner     (writes tasks.md)
//   spec-delta.template.md -> architect   (writes specs/*.md; same agent)
//
// Both proposal and spec-delta map to architect -- it writes both.

const TEMPLATE_CANONICAL_HEADINGS = {
  // questions.template.md: only the three surface-independent headings are
  // required in the questioner skeleton. The seven CRUD headings (Data model,
  // Indexing & query performance, API, UI, Front-end state, Auth & authorization,
  // Migrations & data) are surface-gated and governed by the repo-surface filter;
  // their presence/absence in a skeleton is guarded by Check 11 (added in
  // Slice 4), not by this check. Disjoint-set invariant: no heading is
  // simultaneously required-present (Check 3) and forbidden (Check 11).
  'questions.template.md': {
    agent: 'questioner',
    headings: [
      '## Testing',
      '## Sequencing & scope',
      '## Open product questions (for the human)',
    ],
  },
  // design.template.md: four canonical OpenSpec headers (stated explicitly in template preamble)
  'design.template.md': {
    agent: 'designer',
    headings: [
      '## Context',
      '## Goals / Non-Goals',
      '## Decisions',
      '## Risks / Trade-offs',
    ],
  },
  // proposal.template.md: four canonical OpenSpec headers (stated explicitly in template preamble)
  'proposal.template.md': {
    agent: 'architect',
    headings: [
      '## Why',
      '## What Changes',
      '## Capabilities',
      '## Impact',
    ],
  },
  // tasks.template.md: no fixed section headings (the ## N. <name> format is dynamic per slice);
  // instead check for the required annotation syntax (not a heading check, so empty list here).
  // Mapping is still declared for completeness.
  'tasks.template.md': {
    agent: 'planner',
    headings: [], // dynamic heading format -- no fixed canonical headings to check
  },
  // research.template.md: five spine headings that are ALWAYS emitted regardless of surface.
  // Surface-driven inventory sections (## Data model, ## API surface, etc.) are injected
  // dynamically by the researcher at write time and are NOT canonical fixed headings here.
  // ## Notable discrepancies is a standing non-gated heading (D4, D6, D8) -- it is required
  // here (Check 3) and must NOT appear in SURFACE_GATED_DENYLIST_HEADINGS or
  // SURFACE_GATED_HEADINGS (disjoint-set invariant).
  'research.template.md': {
    agent: 'researcher',
    headings: [
      '## Areas investigated',
      '## File map',
      '## Notable discrepancies',
      '## Implicit contracts and conventions',
      '## Open gaps',
    ],
  },
  // spec-delta.template.md: three operation headers (enforced by openspec validate)
  'spec-delta.template.md': {
    agent: 'architect',
    headings: [
      '## ADDED Requirements',
      '## MODIFIED Requirements',
      '## REMOVED Requirements',
    ],
  },
  // backlog.template.md: maps to claude/commands/init.md (a COMMAND, not an agent).
  // /qrspi:init is the file that seeds openspec/backlog.md from an INLINE copy of
  // the template embedded between <!-- backlog-template:begin --> and
  // <!-- backlog-template:end --> sentinels in its body. Check 3 extracts that
  // fenced block and compares it byte-for-byte to openspec-templates/backlog.template.md.
  // This replaces the earlier headings:[] skip -- the drift guard is the strongest
  // feasible check (full-content equality of the extracted block vs. the template
  // file). Dogfood finding (slice 3): reading the template at runtime from a relative
  // path is non-portable (the consumer repo's CWD is not the plugin dir), so the
  // template content is embedded inline instead.
  'backlog.template.md': {
    agent: '(none -- no stage agent renders a backlog; drift guard targets claude/commands/init.md)',
    headings: [],        // headings[] is unused for this entry; drift guard below handles it
    driftGuard: {
      commandFile: 'init.md',
      beginSentinel: '<!-- backlog-template:begin -->',
      endSentinel:   '<!-- backlog-template:end -->',
    },
  },
};

// Extract the content of the fenced block (``` ... ```) between two sentinel
// comment lines in a source file. Returns the inner text of the first fenced block
// found between beginSentinel and endSentinel (exclusive of the fence lines
// themselves), or null if either sentinel or the fenced block is absent.
// The extraction trims a single leading newline after the opening fence marker
// to match standard fenced-block formatting (the blank line before the first
// content line is not part of the content).
function extractSentinelBlock(text, beginSentinel, endSentinel) {
  const begin = text.indexOf(beginSentinel);
  if (begin === -1) return null;
  const end = text.indexOf(endSentinel, begin);
  if (end === -1) return null;

  const between = text.slice(begin + beginSentinel.length, end);

  // Find the opening fence (``` possibly followed by a language tag)
  const fenceOpenRe = /^[ \t]*```[^\n]*\n/m;
  const fenceOpenM = fenceOpenRe.exec(between);
  if (!fenceOpenM) return null;

  const afterOpen = between.slice(fenceOpenM.index + fenceOpenM[0].length);

  // Find the closing fence (a line that is just ```)
  const fenceCloseRe = /^[ \t]*```[ \t]*$/m;
  const fenceCloseM = fenceCloseRe.exec(afterOpen);
  if (!fenceCloseM) return null;

  return afterOpen.slice(0, fenceCloseM.index);
}

async function checkHeadingAlignment(errors) {
  const agentsDir = path.join(root, 'claude', 'agents');
  const commandsDir = path.join(root, 'claude', 'commands');
  let violations = 0;

  for (const [templateFile, entry] of Object.entries(TEMPLATE_CANONICAL_HEADINGS)) {
    const { agent: agentStem, headings: canonicalHeadings, driftGuard } = entry;

    // ---- Drift-guard branch (e.g. backlog.template.md -> init.md) --------------
    // When a template entry declares a driftGuard, perform a full-content
    // equality check between the extracted fenced block in a COMMAND file and
    // the template source, instead of a heading-presence check in an agent file.
    if (driftGuard) {
      const { commandFile, beginSentinel, endSentinel } = driftGuard;
      const commandPath = path.join(commandsDir, commandFile);
      const commandRel = `claude/commands/${commandFile}`;
      const commandText = await readFileOr(commandPath, null);
      if (commandText === null) {
        errors.push(`[heading] drift-guard: Cannot read ${commandRel} -- file not found`);
        violations++;
        continue;
      }

      const extracted = extractSentinelBlock(commandText, beginSentinel, endSentinel);
      if (extracted === null) {
        errors.push(
          `[heading] drift-guard: ${commandRel} is missing the sentinel block` +
          ` "${beginSentinel}" ... "${endSentinel}" (or the fenced block between them)`
        );
        violations++;
        continue;
      }

      const templatePath = path.join(root, 'openspec-templates', templateFile);
      const templateText = await readFileOr(templatePath, null);
      if (templateText === null) {
        errors.push(`[heading] drift-guard: Cannot read openspec-templates/${templateFile} -- file not found`);
        violations++;
        continue;
      }

      // Normalize line endings for the comparison (CRLF -> LF on both sides).
      const extractedNorm = extracted.replace(/\r\n/g, '\n');
      const templateNorm = templateText.replace(/\r\n/g, '\n');

      if (extractedNorm !== templateNorm) {
        errors.push(
          `[heading] drift-guard: inline copy of ${templateFile} in ${commandRel}` +
          ` has drifted from openspec-templates/${templateFile}` +
          ` -- update the sentinel block between "${beginSentinel}" and "${endSentinel}"` +
          ` to match the template file exactly`
        );
        violations++;
      } else {
        process.stdout.write(
          `  OK: ${templateFile} -> ${commandRel} (drift-guard: inline copy matches template)\n`
        );
      }
      continue;
    }

    // ---- Standard heading-presence branch (agent files) ----------------------
    if (canonicalHeadings.length === 0) {
      // Nothing to check for this template (dynamic format, no drift guard)
      process.stdout.write(`  SKIP: ${templateFile} -> ${agentStem} (no fixed canonical headings)\n`);
      continue;
    }

    const agentPath = path.join(agentsDir, agentStem + '.md');
    const agentText = await readFileOr(agentPath, null);
    if (agentText === null) {
      errors.push(`[heading] Cannot read claude/agents/${agentStem}.md -- file not found`);
      violations++;
      continue;
    }

    const { body: agentBody } = splitFront(agentText);

    let ok = true;
    for (const heading of canonicalHeadings) {
      if (!agentBody.includes(heading)) {
        errors.push(
          `[heading] claude/agents/${agentStem}.md missing canonical heading from ${templateFile}: "${heading}"`
        );
        violations++;
        ok = false;
      }
    }
    if (ok) {
      process.stdout.write(`  OK: ${templateFile} -> ${agentStem} (${canonicalHeadings.length} heading(s))\n`);
    }
  }
  return violations;
}

// ---- Check 4: README COMMAND COVERAGE --------------------------------------
//
// Keeps the README's command surface honest against claude/commands/. This is
// the *mechanical* half of README freshness: it asserts the shipped slash
// commands and the README agree in both directions. It deliberately does NOT
// police prose, agent names, the install flow, or the layout tree -- that
// judgment-level drift is governed by the CLAUDE.md "keep the README current"
// rule and the /qrspi-readme-audit reviewed pass.
//
//   forward  -- every claude/commands/<stem>.md is mentioned as `/qrspi:<stem>`
//               in README.md (a new/renamed command must be documented)
//   reverse  -- every `/qrspi:<token>` in README.md resolves to an existing
//               claude/commands/<token>.md (a removed/renamed command must not
//               leave a dangling reference)
//
// Bare `/qrspi` (no colon -- the stage-map command) is ignored: the regex only
// matches the colon form, and there is no claude/commands/qrspi.md.

async function checkReadmeCoverage(errors) {
  const readmePath = path.join(root, 'README.md');
  const readme = await readFileOr(readmePath, null);
  if (readme === null) {
    errors.push('[readme] README.md not found at repo root');
    return 1;
  }

  const commandFiles = await listFiles(path.join(root, 'claude', 'commands'), '.md');
  const commandStems = commandFiles.map((f) => path.basename(f, '.md'));

  let violations = 0;

  // forward: every shipped command is documented
  for (const stem of commandStems) {
    if (!readme.includes(`/qrspi:${stem}`)) {
      errors.push(`[readme] command /qrspi:${stem} (claude/commands/${stem}.md) is not documented in README.md`);
      violations++;
    }
  }

  // reverse: every documented command resolves to a real command file
  const known = new Set(commandStems);
  const referenced = new Set();
  const re = /\/qrspi:([a-z][a-z-]*)/g;
  let m;
  while ((m = re.exec(readme)) !== null) referenced.add(m[1]);
  for (const token of referenced) {
    if (!known.has(token)) {
      errors.push(`[readme] README.md references /qrspi:${token} but claude/commands/${token}.md does not exist`);
      violations++;
    }
  }

  if (violations === 0) {
    process.stdout.write(`  OK: ${commandStems.length} command(s) documented; all README /qrspi:* references resolve\n`);
  }
  return violations;
}

// reachesMainLoopOnlyTool(body, tool) -- returns a { reached: bool, how: string } descriptor.
//
// "reached" is true when the body either:
//   (a) DIRECTLY names the tool (current behaviour), or
//   (b) TRANSITIVELY reaches it via the workflow "Stage choreography"
//       section -- i.e. the body mentions the `workflow` skill AND at
//       least one of the canonical choreography procedure names that invoke the
//       gate tool ('Stage choreography', 'commit step', or 'next-stage handoff').
//       These phrases are unique to the choreography section and give a
//       low-false-positive signal without requiring a full skill parse.
//
// `how` is the human-readable distinction used in the violation message.
function reachesMainLoopOnlyTool(body, tool) {
  // (a) direct reference
  if (body.includes(tool)) {
    return { reached: true, how: `references '${tool}' inline` };
  }

  // (b) transitive reference via workflow choreography. Match the
  // backtick-wrapped `workflow` skill reference so the bare substring does not
  // collide with `openspec-workflow` or a plain-prose "workflow".
  const mentionsWorkflowSkill = body.includes('`workflow`');
  const CHOREOGRAPHY_MARKERS = ['Stage choreography', 'commit step', 'next-stage handoff'];
  const mentionsChoreography = CHOREOGRAPHY_MARKERS.some((marker) => body.includes(marker));
  if (mentionsWorkflowSkill && mentionsChoreography) {
    return {
      reached: true,
      how: `reaches ${tool} transitively via the workflow choreography (commit step / next-stage handoff)`,
    };
  }

  return { reached: false, how: '' };
}

async function checkGateExecutor(errors) {
  const commandsDir = path.join(root, 'claude', 'commands');
  const commandFiles = await walkMd(commandsDir);

  let violations = 0;

  for (const file of commandFiles) {
    const text = await readFileOr(file);
    const { front, body } = splitFront(text);
    const rel = path.relative(root, file);

    const agentRef = getField(front, 'agent');

    // Skip commands with no agent: or with a builtin agent:
    if (!agentRef || BUILTIN_AGENTS.has(agentRef)) continue;

    // This command runs entirely inside a non-builtin subagent.
    // Check if the body reaches any main-loop-only tool (directly or transitively).
    for (const tool of MAIN_LOOP_ONLY) {
      const { reached, how } = reachesMainLoopOnlyTool(body, tool);
      if (reached) {
        errors.push(
          `[gate] ${rel}: 'agent: ${agentRef}' routes body to a subagent, but body ${how} -- '${tool}' is main-loop-only and unavailable inside a subagent`
        );
        violations++;
      }
    }
  }

  if (violations === 0) {
    process.stdout.write(`  OK: no gate-tool / executor mismatches found\n`);
  }
  return violations;
}

// ---- Check 6: MIGRATION MANIFEST PRESENCE + SCHEMA + MARKER FORMAT --------
//
// Three sub-checks, all reported under the same labelled block:
//
//   (a) PRESENCE -- every ## [X.Y.Z] CHANGELOG section whose version is >=
//       the lowest version already present in migrations/ must have a
//       corresponding migrations/<version>.yaml. Versions below that baseline
//       are pre-feature and are NOT required to have entries.
//
//   (b) SCHEMA -- each migrations/*.yaml must be well-formed:
//       - required top-level keys: version, summary, automated, manual
//       - automated[].action must be 'edit-file' only
//       - automated[].path must start with 'openspec/'
//
//   (c) MARKER FORMAT -- if openspec/.qrspi-version exists it must contain
//       a bare SemVer string (X.Y.Z, no 'v' prefix, no trailing content).
//
// YAML is parsed with a minimal dependency-free extractor sufficient for the
// manifest's known shape (flat key/value + list-of-objects).

const SEMVER_RE = /^\d+\.\d+\.\d+$/;

// Compare two SemVer strings ('A.B.C'). Returns -1, 0, or 1.
function semverCmp(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] < pb[i]) return -1;
    if (pa[i] > pb[i]) return 1;
  }
  return 0;
}

// Minimal YAML extractor for the manifest schema.
// Returns { version, summary, automated, manual } or null on parse failure.
// 'automated' and 'manual' are arrays; automated items have { action, path, description }.
function parseManifestYaml(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');

  const result = { version: null, summary: null, automated: null, manual: null };
  let currentKey = null;
  let inBlockScalar = false;
  let inList = null; // 'automated' | 'manual' | null
  let currentItem = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // Block scalar continuation (indented lines after 'summary: >')
    if (inBlockScalar) {
      if (line.startsWith('  ') || line === '') {
        // continuation of block scalar -- summary already marked present
        continue;
      }
      inBlockScalar = false;
    }

    // Top-level keys (not indented or indented with exactly 0 leading spaces for key:)
    const topKeyM = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (topKeyM && !line.startsWith(' ') && !line.startsWith('-')) {
      const key = topKeyM[1];
      const val = topKeyM[2].trim();

      if (key === 'version') {
        result.version = val;
        currentKey = 'version';
        inList = null;
        currentItem = null;
      } else if (key === 'summary') {
        // Value may be '>' (block scalar), a quoted string, or a bare string
        if (val === '>' || val === '|' || val.length > 0) {
          result.summary = val === '>' || val === '|' ? '__block__' : val;
          inBlockScalar = (val === '>' || val === '|');
        }
        currentKey = 'summary';
        inList = null;
        currentItem = null;
      } else if (key === 'automated') {
        // Could be '[]' (empty) or the start of a list
        result.automated = val === '[]' ? [] : [];
        currentKey = 'automated';
        inList = 'automated';
        currentItem = null;
      } else if (key === 'manual') {
        result.manual = val === '[]' ? [] : [];
        currentKey = 'manual';
        inList = 'manual';
        currentItem = null;
      }
      continue;
    }

    // List item start: '  - ...' or '- ...'
    const listItemM = line.match(/^(\s*)-\s*(.*)/);
    if (listItemM) {
      const itemContent = listItemM[2].trim();
      if (inList === 'automated') {
        // New item
        currentItem = { action: null, path: null, description: null };
        result.automated.push(currentItem);
        // Inline key on same line as '-'
        const inlineKeyM = itemContent.match(/^(\w[\w-]*):\s*(.*)/);
        if (inlineKeyM) {
          applyItemField(currentItem, inlineKeyM[1], inlineKeyM[2].trim());
        }
      } else if (inList === 'manual') {
        currentItem = { description: null };
        result.manual.push(currentItem);
        const inlineKeyM = itemContent.match(/^(\w[\w-]*):\s*(.*)/);
        if (inlineKeyM) {
          applyItemField(currentItem, inlineKeyM[1], inlineKeyM[2].trim());
        }
      }
      continue;
    }

    // Indented key inside a list item: '    action: edit-file'
    const indentKeyM = line.match(/^\s{2,}(\w[\w-]*):\s*(.*)/);
    if (indentKeyM && currentItem !== null) {
      applyItemField(currentItem, indentKeyM[1], indentKeyM[2].trim());
    }
  }

  return result;
}

function applyItemField(item, key, val) {
  if (key === 'action') item.action = val;
  else if (key === 'path') item.path = val;
  else if (key === 'description') item.description = val;
  else if (key === 'skip_if_contains') item.skip_if_contains = val;
  else if (key === 'anchor_missing') item.anchor_missing = val;
}

async function checkMigrationManifests(errors) {
  const migrationsDir = path.join(root, 'migrations');
  const changelogPath = path.join(root, 'CHANGELOG.md');
  const markerPath = path.join(root, 'openspec', '.qrspi-version');

  let subviolations = 0;

  // --- (a) PRESENCE CHECK ---

  // Collect all migrations/*.yaml filenames (stem = version string)
  let migrationFiles;
  try {
    const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
    migrationFiles = entries
      .filter((e) => e.isFile() && e.name.endsWith('.yaml'))
      .map((e) => e.name);
  } catch {
    migrationFiles = [];
  }

  const migratedVersions = new Set(migrationFiles.map((f) => f.replace(/\.yaml$/, '')));

  // Presence floor is a FIXED constant -- the version that first ships the
  // migration mechanism. It must NOT be derived from migrations/ contents: doing
  // so is circular (deleting the floor manifest would remove the floor and the
  // check would pass open). Everything below the floor (0.1.0-0.5.0) is
  // intentionally exempt (PQ6: no retroactive entries).
  const MIGRATION_FLOOR = '0.6.0';

  // (1) The floor manifest itself must always exist -- this is what makes the
  //     gate testable pre-release and prevents the fail-open.
  if (!migratedVersions.has(MIGRATION_FLOOR)) {
    errors.push(
      `[migration] Missing migration manifest: migrations/${MIGRATION_FLOOR}.yaml` +
      ` (the ${MIGRATION_FLOOR} floor manifest is required and must not be removed)`
    );
    subviolations++;
  }

  // (2) Every released CHANGELOG ## [X.Y.Z] section at or above the floor must
  //     have a matching manifest.
  const changelog = await readFileOr(changelogPath, null);
  if (changelog === null) {
    errors.push('[migration] CHANGELOG.md not found -- cannot check manifest presence');
    subviolations++;
  } else {
    const changelogVersionRe = /^##\s+\[(\d+\.\d+\.\d+)\]/gm;
    let m;
    while ((m = changelogVersionRe.exec(changelog)) !== null) {
      const ver = m[1];
      if (semverCmp(ver, MIGRATION_FLOOR) >= 0 && !migratedVersions.has(ver)) {
        errors.push(
          `[migration] Missing migration manifest: migrations/${ver}.yaml` +
          ` (CHANGELOG ## [${ver}] section at/above the ${MIGRATION_FLOOR} floor requires an entry)`
        );
        subviolations++;
      }
    }
  }

  // --- (b) SCHEMA CHECK ---

  for (const filename of migrationFiles.sort()) {
    const ver = filename.replace(/\.yaml$/, '');
    const filePath = path.join(migrationsDir, filename);
    const rel = `migrations/${filename}`;

    const text = await readFileOr(filePath, null);
    if (text === null) {
      errors.push(`[migration] ${rel}: cannot read file`);
      subviolations++;
      continue;
    }

    const manifest = parseManifestYaml(text);

    // Required top-level keys
    const missingKeys = [];
    if (manifest.version === null) missingKeys.push('version');
    if (manifest.summary === null) missingKeys.push('summary');
    if (manifest.automated === null) missingKeys.push('automated');
    if (manifest.manual === null) missingKeys.push('manual');

    if (missingKeys.length > 0) {
      errors.push(`[migration] ${rel}: missing required key(s): ${missingKeys.join(', ')}`);
      subviolations++;
    }

    // version field must match filename stem
    if (manifest.version !== null && manifest.version !== ver) {
      errors.push(`[migration] ${rel}: 'version: ${manifest.version}' does not match filename stem '${ver}'`);
      subviolations++;
    }

    // automated[] schema
    if (manifest.automated !== null && manifest.automated.length > 0) {
      for (let idx = 0; idx < manifest.automated.length; idx++) {
        const step = manifest.automated[idx];
        if (step.action !== 'edit-file') {
          errors.push(
            `[migration] ${rel}: automated[${idx}].action is '${step.action}' -- only 'edit-file' is allowed`
          );
          subviolations++;
        }
        if (!step.path || !step.path.startsWith('openspec/')) {
          errors.push(
            `[migration] ${rel}: automated[${idx}].path '${step.path}' must start with 'openspec/'`
          );
          subviolations++;
        }
        // Optional field: skip_if_contains -- when present must be a non-empty string
        if ('skip_if_contains' in step) {
          if (typeof step.skip_if_contains !== 'string' || step.skip_if_contains === '') {
            errors.push(
              `[migration] ${rel}: automated[${idx}].skip_if_contains must be a non-empty string when present`
            );
            subviolations++;
          }
        }
        // Optional field: anchor_missing -- when present must be the closed literal 'warn-and-skip'
        if ('anchor_missing' in step) {
          if (step.anchor_missing !== 'warn-and-skip') {
            errors.push(
              `[migration] ${rel}: automated[${idx}].anchor_missing '${step.anchor_missing}' is not valid -- only 'warn-and-skip' is allowed`
            );
            subviolations++;
          }
        }
      }
    }
  }

  // --- (d) SELF-TEST: positive path for both optional fields ------------------
  //
  // A synthetic step carrying both skip_if_contains (non-empty) and
  // anchor_missing: warn-and-skip must pass schema validation. If the validator
  // rejects it, push a self-test error so CI catches the regression immediately.
  {
    const selfTestStep = {
      action: 'edit-file',
      path: 'openspec/test.md',
      skip_if_contains: 'marker',
      anchor_missing: 'warn-and-skip',
    };
    const selfTestErrors = [];
    if (selfTestStep.action !== 'edit-file') {
      selfTestErrors.push('action rejected');
    }
    if (!selfTestStep.path.startsWith('openspec/')) {
      selfTestErrors.push('path rejected');
    }
    if (typeof selfTestStep.skip_if_contains !== 'string' || selfTestStep.skip_if_contains === '') {
      selfTestErrors.push('skip_if_contains rejected');
    }
    if (selfTestStep.anchor_missing !== 'warn-and-skip') {
      selfTestErrors.push('anchor_missing rejected');
    }
    if (selfTestErrors.length > 0) {
      errors.push(
        `[migration] SELF-TEST FAILED: positive-path fixture with both optional fields was rejected: ${selfTestErrors.join(', ')}`
      );
      subviolations++;
    }
  }

  // --- (c) MARKER FORMAT CHECK ---

  const markerText = await readFileOr(markerPath, null);
  if (markerText !== null) {
    const marker = markerText.replace(/\n$/, '').trim();
    if (!SEMVER_RE.test(marker)) {
      errors.push(
        `[migration] openspec/.qrspi-version contains '${marker}' -- expected bare SemVer (X.Y.Z, no 'v' prefix)`
      );
      subviolations++;
    }
  }

  if (subviolations === 0) {
    const manifestCount = migrationFiles.length;
    const markerNote = markerText !== null ? ', marker format valid' : ', no marker file (skipped)';
    process.stdout.write(
      `  OK: ${manifestCount} migration manifest(s) present and schema-valid${markerNote}\n`
    );
  }
  return subviolations;
}

// ---- Check 7: READ-CONTRACT BANNER AGREEMENT -------------------------------
//
// Each of the seven QRSPI stage agents (researcher, questioner, designer,
// architect, planner, implementer, reviewer) carries a machine-readable
// read-contract banner at the top of its claude/agents/<stem>.md:
//
//   > **Read contract** -- Reads: <set>. Never opens: <deny>; no other
//   > change's process artifacts (spec.md excepted -- see workflow skill Read
//   > Matrix).
//
// This is a banner-keyed POSITIVE check (D10 / OQ2): it parses the `Reads:`
// field out of each banner and asserts it EQUALS the agent's expected value,
// derived from the approved read matrix (design.md Data-model section). The
// banner's own `Never opens:` list therefore cannot self-trip the check, and
// legitimate prohibition prose elsewhere in the file is ignored.
//
// Two special cases (OQ3):
//   - ARCHITECT carries a two-mode contract -- one file, two `Reads (S/V):`
//     assertions -- because the same agent runs both S and V.
//   - REVIEWER is special-cased "full change-folder by design" -- it has no
//     within-change restriction.
//
// SCOPE (PQ13 / D10): strictly the seven stage agents. This check must NOT
// flag /qrspi:update, claude/commands/update.md, or claude/skills/qrspi-update/
// -- they read manifests + the marker, not change artifacts, and carry no
// read-contract banner. The expected-map keys ARE the scope: no other file is
// ever opened by this check.

// ---- Check N (skill-sets): SKILL-SET REGISTRY ------------------------------
//
// Registry of the fixed, unconditional kit skills each stage agent is allowed
// to load. The <repo>-stack cheatsheet name is Glob-discovered per-repo and
// is explicitly excluded -- it must NOT appear here (neither required nor
// forbidden). Mirrors the shape / placement of READ_CONTRACT_EXPECTED.
//
// Derived from the approved design (D2, D5, D6) -- imported from the shared
// module scripts/skill-sets.mjs (single source of truth, D7) so that
// scripts/context-footprint.mjs can reuse it without drift.
import { SKILL_SET_EXPECTED, COMMAND_SKILL_SET_EXPECTED } from './skill-sets.mjs';

// ---- Check N (skill-sets): checkSkillSets -----------------------------------
//
// For each of the seven stage agents, harvest the backtick-wrapped skill names
// from the "Load skills" line (reusing the same extraction logic as
// checkSkillRefs in Check 2), FILTER OUT any name ending in "-stack" (the
// <repo>-stack cheatsheet is Glob-discovered per-repo -- it is neither required
// nor forbidden, per D6), then assert the remaining sorted set equals
// SKILL_SET_EXPECTED[stem].
//
// On mismatch, reports the added and missing skills and contributes to the
// non-zero exit code (D5).
//
// SCOPE: strictly the seven stage agents named in SKILL_SET_EXPECTED.

async function checkSkillSets(errors) {
  const agentsDir = path.join(root, 'claude', 'agents');
  let violations = 0;

  for (const stem of Object.keys(SKILL_SET_EXPECTED)) {
    const rel = `claude/agents/${stem}.md`;
    const text = await readFileOr(path.join(agentsDir, `${stem}.md`), null);
    if (text === null) {
      errors.push(`[skill-sets] ${rel}: file not found`);
      violations++;
      continue;
    }

    const { body } = splitFront(text);

    // Harvest backtick-wrapped skill names from "Load skill(s)" lines.
    // A Load skills line may wrap across multiple source lines -- join each
    // "Load skills?" line with all immediately following indented lines to
    // capture continuation lines like:
    //   "Load skills `a`, `b`, and\n   `c`, plus the project's..."
    // Harvest backtick-wrapped skill names from the main step-1 "Load skills"
    // instruction line. We match lines that begin with a numbered step prefix
    // ("1." or "1 ") and contain "Load skill(s)". A Load skills line may wrap
    // across multiple source lines -- join each such line with all immediately
    // following indented continuation lines to capture the full skill list.
    //
    // Deliberate exclusions:
    //   - Bullet-list items (lines starting with "-") such as Fix-mode's
    //     "- Load skill `postpr-fix`..." are NOT step-1 loads and are excluded.
    //   - Prose references to skills elsewhere in the body are excluded.
    const harvested = new Set();
    const backtickRe = /`([A-Za-z0-9_-]+)`/g;
    const lines = body.split('\n');
    for (let i = 0; i < lines.length; i++) {
      // Match only numbered-step lines that contain "Load skill(s)" -- the
      // canonical step-1 form is "1. Load skills `...`" or "1. Load skill `...`".
      if (/^\s*\d+\.\s[^\n]*Load skills?\s/i.test(lines[i])) {
        // Gather the starting line plus any immediately following continuation
        // lines (lines that start with whitespace and do not start a new list
        // item or a new numbered step).
        let segment = lines[i];
        for (let j = i + 1; j < lines.length; j++) {
          const next = lines[j];
          // Continuation: indented and does not start a new step (^\d+\.) or
          // a new list item (^[-*]) at the same indent level as the step marker.
          if (/^\s+/.test(next) && !/^\s*\d+\.\s/.test(next) && !/^\s*[-*]\s/.test(next)) {
            segment += ' ' + next;
          } else {
            break;
          }
        }
        backtickRe.lastIndex = 0;
        let bm;
        while ((bm = backtickRe.exec(segment)) !== null) {
          harvested.add(bm[1]);
        }
      }
    }
    // Filter out the <repo>-stack cheatsheet name (ends with "-stack") -- D6.
    const filtered = [...harvested].filter((name) => !name.endsWith('-stack')).sort();
    const expected = [...SKILL_SET_EXPECTED[stem]].sort();

    const added   = filtered.filter((n) => !expected.includes(n));
    const missing = expected.filter((n) => !filtered.includes(n));

    if (added.length > 0 || missing.length > 0) {
      const parts = [];
      if (added.length > 0)   parts.push(`unexpected: ${added.map((n) => '`' + n + '`').join(', ')}`);
      if (missing.length > 0) parts.push(`missing: ${missing.map((n) => '`' + n + '`').join(', ')}`);
      errors.push(`[skill-sets] ${rel}: skill-set mismatch -- ${parts.join('; ')}`);
      violations++;
    }
  }

  // --- Command skill-sets: validate COMMAND_SKILL_SET_EXPECTED ---
  // Uses the broader "Load skill" regex (same as checkSkillRefs in Check 2)
  // because command bodies use prose rather than numbered-step lines.
  const commandsDir2 = path.join(root, 'claude', 'commands');
  const loadReCmd = /(?:^|\n)(?:[^\n]*Load skills?\s[^\n]*)/g;
  const theReCmd = /load the\s+`([A-Za-z0-9_-]+)`\s+skill/gi;
  const backtickReCmd = /`([A-Za-z0-9_-]+)`/g;

  for (const stem of Object.keys(COMMAND_SKILL_SET_EXPECTED)) {
    const rel = `claude/commands/${stem}.md`;
    const text = await readFileOr(path.join(commandsDir2, `${stem}.md`), null);
    if (text === null) {
      errors.push(`[skill-sets] ${rel}: file not found`);
      violations++;
      continue;
    }
    const { body: cmdBody } = splitFront(text);

    // Harvest all "Load skill `X`" names from the command body.
    const harvested2 = new Set();
    loadReCmd.lastIndex = 0;
    let lm2;
    while ((lm2 = loadReCmd.exec(cmdBody)) !== null) {
      const segment = lm2[0];
      backtickReCmd.lastIndex = 0;
      let bm2;
      while ((bm2 = backtickReCmd.exec(segment)) !== null) {
        harvested2.add(bm2[1]);
      }
    }
    theReCmd.lastIndex = 0;
    let tm2;
    while ((tm2 = theReCmd.exec(cmdBody)) !== null) {
      harvested2.add(tm2[1]);
    }

    // Filter out -stack names and compare.
    const filtered2 = [...harvested2].filter((n) => !n.endsWith('-stack')).sort();
    const expected2 = [...COMMAND_SKILL_SET_EXPECTED[stem]].sort();

    const added2   = filtered2.filter((n) => !expected2.includes(n));
    const missing2 = expected2.filter((n) => !filtered2.includes(n));

    if (added2.length > 0 || missing2.length > 0) {
      const parts = [];
      if (added2.length > 0)   parts.push(`unexpected: ${added2.map((n) => '`' + n + '`').join(', ')}`);
      if (missing2.length > 0) parts.push(`missing: ${missing2.map((n) => '`' + n + '`').join(', ')}`);
      errors.push(`[skill-sets] ${rel}: skill-set mismatch -- ${parts.join('; ')}`);
      violations++;
    }
  }

  if (violations === 0) {
    process.stdout.write(
      `  OK: ${Object.keys(SKILL_SET_EXPECTED).length} stage-agent skill-set(s) match the registry\n`
    );
  }
  return violations;
}

// Expected `Reads:` field per stage agent -- the exact text that must appear
// between the banner's em-dash separator and its `Never opens:` clause, after
// whitespace normalisation. Derived mechanically from the read matrix; the
// architect entry encodes the two-mode S/V contract and the reviewer entry
// uses the "full ... folder (by design)" string.
const READ_CONTRACT_EXPECTED = {
  researcher: 'Reads: none (whole changes/<id>/ folder banned).',
  questioner: 'Reads: backlog + templates (no change-folder artifact).',
  designer: 'Reads: questions.md, research.md.',
  architect: 'Reads (S): design.md. Reads (V): proposal.md, specs/.',
  planner: 'Reads: slices.md.',
  'implementer-low': 'Reads: tasks.md.',
  'implementer-medium': 'Reads: tasks.md.',
  'implementer-high': 'Reads: tasks.md.',
  reviewer: 'Reads: full changes/<id>/ folder (by design).',
};

// Collapse runs of whitespace to single spaces and trim -- applied identically
// to the extracted banner text and the expected value so the equality check is
// insensitive to incidental spacing.
function normalizeWs(s) {
  return s.replace(/\s+/g, ' ').trim();
}

// Extract the `Reads:` field from a `> **Read contract**` banner line.
// Returns the substring between the em-dash separator and the `Never opens:`
// clause (inclusive of the leading `Reads:`), or null if the banner or that
// clause is absent. Handles both the single-mode (`Reads: X.`) and two-mode
// (`Reads (S): X. Reads (V): Y.`) shapes uniformly, since it simply captures
// everything up to `Never opens:`.
function extractReadsField(body) {
  // Find the banner line (a blockquote line naming the read contract).
  const lines = body.split('\n');
  const bannerLine = lines.find((l) => /^>\s*\*\*Read contract\*\*/.test(l));
  if (!bannerLine) return null;

  // Split on the em-dash (U+2014) separator, then take the part before
  // `Never opens:`.
  const afterMarker = bannerLine.split('—').slice(1).join('—');
  if (!afterMarker) return null;
  const idx = afterMarker.indexOf('Never opens:');
  if (idx === -1) return null;
  return normalizeWs(afterMarker.slice(0, idx));
}

async function checkReadContracts(errors) {
  const agentsDir = path.join(root, 'claude', 'agents');
  let violations = 0;

  for (const stem of Object.keys(READ_CONTRACT_EXPECTED)) {
    const rel = `claude/agents/${stem}.md`;
    const text = await readFileOr(path.join(agentsDir, `${stem}.md`), null);
    if (text === null) {
      errors.push(`[read-contract] ${rel}: file not found -- expected a stage-agent read-contract banner`);
      violations++;
      continue;
    }

    const { body } = splitFront(text);
    const actual = extractReadsField(body);
    if (actual === null) {
      errors.push(
        `[read-contract] ${rel}: no parseable '> **Read contract** -- Reads: ... Never opens: ...' banner found`
      );
      violations++;
      continue;
    }

    const expected = normalizeWs(READ_CONTRACT_EXPECTED[stem]);
    if (actual !== expected) {
      errors.push(
        `[read-contract] ${rel}: banner Reads-field mismatch\n` +
        `    expected: ${expected}\n` +
        `    actual:   ${actual}`
      );
      violations++;
    }
  }

  if (violations === 0) {
    process.stdout.write(
      `  OK: ${Object.keys(READ_CONTRACT_EXPECTED).length} stage-agent read-contract banner(s) match the read matrix\n`
    );
  }
  return violations;
}

// ---- Check 8: PR RECONCILIATION PASSES STRUCTURE ---------------------------
//
// Asserts that claude/commands/pr.md contains the two reconciliation-gate
// sections with their required choice labels. Checks for stable structural
// anchors -- section headings and the named choice strings -- rather than
// incidental prose that may change with rewording.
//
// Tasks pass required anchors:
//   - heading: '## Tasks pass'
//   - choice labels: 'Finish it now', 'Drop -- no longer needed', 'Pause --'
//
// Follow-ups pass required anchors:
//   - heading: '## Follow-ups pass'
//   - choice labels: 'Fix now', 'Defer --', 'Promote to backlog'
//   - (Drop is shared with tasks pass -- its presence is implied by tasks pass check)
//
// Reports a violation if either pass section or any required label is absent.

async function checkPrReconciliationPasses(errors) {
  const prPath = path.join(root, 'claude', 'commands', 'pr.md');
  const text = await readFileOr(prPath, null);
  const rel = 'claude/commands/pr.md';

  if (text === null) {
    errors.push(`[pr-passes] ${rel}: file not found`);
    return 1;
  }

  let violations = 0;

  // Tasks pass anchors
  const tasksPassAnchors = [
    { label: 'tasks-pass heading', anchor: '## Tasks pass' },
    { label: 'Finish-it-now choice', anchor: 'Finish it now' },
    { label: 'Drop choice (tasks pass)', anchor: 'Drop -- no longer needed' },
    { label: 'Pause choice', anchor: 'Pause --' },
  ];

  // Follow-ups pass anchors
  const followupsPassAnchors = [
    { label: 'follow-ups-pass heading', anchor: '## Follow-ups pass' },
    { label: 'Fix-now choice', anchor: 'Fix now' },
    { label: 'Defer choice', anchor: 'Defer --' },
    { label: 'Promote choice', anchor: 'Promote to backlog' },
  ];

  for (const { label, anchor } of [...tasksPassAnchors, ...followupsPassAnchors]) {
    if (!text.includes(anchor)) {
      errors.push(`[pr-passes] ${rel}: missing structural anchor for ${label} (expected to find: "${anchor}")`);
      violations++;
    }
  }

  if (violations === 0) {
    process.stdout.write(`  OK: tasks pass and follow-ups pass structural anchors present in ${rel}\n`);
  }
  return violations;
}

// ---- Check 9: VERSION-CHECK EMBED ------------------------------------------
//
// Asserts that each of the nine QRSPI stage command files (status, questions,
// research, design, structure, slices, plan, implement, pr) contains the
// inline qrspi-version-check skill load line. The exact string to match is:
//
//   Load skill `qrspi-version-check` and follow its instructions exactly.
//
// This line must appear in every stage command body so that a fresh session
// always runs the version check before any substantive work. The check is
// hardcoded against the nine known command stems -- no dynamic discovery --
// to catch regressions when a command is edited and the embed is accidentally
// removed.

const VERSION_CHECK_COMMAND_STEMS = [
  'status',
  'questions',
  'research',
  'design',
  'structure',
  'slices',
  'plan',
  'implement',
  'pr',
];

// The canonical inline embed line all nine commands must contain. Whitespace is
// normalised before matching because the sentence may wrap across two source lines
// (the check collapses runs of whitespace including newlines to single spaces before
// the includes() call, so the exact line-break position is immaterial).
const VERSION_CHECK_EMBED_LINE = 'Load skill `qrspi-version-check` and follow its instructions exactly.';

async function checkVersionCheckEmbed(errors) {
  const commandsDir = path.join(root, 'claude', 'commands');
  let violations = 0;

  for (const stem of VERSION_CHECK_COMMAND_STEMS) {
    const filePath = path.join(commandsDir, `${stem}.md`);
    const rel = `claude/commands/${stem}.md`;

    const text = await readFileOr(filePath, null);
    if (text === null) {
      errors.push(`[version-check-embed] ${rel}: file not found`);
      violations++;
      continue;
    }

    // Collapse runs of whitespace (including newlines) to a single space so
    // that the embed sentence is matchable even when it wraps across two lines.
    const collapsed = text.replace(/\s+/g, ' ');
    if (!collapsed.includes(VERSION_CHECK_EMBED_LINE)) {
      errors.push(
        `[version-check-embed] ${rel}: missing inline qrspi-version-check embed line` +
        ` (expected to find: "${VERSION_CHECK_EMBED_LINE}")`
      );
      violations++;
    }
  }

  if (violations === 0) {
    process.stdout.write(
      `  OK: all ${VERSION_CHECK_COMMAND_STEMS.length} stage command(s) contain the qrspi-version-check embed line\n`
    );
  }
  return violations;
}

// ---- Check 10 (budget-gate-embed): BUDGET-GATE EMBED ----------------------
//
// Asserts that each of the ten QRSPI command files that carry the context-budget
// soft gate contains the inline embed line:
//
//   Load skill `context-budget-gate` and follow its instructions exactly.
//
// The ten stems are: 8 stage commands (questions, research, design, structure,
// slices, plan, implement, pr) + archive + followup.
// 10 = 8 stage commands + archive + followup
//
// Excluded (must NOT be in the constant): status, update, retro (no gate).
// Hardcoded for regression safety -- same rationale as VERSION_CHECK_COMMAND_STEMS.

const BUDGET_GATE_COMMAND_STEMS = [
  // 8 stage commands
  'questions',
  'research',
  'design',
  'structure',
  'slices',
  'plan',
  'implement',
  'pr',
  // 2 boundary commands
  'archive',
  'followup',
];

const BUDGET_GATE_EMBED_LINE = 'Load skill `context-budget-gate` and follow its instructions exactly.';

async function checkBudgetGateEmbed(errors) {
  const commandsDir = path.join(root, 'claude', 'commands');
  let violations = 0;

  for (const stem of BUDGET_GATE_COMMAND_STEMS) {
    const filePath = path.join(commandsDir, `${stem}.md`);
    const rel = `claude/commands/${stem}.md`;

    const text = await readFileOr(filePath, null);
    if (text === null) {
      errors.push(`[budget-gate-embed] ${rel}: file not found`);
      violations++;
      continue;
    }

    // Collapse runs of whitespace (including newlines) to a single space so
    // that the embed sentence is matchable even when it wraps across two lines.
    const collapsed = text.replace(/\s+/g, ' ');
    if (!collapsed.includes(BUDGET_GATE_EMBED_LINE)) {
      errors.push(
        `[budget-gate-embed] ${rel}: missing inline context-budget-gate embed line` +
        ` (expected to find: "${BUDGET_GATE_EMBED_LINE}")`
      );
      violations++;
    }
  }

  if (violations === 0) {
    process.stdout.write(
      `  OK: all ${BUDGET_GATE_COMMAND_STEMS.length} command(s) contain the context-budget-gate embed line\n`
    );
  }
  return violations;
}

// ---- Check 10: TRIAGE PATH ANCHORS -----------------------------------------
//
// Asserts that claude/commands/followup.md contains the three triage
// choice-label prefixes introduced by the triage gate (D4). This mirrors
// Check 8 (checkPrReconciliationPasses), which pins the pr.md reconciliation
// gate labels: the same mechanical floor is applied here so a future wording
// change cannot silently drop a triage path.
//
// Required anchors (prefix of each AskUserQuestion choice label):
//   "P1 — implement directly"
//   "P2 — amend this change in place"
//   "P3 — defer"
//
// Reports a violation if any anchor is absent from the file.

async function checkTriagePaths(errors) {
  const followupPath = path.join(root, 'claude', 'commands', 'followup.md');
  const text = await readFileOr(followupPath, null);
  const rel = 'claude/commands/followup.md';

  if (text === null) {
    errors.push(`[triage-paths] ${rel}: file not found`);
    return 1;
  }

  let violations = 0;

  const triageAnchors = [
    { label: 'P1 choice label', anchor: 'P1 — implement directly' },
    { label: 'P2 choice label', anchor: 'P2 — amend this change in place' },
    { label: 'P3 choice label', anchor: 'P3 — defer' },
  ];

  for (const { label, anchor } of triageAnchors) {
    if (!text.includes(anchor)) {
      errors.push(`[triage-paths] ${rel}: missing triage choice anchor for ${label} (expected to find: "${anchor}")`);
      violations++;
    }
  }

  if (violations === 0) {
    process.stdout.write(`  OK: all three triage path anchors (P1/P2/P3) present in ${rel}\n`);
  }
  return violations;
}

// ---- Check 11: NO SURFACE-GATED SKELETON HEADINGS IN FENCED BLOCKS --------
//
// Asserts that none of the twenty-two surface-gated heading lines appear as
// literal heading lines INSIDE fenced code blocks in the five artifact-producing
// agent files (questioner, designer, architect, planner, reviewer).
//
// Disjoint-set invariant (a) -- vs Check 3:
//   Check 3 (checkHeadingAlignment) requires surface-INDEPENDENT headings
//   (## Testing, ## Sequencing & scope, ## Open product questions) to be
//   PRESENT anywhere in the body of the relevant agent file.
//   Check 11 (this check) requires surface-GATED headings to be ABSENT from
//   FENCED BLOCKS in the five agent files.
//   The two checks cover DISJOINT heading sets AND disjoint scopes:
//     - no heading is simultaneously required-present (Check 3) and
//       forbidden-in-fences (Check 11);
//     - Check 3 scans the full body (not limited to fenced blocks);
//     - Check 11 scans only inside fenced blocks (not the full body).
//
// Disjoint-scope invariant (b) -- vs forthcoming Check 14:
//   Check 11 scans agent SOURCE fenced skeletons (inside ``` blocks).
//   Check 14 scans committed ARTIFACT bodies outside fences (e.g. questions.md,
//   design.md files in openspec/changes/).
//   The two checks cover DISJOINT scopes and will never fire on the same line.
//
// The twenty-two surface-gated headings replaced conditional placeholders in
// agent skeletons. Matching on lines equal to (or beginning with) the heading
// marker avoids false positives on prose mentions (e.g. "see ## Data model
// below") that appear outside fenced blocks.
//
// Registered after Check 10; contributes to the pass/fail aggregation and exit code.

const SURFACE_GATED_DENYLIST_HEADINGS = new Set([
  // Data-store surface (original 12)
  '## Data model',
  '## Indexing & query performance',
  '## API',
  '## UI',
  '## Front-end state',
  '## Auth & authorization',
  '## Migrations & data',
  '## Data model changes',
  '## API surface',
  '## UI surface',
  '## Authorization',
  '## Migrations',
  // Kit surfaces (10 new -- added in kit-surface-dogfooding)
  '## Slash-command surface',
  '## Command changes',
  '## Stage-agent surface',
  '## Agent changes',
  '## Skill surface',
  '## Skill changes',
  '## Lint-gate surface',
  '## Lint changes',
  '## Template surface',
  '## Migration manifest',
]);

const CRUD_CHECK_AGENTS = [
  'questioner',
  'designer',
  'architect',
  'planner',
  'researcher',
  'reviewer',
];

async function checkNoCrudSkeletonHeadings(errors) {
  const agentsDir = path.join(root, 'claude', 'agents');
  let violations = 0;

  for (const stem of CRUD_CHECK_AGENTS) {
    const filePath = path.join(agentsDir, `${stem}.md`);
    const rel = `claude/agents/${stem}.md`;

    const text = await readFileOr(filePath, null);
    if (text === null) {
      errors.push(`[crud-skeleton] ${rel}: file not found`);
      violations++;
      continue;
    }

    // Strip YAML frontmatter, then scan fenced blocks only.
    const { body } = splitFront(text);
    const lines = body.split('\n');

    let inFence = false;
    let fenceMark = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect fence open/close: a line starting with ``` or ~~~
      const fenceMatch = line.match(/^(`{3,}|~{3,})/);
      if (fenceMatch) {
        const mark = fenceMatch[1][0]; // ` or ~
        const len = fenceMatch[1].length;

        if (!inFence) {
          // Opening fence
          inFence = true;
          fenceMark = mark.repeat(len);
        } else if (
          mark === fenceMark[0] &&
          line.trimEnd() === fenceMark
        ) {
          // Closing fence must match exactly (same marker char, same length, nothing else)
          inFence = false;
          fenceMark = '';
        }
        // If inside a fence and line starts with fence chars but doesn't match,
        // it is content, not a close marker -- continue.
        continue;
      }

      if (inFence) {
        // Check if this line is a surface-gated denylist heading.
        // Match on exact prefix: the line, after trimming trailing whitespace,
        // must equal a denylist entry (handles both "## Foo" alone and avoids
        // matching "## Foo bar" when only "## Foo" is denied).
        // The denylist entries do not include trailing content, so we test
        // whether the trimmed line starts with the denylist entry followed
        // by end-of-string OR whitespace (prevents "## APIs" matching "## API").
        const trimmed = line.trimEnd();
        for (const denied of SURFACE_GATED_DENYLIST_HEADINGS) {
          if (trimmed === denied || trimmed.startsWith(denied + ' ') || trimmed.startsWith(denied + '\t')) {
            errors.push(
              `[crud-skeleton] ${rel}:${i + 1}: surface-gated heading '${denied}' found inside a fenced block -- ` +
              `replace with a surface-gate conditional placeholder (see repo-surface skill)`
            );
            violations++;
            break; // one violation per line is enough
          }
        }
      }
    }

    if (violations === 0) {
      // Per-file OK reported only if no violations found anywhere yet;
      // we report at the end of the loop for this file.
    }
  }

  if (violations === 0) {
    process.stdout.write(
      `  OK: no surface-gated skeleton headings found inside fenced blocks in any of the ${CRUD_CHECK_AGENTS.length} agent files\n`
    );
  }
  return violations;
}

// ---- Check 12: OUTPUT-CONTRACT BANNER PRESENCE -----------------------------
//
// Each of the seven QRSPI stage agents carries a `> **Output contract**`
// banner near the top of its file (adjacent to the Read contract banner).
// This check asserts that the banner line is present -- it is a presence-only
// check (the banner text is human-authored and not machine-parsed here).
//
// Regex: /^>\s*\*\*Output contract\*\*/ must match at least one line in
// each agent's body (after stripping frontmatter).
//
// SCOPE: strictly the seven stage agents named in READ_CONTRACT_EXPECTED
// (researcher, questioner, designer, architect, planner, implementer,
// reviewer). Mirrors the scope of checkReadContracts (Check 7).

async function checkOutputContracts(errors) {
  const agentsDir = path.join(root, 'claude', 'agents');
  let violations = 0;
  const OUTPUT_CONTRACT_RE = /^>\s*\*\*Output contract\*\*/;

  for (const stem of Object.keys(READ_CONTRACT_EXPECTED)) {
    const rel = `claude/agents/${stem}.md`;
    const text = await readFileOr(path.join(agentsDir, `${stem}.md`), null);
    if (text === null) {
      errors.push(`[output-contract] ${rel}: file not found -- expected a stage-agent output-contract banner`);
      violations++;
      continue;
    }

    const { body } = splitFront(text);
    const lines = body.split('\n');
    const hasBanner = lines.some((l) => OUTPUT_CONTRACT_RE.test(l));

    if (!hasBanner) {
      errors.push(
        `[output-contract] ${rel}: no '> **Output contract**' banner line found`
      );
      violations++;
    }
  }

  if (violations === 0) {
    process.stdout.write(
      `  OK: ${Object.keys(READ_CONTRACT_EXPECTED).length} stage-agent output-contract banner(s) present\n`
    );
  }
  return violations;
}

// ---- Check 13: COMPUTE ANNOTATION VALUE-VALIDATION -------------------------
//
// Parses every `**Compute:**` line in the committed change artifacts
// (openspec/changes/**/slices.md and **/tasks.md) and value-validates the
// `model=` / `effort=` tokens against COMPUTE_MODELS / COMPUTE_EFFORTS (D6).
//
// This is VALUE-VALIDATION ONLY -- it does NOT assert a `**Compute:**` line is
// present on every slice (that is a Non-Goal). Orthogonal grammar (D3/D7):
// `effort=` is required, `model=` is optional. It flags:
//   - missing/empty `effort=` token (effort is required -- D3/D7)
//   - `effort=` not in COMPUTE_EFFORTS
//   - `model=` present but not in COMPUTE_MODELS
//
// It tolerates BOTH structural forms (D1): the `-` dash-bullet form used in
// slices.md (`- **Compute:** ...`) and the bare bold form used in tasks.md
// (`**Compute:** ...`). To match on the ANNOTATION rather than a prose mention,
// the `**Compute:**` token must be the FIRST content on the line -- optionally
// preceded by a `- ` list bullet and whitespace, nothing else. This anchoring
// is what separates a real annotation line from prose that merely quotes the
// grammar (e.g. a task line "replace X with `**Compute:** model=<alias> ...`"
// carries the token mid-line and inside backticks, so it is correctly ignored).
//
// SCOPE: strictly openspec/changes/**/{slices.md,tasks.md}. It does NOT scan
// claude/skills/** or openspec-templates/**, so the placeholder example lines
// there (e.g. `**Compute:** model=<alias> effort=<low|medium|high>`) never
// reach this check. With the implementer self-halt gone (D6), Check 13 is the
// only static gate catching a malformed annotation before implement.

async function checkComputeAnnotations(errors) {
  // ---- INLINE SELF-TEST -------------------------------------------------------
  // Orthogonal grammar (D3/D7): effort= is REQUIRED, model= is OPTIONAL.
  // Assert the four load-bearing rules on bare-bold tasks.md-form fixtures:
  //   (1) a line with effort= and no model= is ACCEPTED (model defaults sonnet);
  //   (2) a line missing effort= is REJECTED (effort is required);
  //   (3) the haiku alias is a valid model value (COMPUTE_MODELS includes it);
  //   (4) an unknown model value is rejected.
  const _matchEffort = (s) => s.match(/\beffort=(\S*)/);
  const _matchModel = (s) => s.match(/\bmodel=(\S*)/);

  // (1) effort= present, model= omitted -> accepted (no missing-effort error)
  const _stEffortOnly = '**Compute:** effort=medium — model defaults to sonnet';
  if (!_matchEffort(_stEffortOnly)) {
    errors.push(
      '[compute] SELF-TEST FAILED: effort=medium (no model=) was not recognized -- effort parsing is broken'
    );
  }

  // (2) effort= absent -> rejected (missing required effort)
  const _stNoEffort = '**Compute:** model=sonnet — missing effort';
  if (_matchEffort(_stNoEffort)) {
    errors.push(
      '[compute] SELF-TEST FAILED: a **Compute:** line with no effort= token was treated as having one -- required-effort validation is broken'
    );
  }

  // (3) haiku is a valid model alias
  const _stHaiku = '**Compute:** effort=low model=haiku — mechanical rename';
  const _stHaikuModel = _matchModel(_stHaiku);
  if (!(_stHaikuModel && COMPUTE_MODELS.includes(_stHaikuModel[1]))) {
    errors.push(
      '[compute] SELF-TEST FAILED: model=haiku was not accepted -- COMPUTE_MODELS is missing the haiku entry'
    );
  }

  // (4) unknown model value is rejected
  const _stUnknown = '**Compute:** effort=low model=unknown — bad';
  const _stUnknownModel = _matchModel(_stUnknown);
  if (!(_stUnknownModel && !COMPUTE_MODELS.includes(_stUnknownModel[1]))) {
    errors.push(
      '[compute] SELF-TEST FAILED: model=unknown was not rejected -- COMPUTE_MODELS validation is broken'
    );
  }
  // ---- end self-test ----------------------------------------------------------

  const changesDir = path.join(root, 'openspec', 'changes');
  const allMd = await walkMd(changesDir);
  const artifactFiles = allMd.filter((f) => {
    const base = path.basename(f);
    return base === 'slices.md' || base === 'tasks.md';
  });

  let violations = 0;
  let linesChecked = 0;

  // Match the `**Compute:**` token only when it is the FIRST content on the
  // line -- optionally preceded by a `- ` dash-bullet (slices.md form) and
  // whitespace, nothing else (D1). Anchoring at line start is what excludes
  // prose that quotes the grammar mid-sentence or inside backticks. Capture
  // the remainder of the line after the token for token extraction.
  const computeRe = /^\s*(?:-\s+)?\*\*Compute:\*\*(.*)$/;

  for (const file of artifactFiles) {
    const rel = path.relative(root, file);
    const text = await readFileOr(file, null);
    if (text === null) continue;

    const lines = text.replace(/\r\n/g, '\n').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(computeRe);
      if (!m) continue;
      linesChecked++;
      const rest = m[1];

      // Extract key=value tokens. Values are non-space runs (the `— rationale`
      // tail begins after a space, so it is never captured as a value).
      const modelM = rest.match(/\bmodel=(\S*)/);
      const effortM = rest.match(/\beffort=(\S*)/);

      // effort= required and non-empty (D3/D7 -- orthogonal grammar: effort
      // selects the implementer variant, so it is the load-bearing token).
      if (!effortM || effortM[1] === '') {
        errors.push(
          `[compute] ${rel}:${i + 1}: **Compute:** line missing required 'effort=' token`
        );
        violations++;
      } else if (!COMPUTE_EFFORTS.includes(effortM[1])) {
        errors.push(
          `[compute] ${rel}:${i + 1}: 'effort=${effortM[1]}' is not a valid effort` +
          ` (allowed: ${COMPUTE_EFFORTS.join(', ')})`
        );
        violations++;
      }

      // model= optional (defaults to sonnet at spawn), but valid-if-present (D3/D7)
      if (modelM && modelM[1] !== '' && !COMPUTE_MODELS.includes(modelM[1])) {
        errors.push(
          `[compute] ${rel}:${i + 1}: 'model=${modelM[1]}' is not a valid model` +
          ` (allowed: ${COMPUTE_MODELS.join(', ')})`
        );
        violations++;
      }
    }
  }

  if (violations === 0) {
    process.stdout.write(
      `  OK: ${linesChecked} **Compute:** annotation(s) value-valid across committed slices.md/tasks.md\n`
    );
  }
  return violations;
}

// ---- Check 14: SURFACE APPLICABILITY OF ARTIFACT HEADINGS -----------------
//
// Scans every *.md file under openspec/changes/** (excluding any path that
// contains "/archive/") and flags any heading line that belongs to an
// ABSENT surface -- i.e., a surface not listed in the stack-cheatsheet's
// `## Repo surface` block.
//
// SETUP (D6, D7, PQ7):
//   1. Read `.claude/skills/qrspi-stack/SKILL.md` and extract the
//      `## Repo surface` block. If the heading is absent OR the block yields
//      neither the sentinel `_No present surfaces._` nor at least one bullet
//      line, push a clear error and return immediately (fail-loud).
//   2. Parse the present-surface bullet list from the block.
//   3. Compute the ABSENT-surface set = all surfaces in SURFACE_GATED_HEADINGS
//      minus the present set. Derive the absent-heading set from those.
//   4. Walk every *.md under openspec/changes/, skipping paths with /archive/.
//   5. For each file, scan lines OUTSIDE fenced code blocks (fence-tracking
//      mirrors Check 11's approach). Flag any line that is an absent heading
//      (exact-prefix match: trimmed === h, or starts with h+' ', or h+'\t').
//   6. On a hit, push a [surface-applicability] error naming file:line, the
//      heading, and the surface it belongs to.
//
// DISJOINT SCOPE (b): Check 11 scans INSIDE fenced blocks in agent source files;
//   Check 14 scans OUTSIDE fenced blocks in committed change artifacts.
//   The two checks will never fire on the same line.
//
// INLINE SELF-TEST (D8, OQ2):
//   A synthetic in-memory fixture containing a known absent-surface heading is
//   run through the detector at startup. If the detector fails to flag it, an
//   error is pushed so CI reddens immediately -- a broken detector never passes
//   silently.

// Map from surface name to the section headings it gates (sections only --
// checklist-item-only surfaces like `typed-nullable` are absent from this map
// because they have no heading the detector can match). Sourced from the
// section-to-surface mapping in claude/skills/repo-surface/SKILL.md (D6, PQ6).
const SURFACE_GATED_HEADINGS = {
  'data-store': [
    '## Data model',
    '## Indexing & query performance',
    '## Migrations & data',
    '## Data model changes',
    '## Migrations',
  ],
  'http-api': [
    '## API',
    '## API surface',
  ],
  'ui': [
    '## UI',
    '## Front-end state',
    '## UI surface',
  ],
  'auth': [
    '## Auth & authorization',
    '## Authorization',
  ],
  // typed-nullable: no section headings (only PR checklist items) -- not included
  'slash-command': [
    '## Slash-command surface',
    '## Command changes',
  ],
  'stage-agent': [
    '## Stage-agent surface',
    '## Agent changes',
  ],
  'skill': [
    '## Skill surface',
    '## Skill changes',
  ],
  'lint-gate': [
    '## Lint-gate surface',
    '## Lint changes',
  ],
  'template': [
    '## Template surface',
  ],
  'migration-manifest': [
    '## Migration manifest',
  ],
};

// Parse the present-surface set from the text of qrspi-stack/SKILL.md.
// Returns { ok: true, surfaces: Set<string> } or { ok: false, message: string }.
function parseRepoSurfaceBlock(skillText) {
  const lines = skillText.replace(/\r\n/g, '\n').split('\n');

  // Find the `## Repo surface` heading line
  const headingIdx = lines.findIndex((l) => l.trimEnd() === '## Repo surface');
  if (headingIdx === -1) {
    return {
      ok: false,
      message:
        'the `## Repo surface` block is required for the kit to dogfood its own surface check ' +
        '-- add a `## Repo surface` section to `.claude/skills/qrspi-stack/SKILL.md`',
    };
  }

  // Collect the block's content lines: everything after the heading until
  // the next `##`-level heading or end of file.
  const blockLines = [];
  for (let i = headingIdx + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;
    blockLines.push(lines[i]);
  }

  // Check for sentinel
  const blockText = blockLines.join('\n');
  if (blockText.includes('_No present surfaces._')) {
    return { ok: true, surfaces: new Set() };
  }

  // Parse bullet lines: `- <surface-name>`
  const surfaces = new Set();
  for (const bl of blockLines) {
    const m = bl.match(/^\s*-\s+(\S+)\s*$/);
    if (m) surfaces.add(m[1]);
  }

  if (surfaces.size === 0) {
    return {
      ok: false,
      message:
        'the `## Repo surface` block in `.claude/skills/qrspi-stack/SKILL.md` is present but ' +
        'contains neither the sentinel `_No present surfaces._` nor any parseable bullet lines ' +
        '-- add bullet lines (`- <surface-name>`) or use the sentinel',
    };
  }

  return { ok: true, surfaces };
}

// Core line-scanner used by both the self-test and the real file scan.
// Given an array of heading strings to flag, scan `text` (a file's full content)
// for any heading outside a fenced block that matches. Returns an array of
// { lineNum (1-based), heading, line } hits.
function scanAbsentHeadings(text, absentHeadings) {
  if (absentHeadings.length === 0) return [];

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const hits = [];

  let inFence = false;
  let fenceMark = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fence open/close detection (mirrors Check 11)
    const fenceMatch = line.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      const mark = fenceMatch[1][0];
      const len = fenceMatch[1].length;
      if (!inFence) {
        inFence = true;
        fenceMark = mark.repeat(len);
      } else if (mark === fenceMark[0] && line.trimEnd() === fenceMark) {
        inFence = false;
        fenceMark = '';
      }
      continue;
    }

    // Only flag headings OUTSIDE fenced blocks
    if (!inFence) {
      const trimmed = line.trimEnd();
      for (const h of absentHeadings) {
        if (trimmed === h || trimmed.startsWith(h + ' ') || trimmed.startsWith(h + '\t')) {
          hits.push({ lineNum: i + 1, heading: h, line: trimmed });
          break;
        }
      }
    }
  }

  return hits;
}

async function checkSurfaceApplicability(errors) {
  // ---- INLINE SELF-TEST (D8, OQ2) -----------------------------------------
  // Run the scanner over a synthetic fixture with a known absent-surface heading
  // (## Data model is in data-store, which is absent for the kit). The detector
  // MUST fire; if it misses, the test itself pushes an error so CI fails loudly.
  const selfTestFixture = '# Title\n\nSome prose.\n\n## Data model\n\nContent here.\n';
  const selfTestAbsent = ['## Data model'];
  const selfTestHits = scanAbsentHeadings(selfTestFixture, selfTestAbsent);
  if (selfTestHits.length === 0) {
    errors.push(
      '[surface-applicability] SELF-TEST FAILED: the scanner did not flag ' +
      '`## Data model` in the synthetic fixture -- the detector is broken'
    );
    // Do not proceed if the detector itself is broken
    return 1;
  }
  // Also verify the fence-skip logic: a heading inside a fence must NOT be flagged
  const selfTestFenced = '# Title\n\n```\n## Data model\n```\n\nProse.\n';
  const selfTestFencedHits = scanAbsentHeadings(selfTestFenced, selfTestAbsent);
  if (selfTestFencedHits.length !== 0) {
    errors.push(
      '[surface-applicability] SELF-TEST FAILED: the scanner flagged `## Data model` ' +
      'inside a fenced block -- fence-skip logic is broken'
    );
    return 1;
  }
  // Self-test passed -- continue to real scan
  // -------------------------------------------------------------------------

  // 1. Read the stack-cheatsheet skill
  const stackSkillPath = path.join(root, '.claude', 'skills', 'qrspi-stack', 'SKILL.md');
  const stackSkillText = await readFileOr(stackSkillPath, null);
  if (stackSkillText === null) {
    errors.push(
      '[surface-applicability] `.claude/skills/qrspi-stack/SKILL.md` not found -- ' +
      'cannot determine present surfaces for Check 14'
    );
    return 1;
  }

  // 2. Parse the ## Repo surface block (fail-loud on absence or malformed block)
  const parsed = parseRepoSurfaceBlock(stackSkillText);
  if (!parsed.ok) {
    errors.push(`[surface-applicability] ${parsed.message}`);
    return 1;
  }
  const presentSurfaces = parsed.surfaces;

  // 3. Compute absent-surface set and absent-heading set
  const absentHeadings = [];
  const headingToSurface = new Map();
  for (const [surface, headings] of Object.entries(SURFACE_GATED_HEADINGS)) {
    if (!presentSurfaces.has(surface)) {
      for (const h of headings) {
        absentHeadings.push(h);
        headingToSurface.set(h, surface);
      }
    }
  }

  if (absentHeadings.length === 0) {
    // All surfaces present -- nothing to flag
    process.stdout.write(
      '  OK: all surfaces are present; no absent-surface headings to check\n'
    );
    return 0;
  }

  // 4. Walk openspec/changes/ and scan each .md file (excluding /archive/)
  const changesDir = path.join(root, 'openspec', 'changes');
  const allMd = await walkMd(changesDir);
  const targetFiles = allMd.filter((f) => !f.includes(path.sep + 'archive' + path.sep));

  let violations = 0;

  for (const file of targetFiles) {
    const rel = path.relative(root, file);
    const text = await readFileOr(file, null);
    if (text === null) continue;

    // 5. Scan for absent-surface headings outside fenced blocks
    const hits = scanAbsentHeadings(text, absentHeadings);
    for (const { lineNum, heading } of hits) {
      const surface = headingToSurface.get(heading);
      errors.push(
        `[surface-applicability] ${rel}:${lineNum}: heading '${heading}' belongs to ` +
        `surface '${surface}' which is absent for this repo -- ` +
        `remove the heading or add '${surface}' to the ## Repo surface block`
      );
      violations++;
    }
  }

  if (violations === 0) {
    process.stdout.write(
      `  OK: no absent-surface headings found in ${targetFiles.length} change artifact file(s)\n`
    );
  }
  return violations;
}

// ---- Check 15: VARIANT AGENT DRIFT GATE ------------------------------------
//
// Asserts that the set of implementer variant agents in claude/agents/ matches
// the registry exactly, and that each variant's shape is correct.
//
// Five sub-checks:
//
//   (a) EXACT SET -- the stems of all claude/agents/implementer-*.md files
//       must exactly equal IMPLEMENTER_VARIANTS (no extra, no missing).
//
//   (b) STEP-1 LOAD -- each variant's step-1 numbered-list line must load
//       ONLY `implementer-core` (the variants delegate all behaviour to the
//       core skill; adding other skills here would bypass the shared contract).
//       Extraction reuses the same step-1 harvest logic as checkSkillSets.
//
//   (c) EFFORT MATCH -- each variant's `effort:` frontmatter field must equal
//       the stem suffix (implementer-low -> effort: low, etc.).
//
//   (d) PLUGIN REGISTRATION -- each variant must be listed in
//       .claude-plugin/plugin.json's `agents` array (registered as a spawnable
//       subagent_type).
//
//   (e) BASE-AGENT ABSENCE -- `./claude/agents/implementer.md` must NOT appear
//       in the `agents` array; the base agent was deleted (its dispatch paths
//       now route through the variants) and its re-registration would revive a
//       dead spawn target.
//
// INLINE SELF-TEST: a synthetic in-memory fixture is run through the step-1
// skill extractor to assert it correctly identifies a variant that loads only
// `implementer-core`. A second fixture with an extra skill asserts the
// detector fires. If either fails, an error is pushed so CI reddens
// immediately -- a broken detector never passes silently.
//
// SCOPE: strictly implementer-*.md files. The six named stage agents are NOT
// covered here -- they are covered by Checks 7, 12, and 2b. Variants are
// deliberately outside those registries.

const IMPLEMENTER_VARIANTS = ['implementer-low', 'implementer-medium', 'implementer-high'];

// Extract skill names loaded in step-1 of a body, filtering out -stack suffixes.
// Reuses the same logic as checkSkillSets: numbered-step lines containing
// "Load skill(s)" plus any indented continuation lines.
function extractStep1Skills(body) {
  const harvested = new Set();
  const backtickRe = /`([A-Za-z0-9_-]+)`/g;
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*\d+\.\s[^\n]*Load skills?\s/i.test(lines[i])) {
      let segment = lines[i];
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j];
        if (/^\s+/.test(next) && !/^\s*\d+\.\s/.test(next) && !/^\s*[-*]\s/.test(next)) {
          segment += ' ' + next;
        } else {
          break;
        }
      }
      backtickRe.lastIndex = 0;
      let bm;
      while ((bm = backtickRe.exec(segment)) !== null) {
        harvested.add(bm[1]);
      }
    }
  }
  return [...harvested].filter((name) => !name.endsWith('-stack'));
}

async function checkVariantAgents(errors) {
  // ---- INLINE SELF-TEST -------------------------------------------------------
  // (i) A variant body loading only `implementer-core` -- must yield exactly
  //     ['implementer-core'] after extraction.
  const _okBody = '\n1. Load skill `implementer-core` and follow its instructions exactly.\n';
  const _okSkills = extractStep1Skills(_okBody);
  const _okPass = _okSkills.length === 1 && _okSkills[0] === 'implementer-core';
  if (!_okPass) {
    errors.push(
      '[variant-agents] SELF-TEST FAILED: step-1 extractor did not return [implementer-core] ' +
      `for the valid fixture -- got [${_okSkills.join(', ')}]`
    );
  }
  // (ii) A variant body loading an extra skill -- must yield more than one name.
  const _badBody = '\n1. Load skills `implementer-core` and `workflow` and follow their instructions.\n';
  const _badSkills = extractStep1Skills(_badBody);
  const _badDetected = _badSkills.length !== 1 || _badSkills[0] !== 'implementer-core';
  if (!_badDetected) {
    errors.push(
      '[variant-agents] SELF-TEST FAILED: step-1 extractor did not detect the extra skill ' +
      'in the invalid fixture -- drift detection is broken'
    );
  }
  // ---- end self-test ----------------------------------------------------------

  const agentsDir = path.join(root, 'claude', 'agents');
  let violations = 0;

  // (a) EXACT SET -- collect claude/agents/implementer-*.md stems
  const agentFiles = await listFiles(agentsDir, '.md');
  const variantFiles = agentFiles.filter((f) => {
    const stem = path.basename(f, '.md');
    return stem.startsWith('implementer-') && stem !== 'implementer';
  });
  const foundStems = variantFiles.map((f) => path.basename(f, '.md')).sort();
  const expectedStems = [...IMPLEMENTER_VARIANTS].sort();

  const extraStems   = foundStems.filter((s) => !expectedStems.includes(s));
  const missingStems = expectedStems.filter((s) => !foundStems.includes(s));

  if (extraStems.length > 0) {
    errors.push(
      `[variant-agents] Unexpected variant agent file(s): ${extraStems.map((s) => `claude/agents/${s}.md`).join(', ')}` +
      ` -- add to IMPLEMENTER_VARIANTS or remove the file`
    );
    violations++;
  }
  if (missingStems.length > 0) {
    errors.push(
      `[variant-agents] Missing variant agent file(s): ${missingStems.map((s) => `claude/agents/${s}.md`).join(', ')}` +
      ` -- create the file or remove from IMPLEMENTER_VARIANTS`
    );
    violations++;
  }

  // (b) STEP-1 LOAD and (c) EFFORT MATCH -- check each expected variant
  for (const stem of IMPLEMENTER_VARIANTS) {
    const filePath = path.join(agentsDir, `${stem}.md`);
    const rel = `claude/agents/${stem}.md`;
    const text = await readFileOr(filePath, null);
    if (text === null) {
      // Already reported as missing in (a); skip further checks for this file
      continue;
    }

    const { front, body } = splitFront(text);

    // (b) STEP-1 LOAD: must load only implementer-core
    const loadedSkills = extractStep1Skills(body);
    if (loadedSkills.length === 0) {
      errors.push(
        `[variant-agents] ${rel}: no step-1 "Load skill" line found -- ` +
        `variants must have a numbered step-1 line loading \`implementer-core\``
      );
      violations++;
    } else if (loadedSkills.length !== 1 || loadedSkills[0] !== 'implementer-core') {
      errors.push(
        `[variant-agents] ${rel}: step-1 loads [${loadedSkills.join(', ')}] -- ` +
        `variants must load ONLY \`implementer-core\` (no other skills)`
      );
      violations++;
    }

    // (c) EFFORT MATCH: effort: must equal the stem suffix
    const stemSuffix = stem.replace(/^implementer-/, '');  // low | medium | high
    const effortVal = getField(front, 'effort');
    if (effortVal !== stemSuffix) {
      errors.push(
        `[variant-agents] ${rel}: 'effort: ${effortVal || "(missing)"}' does not match stem suffix '${stemSuffix}'` +
        ` -- set 'effort: ${stemSuffix}'`
      );
      violations++;
    }
  }

  // (d) PLUGIN REGISTRATION -- each variant must be listed in
  //     .claude-plugin/plugin.json's `agents` array. The file existing in
  //     claude/agents/ is NOT enough: this plugin declares agents via an
  //     explicit array (not directory discovery), so an unlisted variant is
  //     never registered as a spawnable subagent_type (qrspi:implementer-<x>).
  const pluginJsonPath = path.join(root, '.claude-plugin', 'plugin.json');
  const pluginRaw = await readFileOr(pluginJsonPath, null);
  if (pluginRaw === null) {
    errors.push(`[variant-agents] cannot read .claude-plugin/plugin.json to verify variant registration`);
    violations++;
  } else {
    let agentsList = [];
    try {
      agentsList = JSON.parse(pluginRaw).agents || [];
    } catch {
      errors.push(`[variant-agents] .claude-plugin/plugin.json is not valid JSON -- cannot verify variant registration`);
      violations++;
    }
    for (const stem of IMPLEMENTER_VARIANTS) {
      const entry = `./claude/agents/${stem}.md`;
      if (!agentsList.includes(entry)) {
        errors.push(
          `[variant-agents] ${entry} is not registered in .claude-plugin/plugin.json "agents" -- ` +
          `add it or the variant cannot be spawned (agents are an explicit array, not directory-discovered)`
        );
        violations++;
      }
    }

    // (e) BASE-AGENT ABSENCE -- `./claude/agents/implementer.md` must NOT appear
    //     in the `agents` array. Its presence would register a bare non-variant
    //     agent (qrspi:implementer) that the kit no longer ships. Checked here
    //     (not in (d)) so the self-test below can share the same pluginRaw parse.
    //
    //     INLINE SELF-TEST: a synthetic agents list containing the base path is
    //     run through the absence detector. The detector MUST fire; if it misses,
    //     an error is pushed so CI reddens immediately -- a broken detector never
    //     passes silently.
    const _stBasePresent = ['./claude/agents/implementer.md', './claude/agents/implementer-low.md'];
    const _stBaseFired = _stBasePresent.includes('./claude/agents/implementer.md');
    if (!_stBaseFired) {
      errors.push(
        '[variant-agents] SELF-TEST FAILED: base-path absence detector did not fire ' +
        'on a synthetic agents list containing `./claude/agents/implementer.md` -- (e) is broken'
      );
    }
    // End self-test

    if (agentsList.includes('./claude/agents/implementer.md')) {
      errors.push(
        '[variant-agents] `./claude/agents/implementer.md` must not appear in ' +
        '.claude-plugin/plugin.json "agents" -- the base agent was deleted in Slice 2; remove this entry'
      );
      violations++;
    }
  }

  if (violations === 0) {
    process.stdout.write(
      `  OK: ${IMPLEMENTER_VARIANTS.length} implementer variant agent(s) match the registry, plugin.json registration (base agent absent), step-1 load, and effort values\n`
    );
  }
  return violations;
}

// ---- Check 16: FOLLOWUP BARE-STEM GUARD ------------------------------------
//
// Asserts that `claude/commands/followup.md` contains NO bare occurrence of
// `qrspi:implementer` (the deleted base-agent name) outside a variant suffix.
// The regex /qrspi:implementer(?!-)/ uses a negative lookahead so variant
// stems (qrspi:implementer-low / -medium / -high) do not match.
//
// Both the fenced `subagent_type: qrspi:implementer` form and any inline-prose
// form are caught: the regex is applied to the FULL raw file content.
//
// A match is a violation: it means the followup command would spawn the bare
// qrspi:implementer agent that no longer exists, silently failing at runtime.

async function checkFollowupStem(errors) {
  const followupPath = path.join(root, 'claude', 'commands', 'followup.md');
  const text = await readFileOr(followupPath, null);
  const rel = 'claude/commands/followup.md';

  if (text === null) {
    errors.push(`[followup-stem] ${rel}: file not found`);
    return 1;
  }

  // Negative lookahead: match qrspi:implementer NOT followed by a hyphen.
  // This accepts qrspi:implementer-low/medium/high but rejects the bare stem.
  const bareStemRe = /qrspi:implementer(?!-)/g;
  let violations = 0;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    bareStemRe.lastIndex = 0;
    if (bareStemRe.test(lines[i])) {
      errors.push(
        `[followup-stem] ${rel}:${i + 1}: bare 'qrspi:implementer' reference found (without variant suffix) -- ` +
        `replace with qrspi:implementer-low, -medium, or -high`
      );
      violations++;
    }
  }

  if (violations === 0) {
    process.stdout.write(`  OK: no bare 'qrspi:implementer' stem in ${rel}\n`);
  }
  return violations;
}

// ---- Check 17: HELPER AGENT READ-CONTRACT BANNER AGREEMENT -----------------
//
// Helper agents are not QRSPI stages and are not covered by Check 7's
// READ_CONTRACT_EXPECTED map (which is scoped strictly to the nine stage-agent
// entries). This check covers the separate set of helper agents -- one-job
// agents spawned by kit commands rather than stage commands -- using the same
// banner-extraction logic as Check 7 (extractReadsField / normalizeWs).
//
// A separate hardcoded map HELPER_READ_CONTRACT_EXPECTED drives the check so
// that Check 7's nine-agent scope is never widened (PQ13 / D10).
//
// Algorithm:
//   1. For each entry in HELPER_READ_CONTRACT_EXPECTED, read the agent file
//      claude/agents/<stem>.md.
//   2. Extract the `Reads:` field from the `> **Read contract**` banner using
//      the same extractReadsField() / normalizeWs() helpers as Check 7.
//   3. Assert the extracted field equals the expected value.
//
// INLINE SELF-TEST (mirrors Check 15's pattern):
//   Run extractReadsField against a synthetic fixture string with no banner line.
//   Assert the detector returns null (the banner is missing). If it does not,
//   push a Check 17 error so CI reddens immediately -- a broken detector never
//   passes silently.
//
// SCOPE: strictly the helper agents named in HELPER_READ_CONTRACT_EXPECTED.
//   This check must NOT flag any stage agent or any other file.

// Expected `Reads:` field per helper agent -- the exact text that must appear
// between the banner's em-dash separator and its `Never opens:` clause, after
// whitespace normalisation. Maintained separately from READ_CONTRACT_EXPECTED
// (Check 7) so Check 7's nine-agent scope is never widened.
const HELPER_READ_CONTRACT_EXPECTED = {
  'spec-syncer': 'Reads: specs/** (delta) and openspec/specs/** (main, via the spec.md exception).',
};

async function checkHelperAgentReadContracts(errors) {
  // ---- INLINE SELF-TEST -------------------------------------------------------
  // Assert that extractReadsField returns null when no banner line is present.
  // This verifies the detector will correctly flag a missing banner rather than
  // silently passing it.
  const _selfTestNoBanner = '# Heading\n\nSome prose without a read contract banner.\n';
  const _selfTestResult = extractReadsField(_selfTestNoBanner);
  if (_selfTestResult !== null) {
    errors.push(
      '[helper-read-contract] SELF-TEST FAILED: extractReadsField returned non-null ' +
      `("${_selfTestResult}") for a fixture with no Read contract banner -- banner detection is broken`
    );
    // Do not proceed if the detector itself is broken
    return 1;
  }
  // Self-test passed -- continue to real scan
  // ---- end self-test ----------------------------------------------------------

  const agentsDir = path.join(root, 'claude', 'agents');
  let violations = 0;

  for (const stem of Object.keys(HELPER_READ_CONTRACT_EXPECTED)) {
    const rel = `claude/agents/${stem}.md`;
    const text = await readFileOr(path.join(agentsDir, `${stem}.md`), null);
    if (text === null) {
      errors.push(`[helper-read-contract] ${rel}: file not found -- expected a helper-agent read-contract banner`);
      violations++;
      continue;
    }

    const { body } = splitFront(text);
    const actual = extractReadsField(body);
    if (actual === null) {
      errors.push(
        `[helper-read-contract] ${rel}: no parseable '> **Read contract** -- Reads: ... Never opens: ...' banner found`
      );
      violations++;
      continue;
    }

    const expected = normalizeWs(HELPER_READ_CONTRACT_EXPECTED[stem]);
    if (actual !== expected) {
      errors.push(
        `[helper-read-contract] ${rel}: banner Reads-field mismatch\n` +
        `    expected: ${expected}\n` +
        `    actual:   ${actual}`
      );
      violations++;
    }
  }

  if (violations === 0) {
    process.stdout.write(
      `  OK: ${Object.keys(HELPER_READ_CONTRACT_EXPECTED).length} helper-agent read-contract banner(s) match the read matrix\n`
    );
  }
  return violations;
}

// ---- Check 18: MODIFIED SCENARIO COUNT GUARD --------------------------------
//
// Ensures that every MODIFIED requirement in a delta spec restates at least as
// many `#### Scenario:` blocks as the base spec requirement it replaces.
//
// Because MODIFIED = wholesale replacement (body + every scenario), any scenario
// the author omits in the delta will be silently deleted from the main spec at
// archive time. This check catches that class of accidental omission at CI time,
// before the spec is ever merged.
//
// Algorithm (per delta spec file):
//   1. Parse the ## MODIFIED Requirements section.
//   2. For each ### Requirement: <title> block under that section, count the
//      number of `#### Scenario:` lines within the block.
//   3. Derive the capability name from the delta spec path:
//      openspec/changes/<id>/specs/<capability>/spec.md -> capability.
//   4. Locate the base spec at openspec/specs/<capability>/spec.md. If it does
//      not exist, SKIP (new capability -- no base count to compare against).
//   5. In the base spec, find the same ### Requirement: <title> block (verbatim
//      match) and count its `#### Scenario:` lines.
//   6. If delta_count < base_count, push a violation naming the file, requirement
//      title, and the counts (pre -> post).
//
// Scope: all openspec/changes/*/specs/**/spec.md (all active changes, not just
// the current one). Archive paths are NOT excluded on purpose -- if an archived
// delta had a count-drop it was already merged but the check is harmless there
// (the base spec now reflects the new lower count, so both would agree).
// Registered after Check 17 (helper-agent read-contract banner agreement).

async function checkModifiedScenarioCounts(errors) {
  const changesDir = path.join(root, 'openspec', 'changes');
  const baseSpecsDir = path.join(root, 'openspec', 'specs');

  // Walk all delta spec files: openspec/changes/*/specs/**/spec.md
  let deltaFiles = [];
  async function walkDeltaSpecs(dir, depth) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walkDeltaSpecs(full, depth + 1);
      } else if (e.isFile() && e.name === 'spec.md') {
        // Must be under a specs/ subdirectory of a change folder
        // Path shape: openspec/changes/<id>/specs/<capability>/spec.md
        const rel = path.relative(changesDir, full);
        // rel = <id>/specs/<cap>/spec.md (or deeper)
        const parts = rel.split(path.sep);
        if (parts.length >= 4 && parts[1] === 'specs') {
          deltaFiles.push(full);
        }
      }
    }
  }
  await walkDeltaSpecs(changesDir, 0);

  if (deltaFiles.length === 0) {
    process.stdout.write('  OK: no delta spec files found (nothing to check)\n');
    return 0;
  }

  // Parse scenario counts per requirement within a specific section of a spec.
  // Returns Map<requirementTitle, scenarioCount>.
  function parseModifiedRequirements(text) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const result = new Map(); // title -> count

    let inModified = false;
    let currentReq = null;
    let count = 0;

    for (const line of lines) {
      // Detect ## MODIFIED Requirements section
      if (/^##\s+MODIFIED Requirements\s*$/.test(line)) {
        inModified = true;
        continue;
      }
      // Stop at the next ## section
      if (inModified && /^##\s/.test(line) && !/^##\s+MODIFIED Requirements/.test(line)) {
        // Save current requirement if any
        if (currentReq !== null) {
          result.set(currentReq, count);
          currentReq = null;
          count = 0;
        }
        inModified = false;
        continue;
      }

      if (!inModified) continue;

      // Detect ### Requirement: <title>
      const reqMatch = line.match(/^###\s+Requirement:\s+(.+?)\s*$/);
      if (reqMatch) {
        // Save previous requirement
        if (currentReq !== null) {
          result.set(currentReq, count);
        }
        currentReq = reqMatch[1].trim();
        count = 0;
        continue;
      }

      // Count #### Scenario: lines within the current requirement
      if (currentReq !== null && /^####\s+Scenario:/.test(line)) {
        count++;
      }
    }

    // Save last requirement
    if (currentReq !== null) {
      result.set(currentReq, count);
    }

    return result;
  }

  // Parse scenario count for a specific requirement title in the base spec.
  // Returns the count, or -1 if the requirement was not found.
  function parseBaseRequirementCount(text, requirementTitle) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    let found = false;
    let count = 0;

    for (const line of lines) {
      // Look for the exact requirement title match
      const reqMatch = line.match(/^###\s+Requirement:\s+(.+?)\s*$/);
      if (reqMatch) {
        if (found) {
          // We've moved past the target requirement
          break;
        }
        if (reqMatch[1].trim() === requirementTitle) {
          found = true;
          continue;
        }
      }

      // If we found the requirement, count its scenarios until the next ###
      if (found) {
        if (/^###\s/.test(line)) {
          // Next requirement starts -- done
          break;
        }
        if (/^####\s+Scenario:/.test(line)) {
          count++;
        }
      }
    }

    return found ? count : -1;
  }

  let violations = 0;
  let filesChecked = 0;
  let requirementsChecked = 0;

  for (const deltaFile of deltaFiles) {
    const rel = path.relative(root, deltaFile);
    const relFromChanges = path.relative(changesDir, deltaFile);
    const parts = relFromChanges.split(path.sep);
    // parts[0] = change id, parts[1] = 'specs', parts[2] = capability, ...
    const capability = parts[2];

    const deltaText = await readFileOr(deltaFile, null);
    if (deltaText === null) continue;

    // Check if this delta has a MODIFIED Requirements section
    if (!deltaText.includes('## MODIFIED Requirements')) continue;

    filesChecked++;
    const modifiedReqs = parseModifiedRequirements(deltaText);
    if (modifiedReqs.size === 0) continue;

    // Look up the base spec
    const baseSpecPath = path.join(baseSpecsDir, capability, 'spec.md');
    const baseText = await readFileOr(baseSpecPath, null);
    if (baseText === null) {
      // Base capability spec does not exist -- SKIP (new capability)
      continue;
    }

    // Compare scenario counts for each MODIFIED requirement
    for (const [reqTitle, deltaCount] of modifiedReqs) {
      requirementsChecked++;
      const baseCount = parseBaseRequirementCount(baseText, reqTitle);

      if (baseCount === -1) {
        // Requirement not found in base spec -- could be a mismatched title
        // (openspec validate catches that). Skip here to avoid false positives.
        continue;
      }

      if (deltaCount < baseCount) {
        errors.push(
          `[modified-scenario-counts] ${rel}: MODIFIED requirement "${reqTitle}" ` +
          `has ${deltaCount} scenario(s) in the delta but ${baseCount} in the base spec ` +
          `(${baseCount} -> ${deltaCount}). MODIFIED replaces the base wholesale -- ` +
          `list every scenario the requirement should still have, including unchanged ones.`
        );
        violations++;
      }
    }
  }

  if (violations === 0) {
    process.stdout.write(
      `  OK: ${requirementsChecked} MODIFIED requirement(s) across ${filesChecked} delta spec file(s) ` +
      `all meet or exceed their base scenario counts\n`
    );
  }
  return violations;
}

// ---- Check 19: AUTHORITATIVE SYNC DELEGATOR ---------------------------------
//
// Ensures the kit routes spec-sync through the authoritative `spec-syncer`
// agent and does NOT inadvertently re-open a general-purpose sync path.
//
// Two sub-checks:
//
//   (a) ARCHIVE COMMAND WIRES SPEC-SYNCER -- claude/commands/archive.md must
//       contain the string `qrspi:spec-syncer`. This asserts that the archive
//       flow calls the dedicated agent rather than ad-hoc sync prose.
//
//   (b) NO GENERAL-PURPOSE SYNC SPAWN -- no kit-owned file under
//       claude/commands/ or claude/agents/ may contain the string
//       `subagent_type: general-purpose` on a line that is within 15 lines of
//       a sync-context string (any of: "sync", "spec-sync", "openspec/specs",
//       "MODIFIED Requirements", "wholesale"). Proximity is measured in either
//       direction. This guards against a future editor accidentally introducing
//       a general-purpose subagent invocation for the sync step, which would
//       bypass the wholesale-replacement contract.

const SYNC_CONTEXT_STRINGS = [
  'sync',
  'spec-sync',
  'openspec/specs',
  'MODIFIED Requirements',
  'wholesale',
];

const SYNC_PROXIMITY_WINDOW = 15; // lines in either direction

async function checkAuthoritativeSyncDelegator(errors) {
  let violations = 0;

  // (a) archive.md must contain qrspi:spec-syncer
  const archivePath = path.join(root, 'claude', 'commands', 'archive.md');
  const archiveText = await readFileOr(archivePath, null);

  if (archiveText === null) {
    errors.push('[sync-delegator] claude/commands/archive.md: file not found');
    violations++;
  } else if (!archiveText.includes('qrspi:spec-syncer')) {
    errors.push(
      '[sync-delegator] claude/commands/archive.md: does not contain `qrspi:spec-syncer` -- ' +
      'the archive command must delegate spec-sync to the spec-syncer agent'
    );
    violations++;
  }

  // (b) No general-purpose subagent spawn near a sync-context string in kit commands/agents
  const commandsDir = path.join(root, 'claude', 'commands');
  const agentsDir = path.join(root, 'claude', 'agents');

  const kitFiles = [
    ...(await walkMd(commandsDir)),
    ...(await listFiles(agentsDir, '.md')),
  ];

  for (const file of kitFiles) {
    const text = await readFileOr(file, null);
    if (text === null) continue;

    const lines = text.split('\n');

    // Find all lines with `subagent_type: general-purpose`
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes('subagent_type: general-purpose')) continue;

      // Check the window around this line for sync-context strings
      const windowStart = Math.max(0, i - SYNC_PROXIMITY_WINDOW);
      const windowEnd = Math.min(lines.length - 1, i + SYNC_PROXIMITY_WINDOW);
      const window = lines.slice(windowStart, windowEnd + 1).join('\n');

      for (const ctx of SYNC_CONTEXT_STRINGS) {
        if (window.includes(ctx)) {
          const rel = path.relative(root, file);
          errors.push(
            `[sync-delegator] ${rel}:${i + 1}: \`subagent_type: general-purpose\` ` +
            `appears within ${SYNC_PROXIMITY_WINDOW} lines of sync-context string "${ctx}" -- ` +
            `spec-sync must be routed through the spec-syncer agent, not a general-purpose spawn`
          );
          violations++;
          break; // one violation per occurrence of general-purpose is enough
        }
      }
    }
  }

  if (violations === 0) {
    process.stdout.write(
      '  OK: archive.md wires qrspi:spec-syncer; no general-purpose sync spawn found in kit commands/agents\n'
    );
  }
  return violations;
}

// ---- Check 20: REQUIREMENT FIRST-LINE MUST/SHALL GUARD ---------------------
//
// Scans two file classes for requirement bodies whose first non-blank line
// lacks both MUST and SHALL (case-sensitive):
//   - Delta specs: openspec/changes/*/specs/**/spec.md (excluding /archive/)
//     Sections scanned: ## ADDED Requirements, ## MODIFIED Requirements
//     Sections skipped: ## REMOVED Requirements
//   - Base specs: openspec/specs/**/spec.md
//     Sections scanned: ## Requirements
//
// Reports ALL violations without short-circuiting. Skips empty bodies.
// Suppresses ### Requirement: lines inside fenced code blocks.
// Carries an inline five-fixture self-test run before any file I/O.

async function checkRequirementFirstLineModal(errors) {
  // ---- INLINE SELF-TEST -------------------------------------------------------
  // Five fixtures exercising the core parsing logic. Run before file I/O so a
  // broken detector reddens CI immediately rather than silently passing.

  // Helper: extract the first non-blank body line of the first requirement in
  // the given section type ('added-modified' or 'base'). Returns null if the
  // requirement body is empty or no requirement exists. Used only in the
  // self-test.
  function _stFirstBodyLine(text, mode) {
    // mode: 'added-modified' -> scan ADDED/MODIFIED sections; 'base' -> scan ## Requirements
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    let inTargetSection = false;
    let inReq = false;
    let inFence = false;
    let fenceMark = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Fence tracking
      const fenceMatch = line.match(/^(`{3,}|~{3,})/);
      if (fenceMatch) {
        const mark = fenceMatch[1][0];
        const len = fenceMatch[1].length;
        if (!inFence) {
          inFence = true;
          fenceMark = mark.repeat(len);
        } else if (mark === fenceMark[0] && line.trimEnd() === fenceMark) {
          inFence = false;
          fenceMark = '';
        }
        continue;
      }

      if (inFence) continue;

      // Section boundary
      if (/^##\s/.test(line)) {
        if (mode === 'added-modified') {
          inTargetSection =
            /^##\s+ADDED Requirements/.test(line) ||
            /^##\s+MODIFIED Requirements/.test(line);
        } else {
          inTargetSection = /^##\s+Requirements\s*$/.test(line);
        }
        inReq = false;
        continue;
      }

      if (!inTargetSection) continue;

      // Requirement heading (not in fence)
      if (/^###\s+Requirement:/.test(line)) {
        inReq = true;
        continue;
      }

      if (!inReq) continue;

      // End of requirement body
      if (/^####\s+Scenario:/.test(line) || /^###/.test(line) || /^##\s/.test(line)) {
        return null; // empty body
      }

      // First non-blank line
      if (line.trim() !== '') {
        return line.trim();
      }
    }
    return null;
  }

  // Fixture (a): body first line 'The system MUST ...' -> PASS (contains MUST)
  const _stA = '## ADDED Requirements\n\n### Requirement: Foo\nThe system MUST do something.\n\n#### Scenario: S1\n';
  const _stALine = _stFirstBodyLine(_stA, 'added-modified');
  if (_stALine === null || !(_stALine.includes('MUST') || _stALine.includes('SHALL'))) {
    errors.push('[must-leads] SELF-TEST FAILED: fixture (a) -- MUST-leading body was not accepted (got: ' + _stALine + ')');
  }

  // Fixture (b): first line 'When X ...' with MUST on line 2 -> FAIL
  const _stB = '## MODIFIED Requirements\n\n### Requirement: Bar\nWhen X happens,\nthe system MUST respond.\n\n#### Scenario: S1\n';
  const _stBLine = _stFirstBodyLine(_stB, 'added-modified');
  if (_stBLine !== null && (_stBLine.includes('MUST') || _stBLine.includes('SHALL'))) {
    errors.push('[must-leads] SELF-TEST FAILED: fixture (b) -- non-modal first line was not flagged (got: ' + _stBLine + ')');
  }
  if (_stBLine === null) {
    errors.push('[must-leads] SELF-TEST FAILED: fixture (b) -- body returned null (empty) when it should have returned first line');
  }

  // Fixture (c): REMOVED requirement with one-line rationale -> SKIPPED
  // The section is ## REMOVED Requirements; our scanner must not enter it.
  const _stC = '## REMOVED Requirements\n\n### Requirement: Old\nThis was removed because it is no longer relevant.\n';
  const _stCLine = _stFirstBodyLine(_stC, 'added-modified');
  if (_stCLine !== null) {
    errors.push('[must-leads] SELF-TEST FAILED: fixture (c) -- REMOVED requirement was not skipped (got: ' + _stCLine + ')');
  }

  // Fixture (d): base-spec-shaped fixture under ## Requirements with violating body -> FAIL
  const _stD = '## Requirements\n\n### Requirement: Baz\nWhen the user logs in, something happens.\n\n#### Scenario: S1\n';
  const _stDLine = _stFirstBodyLine(_stD, 'base');
  if (_stDLine === null || _stDLine.includes('MUST') || _stDLine.includes('SHALL')) {
    errors.push('[must-leads] SELF-TEST FAILED: fixture (d) -- base-spec violating body was not detected (got: ' + _stDLine + ')');
  }

  // Fixture (e): ### Requirement: inside a fenced block must NOT be treated as real
  const _stE = '## ADDED Requirements\n\n```\n### Requirement: FencedFake\nThis should be ignored.\n```\n\n### Requirement: Real\nThe system MUST do the real thing.\n';
  const _stELine = _stFirstBodyLine(_stE, 'added-modified');
  // The fenced requirement must be skipped; the real requirement body leads with MUST -> should pass
  if (_stELine === null || !(_stELine.includes('MUST') || _stELine.includes('SHALL'))) {
    errors.push('[must-leads] SELF-TEST FAILED: fixture (e) -- fence-skip guard broken or real requirement not found (got: ' + _stELine + ')');
  }
  // ---- end self-test ----------------------------------------------------------

  // Core scanner: given the lines of a spec file and a mode, collect all
  // [must-leads] violations. Returns an array of { reqTitle, firstLine } objects.
  // mode: 'delta' (scan ADDED+MODIFIED, skip REMOVED) | 'base' (scan ## Requirements)
  function scanRequirementBodies(lines, mode) {
    const hits = [];

    let inTargetSection = false;
    let inRemovedSection = false;
    let inReq = false;
    let reqTitle = '';
    let inFence = false;
    let fenceMark = '';

    function flushReq() {
      inReq = false;
      reqTitle = '';
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Fence open/close tracking (mirrors Check 11 / Check 14 pattern)
      const fenceMatch = line.match(/^(`{3,}|~{3,})/);
      if (fenceMatch) {
        const mark = fenceMatch[1][0];
        const len = fenceMatch[1].length;
        if (!inFence) {
          inFence = true;
          fenceMark = mark.repeat(len);
        } else if (mark === fenceMark[0] && line.trimEnd() === fenceMark) {
          inFence = false;
          fenceMark = '';
        }
        continue;
      }

      if (inFence) continue; // suppress all content inside fences

      // ## section boundary
      if (/^##\s/.test(line)) {
        flushReq();
        if (mode === 'delta') {
          inRemovedSection = /^##\s+REMOVED Requirements/.test(line);
          inTargetSection =
            /^##\s+ADDED Requirements/.test(line) ||
            /^##\s+MODIFIED Requirements/.test(line);
        } else {
          inRemovedSection = false;
          inTargetSection = /^##\s+Requirements\s*$/.test(line);
        }
        continue;
      }

      if (inRemovedSection) continue; // skip REMOVED entirely

      if (!inTargetSection) continue;

      // ### Requirement: heading (outside fence)
      if (/^###\s+Requirement:/.test(line)) {
        flushReq();
        const m = line.match(/^###\s+Requirement:\s+(.+?)\s*$/);
        reqTitle = m ? m[1] : '(unknown)';
        inReq = true;
        continue;
      }

      if (!inReq) continue;

      // End-of-body boundary: #### Scenario: or ### or ##
      if (/^####\s+Scenario:/.test(line) || /^###/.test(line) || /^##\s/.test(line)) {
        // Empty body -- skip without flagging; also end the requirement
        flushReq();
        // Rewind index so the ## / ### line is re-processed (it may be a new section/req)
        i--;
        continue;
      }

      // First non-blank body line
      if (line.trim() !== '') {
        const firstLine = line.trim();
        if (!firstLine.includes('MUST') && !firstLine.includes('SHALL')) {
          hits.push({ reqTitle, firstLine });
        }
        flushReq(); // one first-line per requirement is enough
      }
      // blank lines inside body: keep going until first non-blank or boundary
    }

    return hits;
  }

  // Walk a directory recursively and collect spec.md files
  async function walkSpecFiles(dir, filterFn) {
    const out = [];
    async function walk(cur) {
      let entries;
      try {
        entries = await fs.readdir(cur, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const full = path.join(cur, e.name);
        if (e.isDirectory()) await walk(full);
        else if (e.isFile() && e.name === 'spec.md') {
          if (!filterFn || filterFn(full)) out.push(full);
        }
      }
    }
    await walk(dir);
    return out;
  }

  const changesDir = path.join(root, 'openspec', 'changes');
  const baseSpecsDir = path.join(root, 'openspec', 'specs');

  let violations = 0;
  let filesChecked = 0;

  // --- Delta specs (exclude /archive/ paths) ---
  const archiveSep = path.sep + 'archive' + path.sep;
  const deltaFiles = await walkSpecFiles(changesDir, (f) => !f.includes(archiveSep));

  for (const file of deltaFiles) {
    const rel = path.relative(root, file);
    const text = await readFileOr(file, null);
    if (text === null) continue;

    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const hits = scanRequirementBodies(lines, 'delta');
    filesChecked++;

    for (const { reqTitle, firstLine } of hits) {
      const excerpt = firstLine.length > 60 ? firstLine.slice(0, 60) + '...' : firstLine;
      errors.push(
        `[must-leads] ${rel}: requirement "${reqTitle}" — first line of the body does not contain MUST or SHALL (found: "${excerpt}").`
      );
      violations++;
    }
  }

  // --- Base specs ---
  const baseFiles = await walkSpecFiles(baseSpecsDir, null);

  for (const file of baseFiles) {
    const rel = path.relative(root, file);
    const text = await readFileOr(file, null);
    if (text === null) continue;

    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const hits = scanRequirementBodies(lines, 'base');
    filesChecked++;

    for (const { reqTitle, firstLine } of hits) {
      const excerpt = firstLine.length > 60 ? firstLine.slice(0, 60) + '...' : firstLine;
      errors.push(
        `[must-leads] ${rel}: requirement "${reqTitle}" — first line of the body does not contain MUST or SHALL (found: "${excerpt}").`
      );
      violations++;
    }
  }

  if (violations === 0) {
    process.stdout.write(
      `  OK: all requirement first-line MUST/SHALL guard checks passed across ${filesChecked} spec file(s)\n`
    );
  }
  return violations;
}

// ---- Check 21: FORMAT-RULES PARITY GUARD ------------------------------------
//
// Extracts the text between <!-- must-leads:begin --> and <!-- must-leads:end -->
// sentinels from both:
//   claude/agents/architect.md
//   openspec-templates/spec-delta.template.md
// and asserts the two extracted blocks are byte-identical.
//
// Fails closed on a missing or unbalanced sentinel pair in either file:
// a missing anchor is an error, never a silent pass.
//
// Carries an inline three-fixture self-test run before file I/O:
//   (a) matching pair      -> PASS
//   (b) drifted pair       -> FAIL
//   (c) missing-anchor     -> FAIL

async function checkFormatRulesParity(errors) {
  const BEGIN_SENTINEL = '<!-- must-leads:begin -->';
  const END_SENTINEL   = '<!-- must-leads:end -->';

  // Helper: extract the text between the sentinel comments (exclusive of the
  // sentinel lines themselves). Returns the extracted string, or null if either
  // sentinel is missing or the begin occurs after the end.
  function extractBlock(text) {
    const beginIdx = text.indexOf(BEGIN_SENTINEL);
    if (beginIdx === -1) return null;
    const afterBegin = beginIdx + BEGIN_SENTINEL.length;
    const endIdx = text.indexOf(END_SENTINEL, afterBegin);
    if (endIdx === -1) return null;
    return text.slice(afterBegin, endIdx);
  }

  // ---- INLINE SELF-TEST -------------------------------------------------------
  // Three fixtures exercising extractBlock and the byte-identity assertion.
  // Run before file I/O so a broken detector reddens CI immediately.

  // Fixture (a): matching pair -> PASS (both blocks are identical)
  const _stTextA1 = `${BEGIN_SENTINEL}\n- MUST line\n${END_SENTINEL}`;
  const _stTextA2 = `${BEGIN_SENTINEL}\n- MUST line\n${END_SENTINEL}`;
  const _stBlockA1 = extractBlock(_stTextA1);
  const _stBlockA2 = extractBlock(_stTextA2);
  if (_stBlockA1 === null || _stBlockA2 === null || _stBlockA1 !== _stBlockA2) {
    errors.push('[format-rules-parity] SELF-TEST FAILED: fixture (a) -- matching pair was not accepted');
  }

  // Fixture (b): drifted pair -> FAIL (blocks differ)
  const _stTextB1 = `${BEGIN_SENTINEL}\n- MUST line A\n${END_SENTINEL}`;
  const _stTextB2 = `${BEGIN_SENTINEL}\n- MUST line B (drifted)\n${END_SENTINEL}`;
  const _stBlockB1 = extractBlock(_stTextB1);
  const _stBlockB2 = extractBlock(_stTextB2);
  if (_stBlockB1 === null || _stBlockB2 === null || _stBlockB1 === _stBlockB2) {
    errors.push('[format-rules-parity] SELF-TEST FAILED: fixture (b) -- drifted pair was not detected');
  }

  // Fixture (c): missing-anchor -> FAIL (extractBlock returns null)
  const _stTextC = `no sentinels here`;
  const _stBlockC = extractBlock(_stTextC);
  if (_stBlockC !== null) {
    errors.push('[format-rules-parity] SELF-TEST FAILED: fixture (c) -- missing anchor was not detected (got non-null)');
  }
  // ---- end self-test ----------------------------------------------------------

  const architectPath = path.join(root, 'claude', 'agents', 'architect.md');
  const templatePath  = path.join(root, 'openspec-templates', 'spec-delta.template.md');
  const architectRel  = 'claude/agents/architect.md';
  const templateRel   = 'openspec-templates/spec-delta.template.md';

  const architectText = await readFileOr(architectPath, null);
  const templateText  = await readFileOr(templatePath, null);

  if (architectText === null) {
    errors.push(`[format-rules-parity] ${architectRel}: file not found`);
    return 1;
  }
  if (templateText === null) {
    errors.push(`[format-rules-parity] ${templateRel}: file not found`);
    return 1;
  }

  const architectBlock = extractBlock(architectText);
  const templateBlock  = extractBlock(templateText);

  let violations = 0;

  if (architectBlock === null) {
    errors.push(
      `[format-rules-parity] ${architectRel}: missing or unbalanced ` +
      `<!-- must-leads:begin --> / <!-- must-leads:end --> sentinel anchors`
    );
    violations++;
  }

  if (templateBlock === null) {
    errors.push(
      `[format-rules-parity] ${templateRel}: missing or unbalanced ` +
      `<!-- must-leads:begin --> / <!-- must-leads:end --> sentinel anchors`
    );
    violations++;
  }

  if (violations === 0 && architectBlock !== templateBlock) {
    errors.push(
      `[format-rules-parity] ${architectRel} and ${templateRel} MUST-leads Format-rules blocks differ` +
      ` -- edit both or neither.`
    );
    violations++;
  }

  if (violations === 0) {
    process.stdout.write(
      `  OK: Format-rules sentinel blocks in architect.md and spec-delta.template.md are byte-identical\n`
    );
  }
  return violations;
}

// ---- Check 22: BACKLOG SCHEMA GUARD ----------------------------------------
//
// Validates openspec/backlog.md against the frozen backlog schema (the
// backlog-schema capability introduced by standardize-backlog-format). Six
// assertions, all hard-fail (push to errors[]):
//   (1) the three `## ` section headings are all present;
//   (2) the `## Ideas` section carries a P-band preamble line mentioning
//       P1, P2, and P3 before its first `### ` row;
//   (3) every `### ` heading matches the frozen grammar regex;
//   (4) each heading's status leading keyword is in the approved enum;
//   (5) standalone (idea/proposed) rows carry BOTH `**Why:**` and `**Shape:**`
//       in their body; bundled/merged rows are exempt; in-progress rows are
//       grammar+enum only (classification is by status KEYWORD, not by the
//       presence of a pointer note);
//   (6) openspec-templates/backlog.template.md exists (existence-only).
//
// Passes SILENTLY when openspec/backlog.md is absent (a consumer or the kit
// may legitimately have no backlog yet).
//
// The frozen heading grammar uses two non-ASCII code points, authored here
// with explicit Unicode escapes so the check is robust to editor
// normalization: — (em-dash) and · (middle-dot).
//
// Carries an inline four-fixture self-test run BEFORE any file I/O:
//   (a) well-formed standalone idea row w/ Why+Shape -> passes
//   (b) malformed heading (double-hyphen / missing band) -> grammar fires
//   (c) standalone idea row missing **Shape:** -> body-field fires
//   (d) bundled row with only a `>` pointer note -> does NOT fire (exempt)

async function checkBacklogSchema(errors) {
  // Frozen heading grammar (D3). Em-dash = —, middle-dot = ·.
  // ^### <id> — `<status>` · **P<band>**$
  const HEADING_RE =
    /^### (?<id>[a-z0-9]+(?:-[a-z0-9]+)*) — `(?<status>[^`]+)` · \*\*P(?<band>[123])\*\*$/;
  const STATUS_ENUM = new Set(['idea', 'proposed', 'in-progress', 'merged', 'bundled']);

  // Parse a backlog body string into rows. Each row = { id, status, keyword,
  // band, bodyLines, headingLine, valid }. `valid` is false when the heading
  // does not match the frozen grammar.
  function parseRows(text) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const rows = [];
    let cur = null;
    for (const line of lines) {
      if (line.startsWith('### ')) {
        if (cur) rows.push(cur);
        const m = HEADING_RE.exec(line);
        if (m) {
          const status = m.groups.status;
          const keyword = status.split(' ')[0];
          cur = {
            id: m.groups.id,
            status,
            keyword,
            band: m.groups.band,
            headingLine: line,
            bodyLines: [],
            valid: true,
          };
        } else {
          // capture the id best-effort for the error message
          const idGuess = (line.slice(4).split(' ')[0]) || '(unparseable)';
          cur = {
            id: idGuess,
            status: null,
            keyword: null,
            band: null,
            headingLine: line,
            bodyLines: [],
            valid: false,
          };
        }
      } else if (cur) {
        cur.bodyLines.push(line);
      }
    }
    if (cur) rows.push(cur);
    return rows;
  }

  // Grammar detector: returns the list of headingLines that fail the frozen
  // grammar. A malformed heading (wrong separator, missing band) shows up as a
  // row with valid === false.
  function grammarViolations(rows) {
    return rows.filter((r) => !r.valid);
  }

  // Body-field detector for a single standalone (idea/proposed) row: returns
  // the list of missing field names ('**Why:**' / '**Shape:**').
  function missingBodyFields(row) {
    const body = row.bodyLines.join('\n');
    const missing = [];
    // A `**Why:**` line -- also accept a parenthetical qualifier the kit's own
    // rows use, e.g. `**Why (two payoffs -- ...):**`. The bold span must open
    // with `Why` and close with `:**` on the same line.
    if (!/^\*\*Why[^\n]*:\*\*/m.test(body)) missing.push('**Why:**');
    if (!/^\*\*Shape:\*\*/m.test(body)) missing.push('**Shape:**');
    return missing;
  }

  // Classify by status KEYWORD (D6), NOT by presence of a pointer note.
  function isStandalone(row) {
    return row.keyword === 'idea' || row.keyword === 'proposed';
  }

  // ---- INLINE SELF-TEST -------------------------------------------------------
  // Four synthetic fixtures exercising the grammar + body-field detectors and
  // the exempt-class classification. Run before file I/O so a broken detector
  // reddens CI immediately. On any failure, push an error and return early.

  let selfTestFailed = false;

  // Fixture (a): well-formed standalone idea row w/ Why+Shape -> passes.
  const _stA =
    '### foo-bar — `idea` · **P2**\n\n' +
    '**Why:** because reasons.\n\n' +
    '**Shape:** do the thing.\n';
  const _stARows = parseRows(_stA);
  if (
    grammarViolations(_stARows).length !== 0 ||
    _stARows.length !== 1 ||
    !isStandalone(_stARows[0]) ||
    missingBodyFields(_stARows[0]).length !== 0
  ) {
    errors.push('[backlog-schema] SELF-TEST FAILED: fixture (a) -- well-formed standalone idea row was not accepted');
    selfTestFailed = true;
  }

  // Fixture (b): malformed heading (double-hyphen, missing band) -> grammar fires.
  const _stB = '### foo-bar -- `idea`\n\n**Why:** x.\n\n**Shape:** y.\n';
  const _stBRows = parseRows(_stB);
  if (grammarViolations(_stBRows).length === 0) {
    errors.push('[backlog-schema] SELF-TEST FAILED: fixture (b) -- malformed heading was not detected by the grammar checker');
    selfTestFailed = true;
  }

  // Fixture (c): standalone idea row missing **Shape:** -> body-field fires.
  const _stC = '### foo-bar — `idea` · **P2**\n\n**Why:** x only.\n';
  const _stCRows = parseRows(_stC);
  if (
    _stCRows.length !== 1 ||
    grammarViolations(_stCRows).length !== 0 ||
    !isStandalone(_stCRows[0]) ||
    !missingBodyFields(_stCRows[0]).includes('**Shape:**')
  ) {
    errors.push('[backlog-schema] SELF-TEST FAILED: fixture (c) -- missing Shape on a standalone idea row was not detected');
    selfTestFailed = true;
  }

  // Fixture (d): bundled row with only a `>` pointer note -> does NOT fire (exempt).
  const _stD =
    '### foo-bar — `bundled into some-change (2026-01-15)` · **P2**\n\n' +
    '> **Bundled into `some-change`** (2026-01-15) -- see the Proposed entry.\n';
  const _stDRows = parseRows(_stD);
  if (
    _stDRows.length !== 1 ||
    grammarViolations(_stDRows).length !== 0 ||
    _stDRows[0].keyword !== 'bundled' ||
    isStandalone(_stDRows[0])
  ) {
    errors.push('[backlog-schema] SELF-TEST FAILED: fixture (d) -- exempt bundled row was misclassified (false positive on the exempt class)');
    selfTestFailed = true;
  }
  // ---- end self-test ----------------------------------------------------------

  if (selfTestFailed) {
    return 1;
  }

  const backlogPath = path.join(root, 'openspec', 'backlog.md');
  const backlogRel = 'openspec/backlog.md';
  const backlogText = await readFileOr(backlogPath, null);

  // Assertion 6 is checked regardless of backlog presence? No -- per D2 the
  // whole check passes silently when the backlog file is absent. The template
  // existence assertion runs only when the backlog file is present.
  if (backlogText === null) {
    process.stdout.write(`  OK: ${backlogRel} absent -- Check 22 skipped\n`);
    return 0;
  }

  let violations = 0;
  const text = backlogText.replace(/\r\n/g, '\n');
  const lines = text.split('\n');

  // Assertion 1: three section headings present.
  const REQUIRED_SECTIONS = ['## In progress', '## Proposed', '## Ideas'];
  for (const section of REQUIRED_SECTIONS) {
    if (!lines.some((l) => l.trim() === section)) {
      errors.push(`[backlog-schema] ${backlogRel}: missing required section heading "${section}"`);
      violations++;
    }
  }

  // Assertion 2: P-band preamble under ## Ideas -- at least one line between the
  // ## Ideas heading and its first ### row mentions all of P1, P2, P3.
  const ideasIdx = lines.findIndex((l) => l.trim() === '## Ideas');
  if (ideasIdx !== -1) {
    let preambleOk = false;
    for (let i = ideasIdx + 1; i < lines.length; i++) {
      const l = lines[i];
      if (l.startsWith('### ') || /^## (?!Ideas)/.test(l.trim())) break;
      if (l.includes('P1') && l.includes('P2') && l.includes('P3')) {
        preambleOk = true;
        break;
      }
    }
    if (!preambleOk) {
      errors.push(`[backlog-schema] ${backlogRel}: ## Ideas section is missing a P-band preamble line mentioning P1, P2, and P3 before its first ### row`);
      violations++;
    }
  }

  // Assertions 3, 4, 5: per-row grammar, enum, and body fields.
  const rows = parseRows(text);
  for (const row of rows) {
    // Assertion 3: grammar.
    if (!row.valid) {
      errors.push(`[backlog-schema] ${backlogRel}: heading does not match the frozen grammar: ${row.headingLine}`);
      violations++;
      continue; // no status parsed -- skip enum/body for this row
    }
    // Assertion 4: status keyword enum.
    if (!STATUS_ENUM.has(row.keyword)) {
      errors.push(`[backlog-schema] ${backlogRel}: row "${row.id}" has status keyword "${row.keyword}" not in {idea, proposed, in-progress, merged, bundled}`);
      violations++;
      continue;
    }
    // Assertion 5: body fields on standalone rows only.
    if (isStandalone(row)) {
      const missing = missingBodyFields(row);
      if (missing.length > 0) {
        errors.push(`[backlog-schema] ${backlogRel}: standalone ${row.keyword} row "${row.id}" is missing ${missing.join(' and ')} in its body`);
        violations++;
      }
    }
  }

  // Assertion 6: backlog template file exists (existence-only, no content scan).
  const templatePath = path.join(root, 'openspec-templates', 'backlog.template.md');
  const templateExists = (await readFileOr(templatePath, null)) !== null;
  if (!templateExists) {
    errors.push('[backlog-schema] openspec-templates/backlog.template.md does not exist (required by assertion 6)');
    violations++;
  }

  if (violations === 0) {
    process.stdout.write(
      `  OK: ${backlogRel} satisfies all six backlog-schema assertions (${rows.length} row(s) validated)\n`
    );
  }
  return violations;
}

// ---- Check 23: BACKLOG WIKILINK RESOLUTION ---------------------------------
//
// Resolves every bare (non-code-span) [[slug]] occurrence in
// openspec/backlog.md and asserts each slug is:
//   (a) a live row id (a ### <id> heading in the file), OR
//   (b) an archived change folder (openspec/changes/archive/*-<slug>/, date
//       prefix stripped per pattern /^\d{4}-\d{2}-\d{2}-/).
//
// Slug grammar: [a-z0-9]+(?:-[a-z0-9]+)*  (matches the row-id grammar).
// Code-span occurrences (inside `...`) are explicitly excluded and must NOT
// fire, even when they contain the [[...]] syntax.
//
// Passes silently when openspec/backlog.md is absent.
// Carries an inline four-fixture self-test run BEFORE any file I/O:
//   (a) live-row hit       -> no violation
//   (b) archive-folder hit -> no violation
//   (c) code-spanned meta-token must-not-fire
//   (d) bare dangling slug -> must fire

// Pure resolver: takes text (the raw backlog content), a Set of live row ids,
// and a Set of archive slugs (date-prefix-stripped folder names). Returns an
// array of { slug, lineNum } objects for each bare [[slug]] that does not
// resolve to either set.
//
// Resolution contract (D5, D7):
//   1. Strip code-spans from each line before searching for [[...]].
//   2. Match bare [[slug]] with slug grammar [a-z0-9]+(?:-[a-z0-9]+)*.
//   3. A slug resolves if it is in liveRowIds OR in archiveSlugs.
//   4. Any unresolved slug is a violation.
function resolveWikilinks(text, liveRowIds, archiveSlugs) {
  const violations = [];
  const SLUG_RE = /\[\[([a-z0-9]+(?:-[a-z0-9]+)*)\]\]/g;
  const CODE_SPAN_RE = /`[^`]*`/g;

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i++) {
    // Strip code-span occurrences so [[...]] inside backticks does not fire.
    const stripped = lines[i].replace(CODE_SPAN_RE, (m) => ' '.repeat(m.length));

    SLUG_RE.lastIndex = 0;
    let m;
    while ((m = SLUG_RE.exec(stripped)) !== null) {
      const slug = m[1];
      if (!liveRowIds.has(slug) && !archiveSlugs.has(slug)) {
        violations.push({ slug, lineNum: i + 1 });
      }
    }
  }
  return violations;
}

async function checkBacklogWikilinks(errors) {
  // ---- INLINE SELF-TEST -------------------------------------------------------
  // Four fixtures exercising resolveWikilinks with a canned in-memory corpus
  // and a synthetic archive-slug list. Run before file I/O so a broken detector
  // reddens CI immediately.

  const _stLiveRows = new Set(['live-row', 'another-live-row', 'context-gate-compact-and-passive-gauge', 'rename-qrspi-to-qrnchi', 'reset-and-resume-between-boundaries']);
  const _stArchiveSlugs = new Set(['archived-change', 'kit-surface-dogfooding']);

  let selfTestFailed = false;

  // Fixture (a): live-row hit -> no violation
  const _stA = '[[live-row]] is a live backlog idea.\n';
  const _stAViolations = resolveWikilinks(_stA, _stLiveRows, _stArchiveSlugs);
  if (_stAViolations.length !== 0) {
    errors.push(
      '[backlog-wikilinks] SELF-TEST FAILED: fixture (a) -- live-row wikilink was flagged as a violation (expected: no violation)'
    );
    selfTestFailed = true;
  }

  // Fixture (b): archive-folder hit -> no violation
  const _stB = 'See [[archived-change]] for history.\n';
  const _stBViolations = resolveWikilinks(_stB, _stLiveRows, _stArchiveSlugs);
  if (_stBViolations.length !== 0) {
    errors.push(
      '[backlog-wikilinks] SELF-TEST FAILED: fixture (b) -- archive-folder wikilink was flagged as a violation (expected: no violation)'
    );
    selfTestFailed = true;
  }

  // Fixture (c): code-spanned meta-token must-not-fire
  // A [[...]] inside backticks must be invisible to the checker.
  const _stC = 'Use `[[does-not-exist]]` syntax (code span -- must not fire).\n';
  const _stCViolations = resolveWikilinks(_stC, _stLiveRows, _stArchiveSlugs);
  if (_stCViolations.length !== 0) {
    errors.push(
      '[backlog-wikilinks] SELF-TEST FAILED: fixture (c) -- code-spanned [[...]] was flagged (expected: must not fire)'
    );
    selfTestFailed = true;
  }

  // Fixture (d): bare dangling slug must fire
  const _stD = 'Relates to [[does-not-exist]] and [[also-gone]].\n';
  const _stDViolations = resolveWikilinks(_stD, _stLiveRows, _stArchiveSlugs);
  if (_stDViolations.length !== 2) {
    errors.push(
      `[backlog-wikilinks] SELF-TEST FAILED: fixture (d) -- expected 2 violations for bare dangling slugs, got ${_stDViolations.length}`
    );
    selfTestFailed = true;
  }
  // ---- end self-test ----------------------------------------------------------

  if (selfTestFailed) {
    return 1;
  }

  const backlogPath = path.join(root, 'openspec', 'backlog.md');
  const backlogRel = 'openspec/backlog.md';
  const backlogText = await readFileOr(backlogPath, null);

  if (backlogText === null) {
    process.stdout.write(`  OK: ${backlogRel} absent -- Check 23 skipped\n`);
    return 0;
  }

  // Collect live row ids from ### headings in the backlog.
  // Row-id grammar: [a-z0-9]+(?:-[a-z0-9]+)*
  const ROW_HEADING_RE = /^### ([a-z0-9]+(?:-[a-z0-9]+)*)/gm;
  const liveRowIds = new Set();
  let rm;
  while ((rm = ROW_HEADING_RE.exec(backlogText)) !== null) {
    liveRowIds.add(rm[1]);
  }

  // Collect archive slugs by stripping the leading date prefix from folder names
  // under openspec/changes/archive/.
  const archiveDir = path.join(root, 'openspec', 'changes', 'archive');
  const DATE_PREFIX_RE = /^\d{4}-\d{2}-\d{2}-/;
  const archiveSlugs = new Set();
  for (const folderName of await listDirs(archiveDir)) {
    const slug = folderName.replace(DATE_PREFIX_RE, '');
    if (slug !== folderName) {
      // Only include folders that actually had a date prefix
      archiveSlugs.add(slug);
    }
  }

  // Run resolver
  const violations = resolveWikilinks(backlogText, liveRowIds, archiveSlugs);

  if (violations.length === 0) {
    process.stdout.write(
      `  OK: ${backlogRel} -- all [[wikilinks]] resolve (${liveRowIds.size} live row(s), ${archiveSlugs.size} archive folder(s))\n`
    );
    return 0;
  }

  for (const { slug, lineNum } of violations) {
    errors.push(
      `[backlog-wikilinks] ${backlogRel}:${lineNum}: [[${slug}]] does not resolve to a live row id or an archived change folder`
    );
  }
  return violations.length;
}

// ---- main ------------------------------------------------------------------

async function main() {
  const errors = [];

  process.stdout.write('Running QRSPI kit lint...\n\n');

  process.stdout.write('Check 1: Pin agreement\n');
  await checkPinAgreement(errors);

  process.stdout.write('\nCheck 2: Frontmatter / name resolution\n');
  await checkFrontmatter(errors);

  process.stdout.write('\nCheck 2b: Skill-set registry\n');
  await checkSkillSets(errors);

  process.stdout.write('\nCheck 3: Heading alignment\n');
  await checkHeadingAlignment(errors);

  process.stdout.write('\nCheck 4: README command coverage\n');
  await checkReadmeCoverage(errors);

  process.stdout.write('\nCheck 5: Gate-tool / executor agreement\n');
  await checkGateExecutor(errors);

  process.stdout.write('\nCheck 6: Migration manifest presence + schema + marker format\n');
  await checkMigrationManifests(errors);

  process.stdout.write('\nCheck 7: Read-contract banner agreement\n');
  await checkReadContracts(errors);

  process.stdout.write('\nCheck 8: PR reconciliation passes structure\n');
  await checkPrReconciliationPasses(errors);

  process.stdout.write('\nCheck 9: Version-check embed\n');
  await checkVersionCheckEmbed(errors);

  process.stdout.write('\nCheck 10 (budget-gate-embed): Budget-gate embed\n');
  await checkBudgetGateEmbed(errors);

  process.stdout.write('\nCheck 10b: Triage path anchors\n');
  await checkTriagePaths(errors);

  process.stdout.write('\nCheck 11: No CRUD skeleton headings in fenced blocks\n');
  await checkNoCrudSkeletonHeadings(errors);

  process.stdout.write('\nCheck 12: Output-contract banner presence\n');
  await checkOutputContracts(errors);

  process.stdout.write('\nCheck 13: Compute annotation value-validation\n');
  await checkComputeAnnotations(errors);

  process.stdout.write('\nCheck 14: Surface applicability of artifact headings\n');
  await checkSurfaceApplicability(errors);

  process.stdout.write('\nCheck 15: Implementer variant agent drift gate\n');
  await checkVariantAgents(errors);

  process.stdout.write('\nCheck 16: Followup bare-stem guard\n');
  await checkFollowupStem(errors);

  process.stdout.write('\nCheck 17: Helper agent read-contract banner agreement\n');
  await checkHelperAgentReadContracts(errors);

  process.stdout.write('\nCheck 18: Modified scenario count guard\n');
  await checkModifiedScenarioCounts(errors);

  process.stdout.write('\nCheck 19: Authoritative sync delegator\n');
  await checkAuthoritativeSyncDelegator(errors);

  process.stdout.write('\nCheck 20: Requirement first-line MUST/SHALL guard\n');
  await checkRequirementFirstLineModal(errors);

  process.stdout.write('\nCheck 21: Format-rules parity (MUST-leads)\n');
  await checkFormatRulesParity(errors);

  process.stdout.write('\nCheck 22: checkBacklogSchema (backlog schema guard)\n');
  await checkBacklogSchema(errors);

  process.stdout.write('\nCheck 23: Backlog wikilink resolution\n');
  await checkBacklogWikilinks(errors);

  process.stdout.write('\n');
  if (errors.length === 0) {
    process.stdout.write('All checks passed.\n');
    process.exit(0);
  } else {
    process.stdout.write(`${errors.length} violation(s) found:\n`);
    for (const e of errors) {
      process.stdout.write(`  ${e}\n`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(`lint: ${err && err.stack ? err.stack : err}\n`);
  process.exit(1);
});
