#!/usr/bin/env node
// ============================================================================
//  sync-copilot.mjs -- deterministic claude/ -> copilot/ generator
// ----------------------------------------------------------------------------
//  copilot/ is a GENERATED artifact. claude/ is the source of truth. This script
//  DROPS and RECREATES copilot/ every run, so the trees never drift.
//
//  Run it:        node sync-copilot.mjs          (any OS with Node >= 18)
//  Dry-run/diff:  node sync-copilot.mjs --check   (regenerates to a temp dir and
//                 diffs; does not touch copilot/)
//
//  Requires only Node.js built-ins (fs, path, os) -- no npm dependencies, no
//  build step. This is the single source of truth for the transform; the old
//  PowerShell script + bash wrapper it replaced are gone.
//
//  HOW TO IMPROVE FIDELITY: never hand-edit copilot/ (it's overwritten next run)
//  and never hand-edit individual generated files. Instead, improve THIS SCRIPT
//  -- add a body rewrite rule or a per-file fixup -- then re-run. The
//  /qrspi-sync-copilot command does exactly that: it runs this script, reviews
//  the output against the qrspi-sync-copilot skill, and edits this script when it
//  finds a systematic gap.
// ============================================================================

import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, 'claude');
const check = process.argv.slice(2).some((a) => a === '--check' || a === '-check' || a === '-Check');

// ---- config: prompt agent + argument-hint tables ---------------------------
const agentFor = {
  'qrspi-questions': 'qrspi-questioner', 'qrspi-research': 'qrspi-researcher',
  'qrspi-design': 'qrspi-designer', 'qrspi-structure': 'qrspi-architect',
  'qrspi-worktree': 'qrspi-architect', 'qrspi-plan': 'qrspi-planner',
  'qrspi-implement': 'qrspi-implementer', 'qrspi-followup': 'qrspi-implementer',
  'qrspi-pr': 'qrspi-reviewer',
};
const hintFor = {
  'qrspi-questions': '<change-id>', 'qrspi-research': '<change-id>',
  'qrspi-design': '<change-id>', 'qrspi-structure': '<change-id>',
  'qrspi-worktree': '<change-id>', 'qrspi-plan': '<change-id>',
  'qrspi-implement': '<change-id>', 'qrspi-followup': '<change-id>',
  'qrspi-pr': '<change-id>', 'qrspi-stack': '(optional) stack hint',
  'qrspi-retro': '<change-id> <stage>', 'qrspi-status': '(optional) <change-id>',
};

// ---- helpers ----------------------------------------------------------------
function splitFront(text) {
  const t = text.replace(/\r\n/g, '\n');
  if (!/^\s*---/.test(t)) return { front: '', body: t };
  // PowerShell: $t -split '(?m)^---\s*$', 3  -- split on a line that is `---`
  // (optionally trailing whitespace), at most 3 pieces. parts[0] is the text
  // before the first delimiter (empty here), parts[1] the frontmatter, parts[2]
  // the rest (which may itself contain `---`).
  const parts = splitN(t, /^---[^\S\n]*$/m, 3);
  return { front: parts[1], body: parts[2].replace(/^\n+/, '') };
}

// Mirror PowerShell's `-split <regex>, <max>`: split on the regex but cap the
// number of result pieces; once max-1 splits have happened, the remainder
// (including any further delimiters) is the final piece.
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

// VS Code namespaced the built-in tool ids; the bare forms (`codebase`,
// `editFiles`, `runCommands`) now emit "Tool 'X' has been renamed" warnings.
// `vscode/askQuestions` is Copilot's structured-question tool (the equivalent of
// Claude Code's AskUserQuestion). Every QRSPI agent has an interactive step in
// its stage, so it is part of the base set; an agent-delegated prompt inherits it.
const askTool = 'vscode/askQuestions';
// Superset toolset stamped onto generic-`agent: agent` prompts (qrspi-stack,
// qrspi-retro) that use the question tool but inherit no agent toolset. A superset
// is safe -- it never strips a tool the prompt already had.
const promptToolset = `'search/codebase', 'search', 'edit/editFiles', 'execute/runInTerminal', 'execute/getTerminalOutput', 'web/fetch', '${askTool}'`;

