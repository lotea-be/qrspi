#!/usr/bin/env node
// ============================================================================
//  scripts/lint.mjs -- CI quality gate for the QRSPI kit
// ----------------------------------------------------------------------------
//  Checks (run in order, all errors collected before exit -- Checks 1-15):
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
//     and that each variant's `effort:` frontmatter value matches its stem suffix
//     (low/medium/high). Includes an inline self-test that must fire. Registered
//     after Check 14.
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
    process.stdout.write(`  OK: ${found.length} pin occurrence(s) all agree on v${versions[0]}\n`);
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
    const { front } = splitFront(text);
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
};

async function checkHeadingAlignment(errors) {
  const agentsDir = path.join(root, 'claude', 'agents');
  let violations = 0;

  for (const [templateFile, { agent: agentStem, headings: canonicalHeadings }] of Object.entries(TEMPLATE_CANONICAL_HEADINGS)) {
    if (canonicalHeadings.length === 0) {
      // Nothing to check for this template (dynamic format)
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
      }
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
import { SKILL_SET_EXPECTED } from './skill-sets.mjs';

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
  implementer: 'Reads: tasks.md.',
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
// Three sub-checks:
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
// INLINE SELF-TEST: a synthetic in-memory fixture is run through the step-1
// skill extractor to assert it correctly identifies a variant that loads only
// `implementer-core`. A second fixture with an extra skill asserts the
// detector fires. If either fails, an error is pushed so CI reddens
// immediately -- a broken detector never passes silently.
//
// SCOPE: strictly implementer-*.md files. The seven named stage agents
// (including implementer.md itself) are NOT covered here -- they are covered
// by Checks 7, 12, and 2b. Variants are deliberately outside those registries.

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

  if (violations === 0) {
    process.stdout.write(
      `  OK: ${IMPLEMENTER_VARIANTS.length} implementer variant agent(s) match the registry, step-1 load, and effort values\n`
    );
  }
  return violations;
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

  process.stdout.write('\nCheck 10: Triage path anchors\n');
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
