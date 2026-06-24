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