function mapTools(toolLine) {
  const t = ['search/codebase', 'search', askTool];
  if (/Write|Edit/i.test(toolLine)) t.push('edit/editFiles');
  if (/Bash|PowerShell/i.test(toolLine)) t.push('execute/runInTerminal', 'execute/getTerminalOutput');
  if (/WebFetch|WebSearch/i.test(toolLine)) t.push('web/fetch');
  return [...new Set(t)].join(', ');
}

// All body/text rewrites, in the order they must apply. Operates on the whole
// assembled file (frontmatter + body). Add rules here to fix systematic issues.
function rewriteAll(input) {
  let b = input;
  // NOTE on case sensitivity: PowerShell's `-replace` operator is
  // case-INsensitive by default, while `[regex]::Replace(...)` is case-SENSITIVE.
  // To reproduce the .ps1 output byte-for-byte, the rules that were `-replace`
  // carry the `i` flag; the four that were `[regex]::Replace` (the two skill-load
  // rules, the `!`-backtick rule, and the `@path` rule) stay case-sensitive.
  // --- argument + user-scope + reload ---
  b = b.replace(/\$ARGUMENTS/gi, '${input}');
  b = b.replace(/\$HOME\/\.claude/gi, '$HOME/.copilot');
  b = b.replace(/~\/\.claude/gi, '~/.copilot');
  b = b.replace(/restart Claude Code/gi, 'reload the VS Code window');
  // --- project-scope path refs: .claude/<kind> -> .github/<kind> ---
  b = b.replace(/\.claude\/skills\/([A-Za-z0-9<>_*-]+)\/SKILL\.md/gi, '.github/instructions/$1.instructions.md');
  b = b.replace(/\.claude\/commands\/([A-Za-z0-9<>_-]+)\.md/gi, '.github/prompts/$1.prompt.md');
  b = b.replace(/\.claude\/agents\/([A-Za-z0-9<>_-]+)\.md/gi, '.github/agents/$1.agent.md');
  b = b.replace(/\.claude\/skills/gi, '.github/instructions');
  b = b.replace(/\.claude\/commands/gi, '.github/prompts');
  b = b.replace(/\.claude\/agents/gi, '.github/agents');
  b = b.replace(/\.claude\//gi, '.github/');
  b = b.replace(/\.claude\b/gi, '.github');
  // Generated Copilot agents are namespaced `copilot-<role>` so that prompts and
  // instructions point at the generated agent, never the Claude one. The negative
  // lookahead keeps the rule idempotent (no `copilot-copilot-` on re-match).
  b = b.replace(/\.github\/agents\/(?!copilot-)([A-Za-z0-9<>_-]+)\.agent\.md/gi, '.github/agents/copilot-$1.agent.md');
  // --- skills -> instruction references ---
  b = b.replace(/Load skill\s+`([^`]+)`/g, (_m, g1) => `Consult the **${g1}** instructions (\`${g1}.instructions.md\`)`);
  b = b.replace(/load the\s+`([^`]+)`\s+skill/g, (_m, g1) => `consult the **${g1}** instructions`);
  b = b.replace(/\bLoad skills?\b/gim, 'Consult the instructions for');
  // --- command mechanics that Copilot lacks ---
  b = b.replace(/^!`(.+?)`\s*$/gm, (_m, g1) => `Run \`${g1}\` and use the result.`);
  b = b.replace(/^@(\S+)\s*$/gm, '#file:$1');
  // --- AskUserQuestion -> Copilot's vscode/askQuestions structured-question tool ---
  // Copilot DOES have a structured-question equivalent, so we map onto it rather
  // than degrading to plain chat. The actionable "use the X tool" invocation becomes
  // a `#tool:` reference (same convention as #file: above); per-call and bare mentions
  // become the plain tool id. \s+ tolerates source line-wraps. The tool is granted in
  // each agent's `tools:` (mapTools) and on generic-agent prompts (emitPrompt).
  const aqTool = /(?:\*\*AskUserQuestion\*\*\s+tool|\*\*AskUserQuestion\s+tool\*\*)/gi;
  b = b.replace(aqTool, `#tool:${askTool}`);
  b = b.replace(/per\s+\*\*AskUserQuestion\*\*\s+call/gi, `per ${askTool} call`);
  b = b.replace(/1-decision-per-\*\*AskUserQuestion\*\*/gi, `1-decision-per-${askTool}`);
  // Residual bare references (e.g. inline "(AskUserQuestion: *Add / Skip*)").
  b = b.replace(/\bAskUserQuestion\b/gi, askTool);
  // --- the prompt already runs inside agent: <role>; soften delegation verbs ---
  b = b.replace(/invoke the (\w+) subagent/gi, 'continue as the $1');
  // --- command-invocation namespace: Claude plugin uses `/qrspi:<cmd>`; Copilot
  // prompts are NOT plugin-namespaced, so the qrspi commands keep the `qrspi-`
  // filename prefix and are invoked as `/qrspi-<cmd>`. Rewrite the colon form back
  // to the dash form for the generated prompts.
  b = b.replace(/\/qrspi:([a-z*][a-z-]*)/gi, '/qrspi-$1');
  return b.replace(/\s+$/, '') + '\n';
}

