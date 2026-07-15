#!/usr/bin/env node
// ============================================================================
//  scripts/lint.mjs -- CI quality gate for the QRSPI kit
// ----------------------------------------------------------------------------
//  Checks (run in order, all errors collected before exit):
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
    path.join(root, 'copilot'),
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
      // Missing SKILL.md is warned by sync-copilot.mjs; note it here too
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
  // questions.template.md: the section structure in the skeleton is canonical
  'questions.template.md': {
    agent: 'questioner',
    headings: [
      '## Data model',
      '## Indexing & query performance',
      '## API',
      '## UI',
      '## Front-end state',
      '## Auth & authorization',
      '## Migrations & data',
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

  // Determine baseline: lowest version in migrations/ (if any)
  const validMigrationVersions = [...migratedVersions].filter((v) => SEMVER_RE.test(v));
  let baseline = null;
  if (validMigrationVersions.length > 0) {
    baseline = validMigrationVersions.sort(semverCmp)[0];
  }

  // Parse CHANGELOG.md for all ## [X.Y.Z] sections
  const changelog = await readFileOr(changelogPath, null);
  if (changelog === null) {
    errors.push('[migration] CHANGELOG.md not found -- cannot check manifest presence');
    subviolations++;
  } else {
    const changelogVersionRe = /^##\s+\[(\d+\.\d+\.\d+)\]/gm;
    const changelogVersions = [];
    let m;
    while ((m = changelogVersionRe.exec(changelog)) !== null) {
      changelogVersions.push(m[1]);
    }

    if (baseline !== null) {
      // Check each CHANGELOG version >= baseline
      for (const ver of changelogVersions) {
        if (semverCmp(ver, baseline) >= 0 && !migratedVersions.has(ver)) {
          errors.push(
            `[migration] Missing migration manifest: migrations/${ver}.yaml` +
            ` (CHANGELOG ## [${ver}] section requires an entry)`
          );
          subviolations++;
        }
      }
    }
    // If baseline is null (no migrations/ files at all), skip presence check --
    // this would mean migrations/ is empty, which is reported by (b) below only
    // if files exist. If no migration files exist at all, presence check is vacuously
    // satisfied (the feature hasn't shipped its first entry yet). However, the
    // migrations/ directory must exist and contain 0.6.0.yaml once this feature ships.
    // We enforce presence only where baseline is known.
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

// ---- main ------------------------------------------------------------------

async function main() {
  const errors = [];

  process.stdout.write('Running QRSPI kit lint...\n\n');

  process.stdout.write('Check 1: Pin agreement\n');
  await checkPinAgreement(errors);

  process.stdout.write('\nCheck 2: Frontmatter / name resolution\n');
  await checkFrontmatter(errors);

  process.stdout.write('\nCheck 3: Heading alignment\n');
  await checkHeadingAlignment(errors);

  process.stdout.write('\nCheck 4: README command coverage\n');
  await checkReadmeCoverage(errors);

  process.stdout.write('\nCheck 5: Gate-tool / executor agreement\n');
  await checkGateExecutor(errors);

  process.stdout.write('\nCheck 6: Migration manifest presence + schema + marker format\n');
  await checkMigrationManifests(errors);

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
