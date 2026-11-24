#!/usr/bin/env node
// ============================================================================
//  scripts/context-footprint.mjs -- context window footprint reporter
// ----------------------------------------------------------------------------
//  For each QRSPI stage agent, computes the total read surface (agent file +
//  declared kit skills' SKILL.md files + any kit skills those skills in turn
//  tell the agent to load) and prints a table:
//
//    agent stem | skill count | total lines | total bytes | rough tokens
//
//  "rough tokens" = Math.round(totalBytes / 4) -- a bytes-per-token heuristic.
//
//  A second table does the same for each slash command run by the main-loop
//  orchestrator (command body + the kit skills it loads, transitively): the
//  text that lands in the orchestrator's context on that command's first run.
//
//  This script is a VISIBILITY REPORT only -- no thresholds, no gates.
//  It always exits 0 (process.exit(0)).
//
//  Uses Node.js built-ins only (node:fs, node:path, node:url).
//  Imports SKILL_SET_EXPECTED from scripts/skill-sets.mjs (single source of
//  truth shared with scripts/lint.mjs -- D7).
// ============================================================================

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SKILL_SET_EXPECTED } from './skill-sets.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readFileBytes(filePath) {
  try {
    const buf = await fs.readFile(filePath);
    return buf;
  } catch {
    return null;
  }
}

// Count newline-terminated lines in a Buffer (or string-coercible buffer).
// Empty file = 0 lines. A file with content ending in a newline counts
// that final blank line only if there is content before it.
function countLines(buf) {
  if (buf === null || buf.length === 0) return 0;
  const text = buf.toString('utf8');
  const lines = text.split('\n');
  // If the last element is an empty string (file ends with \n), don't count it
  // as an extra line -- mirrors how `wc -l` works.
  if (lines[lines.length - 1] === '') {
    return lines.length - 1;
  }
  return lines.length;
}


// Kit skills named in "Load skill(s) ..." sentences of a markdown body. Only
// the sentence itself is scanned (up to the first ". " or blank line), so a
// later sentence that merely mentions a skill is not counted.
function loadedSkills(text, skillNames) {
  const out = [];
  const re = /Load skills?\b([\s\S]*?)(?:\.\s|\n\s*\n|$)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    for (const t of m[1].matchAll(/`([a-z0-9-]+)`/g)) {
      if (skillNames.has(t[1]) && !out.includes(t[1])) out.push(t[1]);
    }
  }
  return out;
}

// Expand a skill list with the kit skills each one loads in turn (deduped).
async function expandSkills(start, skillsDir, skillNames) {
  const seen = [];
  const queue = [...start];
  while (queue.length) {
    const name = queue.shift();
    if (seen.includes(name)) continue;
    seen.push(name);
    const buf = await readFileBytes(path.join(skillsDir, name, 'SKILL.md'));
    if (buf === null) continue;
    for (const n of loadedSkills(buf.toString('utf8'), skillNames)) {
      if (!seen.includes(n)) queue.push(n);
    }
  }
  return seen;
}

async function sumSkills(skills, skillsDir) {
  let bytes = 0, lines = 0;
  for (const name of skills) {
    const buf = await readFileBytes(path.join(skillsDir, name, 'SKILL.md'));
    if (buf !== null) { bytes += buf.length; lines += countLines(buf); }
  }
  return { bytes, lines };
}

function printTable(title, subtitle, firstCol, rows) {
  const C = [firstCol, 'skills', 'lines', 'bytes', 'rough tokens'];
  const vals = rows.map((r) => [r.stem, r.skillCount, r.totalLines, r.totalBytes, r.roughTokens].map(String));
  const w = C.map((c, i) => Math.max(c.length, ...vals.map((v) => v[i].length)));
  const fmt = (v) => '| ' + v.map((x, i) => (i === 0 ? x.padEnd(w[i]) : x.padStart(w[i]))).join(' | ') + ' |';
  process.stdout.write(`\n${title}\n${subtitle}\n\n`);
  process.stdout.write(fmt(C) + '\n');
  process.stdout.write('| ' + w.map((n) => '-'.repeat(n)).join(' | ') + ' |\n');
  for (const v of vals) process.stdout.write(fmt(v) + '\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const agentsDir   = path.join(root, 'claude', 'agents');
  const skillsDir   = path.join(root, 'claude', 'skills');
  const commandsDir = path.join(root, 'claude', 'commands');
  const skillNames  = new Set(
    (await fs.readdir(skillsDir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)
  );

  // Table 1: one row per stage agent, in SKILL_SET_EXPECTED order.
  const rows = [];
  for (const [stem, declared] of Object.entries(SKILL_SET_EXPECTED)) {
    const agentBuf = await readFileBytes(path.join(agentsDir, `${stem}.md`));
    const skills = await expandSkills(declared, skillsDir, skillNames);
    const sum = await sumSkills(skills, skillsDir);
    const totalBytes = (agentBuf !== null ? agentBuf.length : 0) + sum.bytes;
    const totalLines = countLines(agentBuf) + sum.lines;
    rows.push({ stem, skillCount: skills.length, totalLines, totalBytes, roughTokens: Math.round(totalBytes / 4) });
  }

  // Table 2: one row per slash command (orchestrator side).
  const cmdRows = [];
  const cmdFiles = (await fs.readdir(commandsDir)).filter((f) => f.endsWith('.md')).sort();
  for (const f of cmdFiles) {
    const buf = await readFileBytes(path.join(commandsDir, f));
    if (buf === null) continue;
    const skills = await expandSkills(loadedSkills(buf.toString('utf8'), skillNames), skillsDir, skillNames);
    const sum = await sumSkills(skills, skillsDir);
    const totalBytes = buf.length + sum.bytes;
    cmdRows.push({
      stem: `/qrspi:${f.replace(/\.md$/, '')}`,
      skillCount: skills.length,
      totalLines: countLines(buf) + sum.lines,
      totalBytes,
      roughTokens: Math.round(totalBytes / 4),
    });
  }

  printTable('Context footprint per stage agent',
    '(agent file + declared kit skills + skills those skills load; includes conditional loads)', 'agent', rows);
  printTable('Context footprint per command (orchestrator, first run in a session)',
    '(command body + kit skills it loads, transitively, incl. conditional ones; later runs skip already-loaded skills)', 'command', cmdRows);
  process.stdout.write('\n');

  // Always exit 0 -- this is a visibility report, not a gate (D7).
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`context-footprint: ${err && err.stack ? err.stack : err}\n`);
  process.exit(0); // still exit 0 -- this is a visibility report, not a gate
});