// Per-file semantic fixups for cases the generic rules can't express. Applied
// AFTER rewriteAll, keyed by output relative path. LF-normalized literal
// replacement (no regex) -- bulletproof against backticks and line-wraps.
function lRep(text, oldStr, newStr) {
  return text.split(oldStr.replace(/\r\n/g, '\n')).join(newStr.replace(/\r\n/g, '\n'));
}

function applyFixups(rel, input) {
  let b = input;
  if (rel === 'prompts/qrspi-implement.prompt.md') {
    b = lRep(b, "Pick the implementer's model from the next un-ticked slice.", "Check the next un-ticked slice's recommended model.");
    b = lRep(b,
`annotation is the architect's call; honor it. Invoke the implementer
subagent via the Agent tool with \`model: <annotated>\` so the subagent
runs on the right model for this slice's complexity.
`,
`annotation is the architect's call.

> Copilot has no per-slice model auto-selection. If the slice is annotated
> \`opus\` (deep reasoning), tell the user to pick a strong reasoning model in
> the model picker before continuing; for \`sonnet\`, the default is fine. Then
> proceed with the implementation below.
`);
  }
  if (rel === 'prompts/qrspi-init.prompt.md') {
    b = lRep(b, 'never its Claude tooling.', 'never its Copilot tooling.');
    b = lRep(b, 'OpenSpec Claude tooling.', 'OpenSpec Copilot tooling.');
    b = lRep(b,
`   Remove-Item -Recurse -Force .github/prompts -ErrorAction SilentlyContinue
   Get-ChildItem .github/instructions -Filter 'openspec-*' -Directory -ErrorAction SilentlyContinue |
     Remove-Item -Recurse -Force
`,
`   Get-ChildItem .github/prompts -Filter 'opsx*' -File -ErrorAction SilentlyContinue | Remove-Item -Force
   Get-ChildItem .github/instructions -Filter 'openspec-*' -File -ErrorAction SilentlyContinue | Remove-Item -Force
`);
    b = lRep(b,
`
   If \`.github/\` is now empty, remove it too. Tell the user what was removed (or
   that nothing needed removing).
`,
`
   Tell the user what was removed (or that nothing needed removing).
`);
    b = lRep(b, 'verify no `.github/opsx`/', 'verify no `opsx`/');
  }
  return b;
}

