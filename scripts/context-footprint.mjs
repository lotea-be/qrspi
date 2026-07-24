#!/usr/bin/env node
// ============================================================================
//  scripts/context-footprint.mjs -- context window footprint reporter
// ----------------------------------------------------------------------------
//  For each of the seven QRSPI stage agents, computes the total read surface
//  (agent file + all declared kit skills' SKILL.md files) and prints a table:
//
//    agent stem | skill count | total lines | total bytes | rough tokens
//
//  "rough tokens" = Math.round(totalBytes / 4) -- a bytes-per-token heuristic.
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const agentsDir  = path.join(root, 'claude', 'agents');
  const skillsDir  = path.join(root, 'claude', 'skills');

  // Table rows: one per stage agent, in SKILL_SET_EXPECTED order.
  const rows = [];

  for (const [stem, skills] of Object.entries(SKILL_SET_EXPECTED)) {
    // 1. Agent file
    const agentPath = path.join(agentsDir, `${stem}.md`);
    const agentBuf  = await readFileBytes(agentPath);

    let totalBytes = agentBuf !== null ? agentBuf.length : 0;
    let totalLines = countLines(agentBuf);

    // 2. Each declared skill's SKILL.md
    const skillCount = skills.length;
    for (const skillName of skills) {
      const skillPath = path.join(skillsDir, skillName, 'SKILL.md');
      const skillBuf  = await readFileBytes(skillPath);
      if (skillBuf !== null) {
        totalBytes += skillBuf.length;
        totalLines += countLines(skillBuf);
      }
    }

    const roughTokens = Math.round(totalBytes / 4);

    rows.push({
      stem,
      skillCount,
      totalLines,
      totalBytes,
      roughTokens,
    });
  }

  // ---------------------------------------------------------------------------
  // Print table
  // ---------------------------------------------------------------------------

  // Column headers
  const COL_AGENT  = 'agent';
  const COL_SKILLS = 'skills';
  const COL_LINES  = 'lines';
  const COL_BYTES  = 'bytes';
  const COL_TOKENS = 'rough tokens';

  // Compute column widths
  const wAgent  = Math.max(COL_AGENT.length,  ...rows.map((r) => r.stem.length));
  const wSkills = Math.max(COL_SKILLS.length, ...rows.map((r) => String(r.skillCount).length));
  const wLines  = Math.max(COL_LINES.length,  ...rows.map((r) => String(r.totalLines).length));
  const wBytes  = Math.max(COL_BYTES.length,  ...rows.map((r) => String(r.totalBytes).length));
  const wTokens = Math.max(COL_TOKENS.length, ...rows.map((r) => String(r.roughTokens).length));

  function pad(s, w) { return String(s).padStart(w); }
  function padL(s, w) { return String(s).padEnd(w); }

  const header =
    `| ${padL(COL_AGENT, wAgent)} | ${pad(COL_SKILLS, wSkills)} | ${pad(COL_LINES, wLines)} | ${pad(COL_BYTES, wBytes)} | ${pad(COL_TOKENS, wTokens)} |`;

  const sep =
    `| ${'-'.repeat(wAgent)} | ${'-'.repeat(wSkills)} | ${'-'.repeat(wLines)} | ${'-'.repeat(wBytes)} | ${'-'.repeat(wTokens)} |`;

  process.stdout.write('\nContext footprint per stage agent\n');
  process.stdout.write('(agent file + declared kit skills SKILL.md files)\n\n');
  process.stdout.write(header + '\n');
  process.stdout.write(sep    + '\n');

  for (const r of rows) {
    const row =
      `| ${padL(r.stem, wAgent)} | ${pad(r.skillCount, wSkills)} | ${pad(r.totalLines, wLines)} | ${pad(r.totalBytes, wBytes)} | ${pad(r.roughTokens, wTokens)} |`;
    process.stdout.write(row + '\n');
  }

  process.stdout.write('\n');

  // Always exit 0 -- this is a visibility report, not a gate (D7).
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`context-footprint: ${err && err.stack ? err.stack : err}\n`);
  process.exit(0); // still exit 0 -- this is a visibility report, not a gate
});