// ---- filesystem helpers -----------------------------------------------------
async function dirEntries(dir, kind) {
  // kind: 'files' (return *.md files), 'dirs' (return subdirectories)
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  if (kind === 'dirs') {
    return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  }
  return entries.filter((e) => e.isFile() && e.name.endsWith('.md')).map((e) => e.name).sort();
}

async function isNonEmptyDir(dir) {
  try {
    const entries = await fs.readdir(dir);
    return entries.length > 0;
  } catch {
    return false;
  }
}

// ---- generate ---------------------------------------------------------------
async function generate(dst) {
  await fs.rm(dst, { recursive: true, force: true });
  for (const d of ['agents', 'prompts', 'instructions']) {
    await fs.mkdir(path.join(dst, d), { recursive: true });
  }

  let missingSkill = 0;

  async function writeOut(rel, text) {
    const out = applyFixups(rel, text);
    await fs.writeFile(path.join(dst, rel), out, { encoding: 'utf8' });
  }

  // agents
  let na = 0;
  for (const name of await dirEntries(path.join(src, 'agents'), 'files')) {
    const full = path.join(src, 'agents', name);
    const base = name.replace(/\.md$/, '');
    const p = splitFront(await fs.readFile(full, 'utf8'));
    const desc = getField(p.front, 'description');
    const tools = mapTools(getField(p.front, 'tools'));
    const note = getField(p.front, 'model') === 'opus'
      ? '\n> Recommended model: a strong reasoning model (this stage runs on Opus under Claude Code).\n'
      : '';
    const out = `---\ndescription: ${desc}\ntools: [${tools}]\n---\n${note}\n${p.body}`;
    await writeOut(`agents/copilot-${base}.agent.md`, rewriteAll(out));
    na++;
  }

  // commands -> prompts
  let np = 0;
  async function emitPrompt(file, stem) {
    const p = splitFront(await fs.readFile(file, 'utf8'));
    const desc = getField(p.front, 'description');
    let fm = `---\ndescription: ${desc}\n`;
    if (Object.prototype.hasOwnProperty.call(hintFor, stem)) fm += `argument-hint: ${hintFor[stem]}\n`;
    // Map onto the generated `copilot-<role>` agent so the prompt points at a
    // Copilot file, not the Claude agent. `agent` (Copilot's built-in generic
    // agent) is left unprefixed.
    const ag = Object.prototype.hasOwnProperty.call(agentFor, stem) ? 'copilot-' + agentFor[stem] : 'agent';
    // A prompt delegating to a QRSPI agent inherits that agent's tools (which already
    // include the question tool). A generic-`agent: agent` prompt inherits none, so if
    // it uses the question tool, stamp an explicit superset toolset on it.
    if (ag === 'agent' && /AskUserQuestion/i.test(p.body)) fm += `tools: [${promptToolset}]\n`;
    fm += `agent: ${ag}\n---\n\n`;
    await writeOut(`prompts/${stem}.prompt.md`, rewriteAll(fm + p.body));
    np++;
  }
  for (const name of await dirEntries(path.join(src, 'commands'), 'files')) {
    const base = name.replace(/\.md$/, '');
    if (base === 'qrspi-sync-copilot') continue;
    // The command files dropped their `qrspi-` prefix (plugin namespaces them as
    // `/qrspi:<stem>`). Copilot prompts are flat/un-namespaced, so re-add the
    // prefix to the output filename to keep them `/qrspi-<stem>`.
    await emitPrompt(path.join(src, 'commands', name), `qrspi-${base}`);
  }

  // skills -> instructions
  let ni = 0;
  for (const dirName of await dirEntries(path.join(src, 'skills'), 'dirs')) {
    if (dirName === 'qrspi-sync-copilot') continue;
    const sf = path.join(src, 'skills', dirName, 'SKILL.md');
    let raw;
    try {
      raw = await fs.readFile(sf, 'utf8');
    } catch {
      process.stderr.write(`WARNING: missing SKILL.md in claude/skills/${dirName}/\n`);
      missingSkill++;
      continue;
    }
    const p = splitFront(raw);
    const out = `---\ndescription: ${getField(p.front, 'description')}\n---\n\n${p.body}`;
    await writeOut(`instructions/${dirName}.instructions.md`, rewriteAll(out));
    ni++;
  }

  return { na, np, ni, missingSkill };
}

// ---- file-tree comparison (check mode) -------------------------------------
async function listFilesRel(dir) {
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
      else if (e.isFile()) out.push(path.relative(dir, full));
    }
  }
  await walk(dir);
  return out;
}

// Minimal per-line diff (LCS-free, line-by-line positional) good enough to show
// which lines changed between two file versions.
function lineDiff(oldText, newText) {
  const a = oldText.split('\n');
  const b = newText.split('\n');
  const lines = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i] === b[i]) continue;
    if (a[i] !== undefined) lines.push(`    - ${a[i]}`);
    if (b[i] !== undefined) lines.push(`    + ${b[i]}`);
  }
  return lines;
}

async function runCheck() {
  const base = path.join(root, 'copilot');
  const dst = await fs.mkdtemp(path.join(os.tmpdir(), 'copilot-check-'));
  try {
    const counts = await generate(dst);
    process.stdout.write(`Generated -> ${dst}: agents=${counts.na} prompts=${counts.np} instructions=${counts.ni}\n`);

    // Union of committed copilot/ and the freshly generated tree, so a file that
    // exists in copilot/ but is no longer generated is flagged as deleted-drift.
    const committed = await listFilesRel(base);
    const generated = await listFilesRel(dst);
    const union = [...new Set([...committed, ...generated])].sort();

    let changed = 0;
    for (const rel of union) {
      const oldPath = path.join(base, rel);
      const newPath = path.join(dst, rel);
      let oldText = null;
      let newText = null;
      try { oldText = await fs.readFile(oldPath, 'utf8'); } catch { /* absent */ }
      try { newText = await fs.readFile(newPath, 'utf8'); } catch { /* absent */ }

      if (oldText === null) {
        changed++;
        process.stdout.write(`  ADDED (would be generated, not in copilot/): ${rel}\n`);
        for (const l of lineDiff('', newText)) process.stdout.write(l + '\n');
      } else if (newText === null) {
        changed++;
        process.stdout.write(`  DELETED (in copilot/, no longer generated): ${rel}\n`);
        for (const l of lineDiff(oldText, '')) process.stdout.write(l + '\n');
      } else if (oldText !== newText) {
        changed++;
        process.stdout.write(`  DIFF: ${rel}\n`);
        for (const l of lineDiff(oldText, newText)) process.stdout.write(l + '\n');
      }
    }

    process.stdout.write(`\n--check: ${changed} file(s) differ from committed copilot/.\n`);
    if (changed > 0 || counts.missingSkill > 0) process.exitCode = 1;
  } finally {
    await fs.rm(dst, { recursive: true, force: true });
  }
}

async function runGenerate() {
  const dst = path.join(root, 'copilot');
  const counts = await generate(dst);
  process.stdout.write(`Generated -> copilot/: agents=${counts.na} prompts=${counts.np} instructions=${counts.ni}\n`);
  if (counts.missingSkill > 0) process.exitCode = 1;
}

// ---- source guard + entry ---------------------------------------------------
async function main() {
  for (const d of ['agents', 'commands', 'skills']) {
    if (!(await isNonEmptyDir(path.join(src, d)))) {
      process.stderr.write(`Source directory missing or empty: claude/${d}/\n`);
      process.exit(1);
    }
  }
  if (check) await runCheck();
  else await runGenerate();
}

main().catch((err) => {
  process.stderr.write(`sync-copilot: ${err && err.stack ? err.stack : err}\n`);
  process.exit(1);
});
