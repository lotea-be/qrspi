#!/usr/bin/env pwsh
# ============================================================================
#  sync-copilot.ps1 — deterministic claude/ -> copilot/ generator
# ----------------------------------------------------------------------------
#  copilot/ is a GENERATED artifact. claude/ is the source of truth. This script
#  DROPS and RECREATES copilot/ every run, so the trees never drift.
#
#  Run it:        ./sync-copilot.ps1          (PowerShell, any platform)
#                 ./sync-copilot.sh           (bash wrapper -> same script via pwsh)
#  Dry-run/diff:  ./sync-copilot.ps1 -Check   (regenerates to a temp dir and
#                 ./sync-copilot.sh --check    diffs; does not touch copilot/)
#
#  Requires PowerShell 7+ (`pwsh`). The bash wrapper just forwards to pwsh, so the
#  logic lives here in ONE place -- never port it to a second language.
#
#  HOW TO IMPROVE FIDELITY: never hand-edit copilot/ (it's overwritten next run)
#  and never hand-edit individual generated files. Instead, improve THIS SCRIPT
#  -- add a body rewrite rule or a per-file fixup -- then re-run. The /qrspi-sync-copilot
#  command does exactly that: it runs this script, reviews the output against the
#  qrspi-sync-copilot skill, and edits this script when it finds a systematic gap.
# ============================================================================

param([switch]$Check)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$src  = Join-Path $root 'claude'
$dst  = if ($Check) { Join-Path ([System.IO.Path]::GetTempPath()) ("copilot-check-" + [guid]::NewGuid().ToString('N').Substring(0,8)) } else { Join-Path $root 'copilot' }

# ---- config: prompt agent + argument-hint tables ---------------------------
$agentFor = @{
  'qrspi-questions' = 'qrspi-questioner'; 'qrspi-research' = 'qrspi-researcher'
  'qrspi-design' = 'qrspi-designer';      'qrspi-structure' = 'qrspi-architect'
  'qrspi-worktree' = 'qrspi-architect';   'qrspi-plan' = 'qrspi-planner'
  'qrspi-implement' = 'qrspi-implementer'; 'qrspi-followup' = 'qrspi-implementer'
  'qrspi-pr' = 'qrspi-reviewer'
}
$hintFor = @{
  'qrspi-questions' = '<change-id>'; 'qrspi-research' = '<change-id>'
  'qrspi-design' = '<change-id>'; 'qrspi-structure' = '<change-id>'
  'qrspi-worktree' = '<change-id>'; 'qrspi-plan' = '<change-id>'
  'qrspi-implement' = '<change-id>'; 'qrspi-followup' = '<change-id>'
  'qrspi-pr' = '<change-id>'; 'qrspi-stack' = '(optional) stack hint'
  'qrspi-retro' = '<change-id> <stage>'; 'qrspi' = '(optional) <change-id>'
  'opsx-propose' = '<change-name or description>'; 'opsx-explore' = '<topic>'
  'opsx-apply' = '<change-name>'; 'opsx-archive' = '<change-name>'; 'opsx-sync' = '<change-name>'
}

# ---- helpers ----------------------------------------------------------------
function Split-Front([string]$text) {
  $t = $text -replace "`r`n", "`n"
  if ($t -notmatch '^\s*---') { return @{ front = ''; body = $t } }
  $parts = $t -split '(?m)^---\s*$', 3
  return @{ front = $parts[1]; body = ($parts[2].TrimStart("`n")) }
}
function Get-Field([string]$front, [string]$name) {
  foreach ($line in ($front -split "`n")) {
    if ($line -match ('^\s*' + $name + ':\s*(.+)$')) { return $Matches[1].Trim() }
  }
  return ''
}
# VS Code namespaced the built-in tool ids; the bare forms (`codebase`,
# `editFiles`, `runCommands`) now emit "Tool 'X' has been renamed" warnings.
# `vscode/askQuestions` is Copilot's structured-question tool (the equivalent of
# Claude Code's AskUserQuestion). Every QRSPI agent has an interactive step in
# its stage, so it is part of the base set; an agent-delegated prompt inherits it.
$script:askTool = 'vscode/askQuestions'
# Superset toolset stamped onto generic-`agent: agent` prompts (opsx-*, qrspi-stack,
# qrspi-retro) that use the question tool but inherit no agent toolset. A superset
# is safe — it never strips a tool the prompt already had.
$script:promptToolset = "'search/codebase', 'search', 'edit/editFiles', 'execute/runInTerminal', 'execute/getTerminalOutput', 'web/fetch', '$script:askTool'"
function Map-Tools([string]$toolLine) {
  $t = @('search/codebase', 'search', $script:askTool)
  if ($toolLine -match 'Write|Edit') { $t += 'edit/editFiles' }
  if ($toolLine -match 'Bash|PowerShell') { $t += @('execute/runInTerminal', 'execute/getTerminalOutput') }
  if ($toolLine -match 'WebFetch|WebSearch') { $t += 'web/fetch' }
  return (($t | Select-Object -Unique) -join ', ')
}

# All body/text rewrites, in the order they must apply. Operates on the whole
# assembled file (frontmatter + body). Add rules here to fix systematic issues.
function Rewrite-All([string]$b) {
  # --- argument + user-scope + reload ---
  $b = $b -replace '\$ARGUMENTS', '${input}'
  $b = $b -replace '\$HOME/\.claude', '$HOME/.copilot'
  $b = $b -replace '~/\.claude', '~/.copilot'
  $b = $b -replace '(?i)restart Claude Code', 'reload the VS Code window'
  # --- project-scope path refs: .claude/<kind> -> .github/<kind> ---
  $b = $b -replace '\.claude/skills/([A-Za-z0-9<>_*-]+)/SKILL\.md', '.github/instructions/$1.instructions.md'
  $b = $b -replace '\.claude/commands/opsx/\*', '.github/prompts/opsx-*'
  $b = $b -replace '\.claude/commands/([A-Za-z0-9<>_-]+)\.md', '.github/prompts/$1.prompt.md'
  $b = $b -replace '\.claude/agents/([A-Za-z0-9<>_-]+)\.md', '.github/agents/$1.agent.md'
  $b = $b -replace '\.claude/skills', '.github/instructions'
  $b = $b -replace '\.claude/commands/opsx', '.github/prompts'
  $b = $b -replace '\.claude/commands', '.github/prompts'
  $b = $b -replace '\.claude/agents', '.github/agents'
  $b = $b -replace '\.claude/', '.github/'
  $b = $b -replace '\.claude\b', '.github'
  # Generated Copilot agents are namespaced `copilot-<role>` so that prompts and
  # instructions point at the generated agent, never the Claude one. The negative
  # lookahead keeps the rule idempotent (no `copilot-copilot-` on re-match).
  $b = $b -replace '\.github/agents/(?!copilot-)([A-Za-z0-9<>_-]+)\.agent\.md', '.github/agents/copilot-$1.agent.md'
  # --- skills -> instruction references ---
  $b = [regex]::Replace($b, 'Load skill\s+`([^`]+)`', { param($m) "Consult the **$($m.Groups[1].Value)** instructions (``$($m.Groups[1].Value).instructions.md``)" })
  $b = [regex]::Replace($b, 'load the\s+`([^`]+)`\s+skill', { param($m) "consult the **$($m.Groups[1].Value)** instructions" })
  $b = $b -replace '(?m)\bLoad skills?\b', 'Consult the instructions for'
  # --- command mechanics that Copilot lacks ---
  $b = [regex]::Replace($b, '(?m)^!`(.+?)`\s*$', { param($m) "Run ``$($m.Groups[1].Value)`` and use the result." })
  $b = [regex]::Replace($b, '(?m)^@(\S+)\s*$', '#file:$1')
  # --- AskUserQuestion -> Copilot's vscode/askQuestions structured-question tool ---
  # Copilot DOES have a structured-question equivalent, so we map onto it rather
  # than degrading to plain chat. The actionable "use the X tool" invocation becomes
  # a `#tool:` reference (same convention as #file: above); per-call and bare mentions
  # become the plain tool id. \s+ tolerates source line-wraps. The tool is granted in
  # each agent's `tools:` (Map-Tools) and on generic-agent prompts (Emit-Prompt).
  $aqTool = '(?:\*\*AskUserQuestion\*\*\s+tool|\*\*AskUserQuestion\s+tool\*\*)'
  $b = $b -replace $aqTool, "#tool:$script:askTool"
  $b = $b -replace 'per\s+\*\*AskUserQuestion\*\*\s+call', "per $script:askTool call"
  $b = $b -replace '1-decision-per-\*\*AskUserQuestion\*\*', "1-decision-per-$script:askTool"
  # Residual bare references (e.g. inline "(AskUserQuestion: *Add / Skip*)").
  $b = $b -replace '\bAskUserQuestion\b', $script:askTool
  # --- the prompt already runs inside agent: <role>; soften delegation verbs ---
  $b = $b -replace 'invoke the (\w+) subagent', 'continue as the $1'
  # --- command-invocation namespace: Claude plugin uses `/qrspi:<cmd>`; Copilot
  # prompts are NOT plugin-namespaced, so the qrspi commands keep the `qrspi-`
  # filename prefix and are invoked as `/qrspi-<cmd>`. Rewrite the colon form back
  # to the dash form for the generated prompts. (`*` handles the `/qrspi:*` family
  # references; `/opsx:*` is untouched.)
  $b = $b -replace '/qrspi:([a-z*][a-z-]*)', '/qrspi-$1'
  return $b.TrimEnd() + "`n"
}

# Per-file semantic fixups for cases the generic rules can't express. Applied
# AFTER Rewrite-All, keyed by output relative path. LF-normalized literal
# replacement (no regex) -- bulletproof against backticks and line-wraps.
function LRep([string]$text, [string]$old, [string]$new) {
  return $text.Replace(($old -replace "`r`n", "`n"), ($new -replace "`r`n", "`n"))
}
function Apply-Fixups([string]$rel, [string]$b) {
  if ($rel -eq 'prompts/qrspi-implement.prompt.md') {
    $b = LRep $b "Pick the implementer's model from the next un-ticked slice." "Check the next un-ticked slice's recommended model."
    $b = LRep $b @'
annotation is the architect's call; honor it. Invoke the implementer
subagent via the Agent tool with `model: <annotated>` so the subagent
runs on the right model for this slice's complexity.
'@ @'
annotation is the architect's call.

> Copilot has no per-slice model auto-selection. If the slice is annotated
> `opus` (deep reasoning), tell the user to pick a strong reasoning model in
> the model picker before continuing; for `sonnet`, the default is fine. Then
> proceed with the implementation below.
'@
  }
  if ($rel -eq 'prompts/qrspi-init.prompt.md') {
    $b = LRep $b 'never its Claude tooling.' 'never its Copilot tooling.'
    $b = LRep $b 'OpenSpec Claude tooling.' 'OpenSpec Copilot tooling.'
    $b = LRep $b @'
   Remove-Item -Recurse -Force .github/prompts -ErrorAction SilentlyContinue
   Get-ChildItem .github/instructions -Filter 'openspec-*' -Directory -ErrorAction SilentlyContinue |
     Remove-Item -Recurse -Force
'@ @'
   Get-ChildItem .github/prompts -Filter 'opsx*' -File -ErrorAction SilentlyContinue | Remove-Item -Force
   Get-ChildItem .github/instructions -Filter 'openspec-*' -File -ErrorAction SilentlyContinue | Remove-Item -Force
'@
    $b = LRep $b @'

   If `.github/` is now empty, remove it too. Tell the user what was removed (or
   that nothing needed removing).
'@ @'

   Tell the user what was removed (or that nothing needed removing).
'@
    $b = LRep $b 'verify no `.github/opsx`/' 'verify no `opsx`/'
  }
  return $b
}

# ---- generate ---------------------------------------------------------------
Remove-Item $dst -Recurse -Force -ErrorAction SilentlyContinue
foreach ($d in 'agents', 'prompts', 'instructions') { New-Item -ItemType Directory -Force (Join-Path $dst $d) | Out-Null }

function Write-Out($rel, $text) {
  $text = Apply-Fixups $rel $text
  Set-Content -Path (Join-Path $dst $rel) -Value $text -Encoding utf8 -NoNewline
}

# agents
$na = 0
Get-ChildItem (Join-Path $src 'agents') -Filter *.md | ForEach-Object {
  $p = Split-Front (Get-Content $_.FullName -Raw)
  $desc = Get-Field $p.front 'description'
  $tools = Map-Tools (Get-Field $p.front 'tools')
  $note = if ((Get-Field $p.front 'model') -eq 'opus') { "`n> Recommended model: a strong reasoning model (this stage runs on Opus under Claude Code).`n" } else { '' }
  $out = "---`ndescription: $desc`ntools: [$tools]`n---`n$note`n$($p.body)"
  Write-Out "agents/copilot-$($_.BaseName).agent.md" (Rewrite-All $out)
  $na++
}

# commands -> prompts
$np = 0
function Emit-Prompt($file, $stem) {
  $p = Split-Front (Get-Content $file -Raw)
  $desc = Get-Field $p.front 'description'
  $fm = "---`ndescription: $desc`n"
  if ($script:hintFor.ContainsKey($stem)) { $fm += "argument-hint: $($script:hintFor[$stem])`n" }
  # Map onto the generated `copilot-<role>` agent so the prompt points at a
  # Copilot file, not the Claude agent. `agent` (Copilot's built-in generic
  # agent) is left unprefixed.
  $ag = if ($script:agentFor.ContainsKey($stem)) { 'copilot-' + $script:agentFor[$stem] } else { 'agent' }
  # A prompt delegating to a QRSPI agent inherits that agent's tools (which already
  # include the question tool). A generic-`agent: agent` prompt inherits none, so if
  # it uses the question tool, stamp an explicit superset toolset on it.
  if ($ag -eq 'agent' -and $p.body -match 'AskUserQuestion') { $fm += "tools: [$script:promptToolset]`n" }
  $fm += "agent: $ag`n---`n`n"
  Write-Out "prompts/$stem.prompt.md" (Rewrite-All ($fm + $p.body))
  $script:np++
}
Get-ChildItem (Join-Path $src 'commands') -Filter *.md | Where-Object { $_.BaseName -ne 'qrspi-sync-copilot' } | ForEach-Object {
  # The command files dropped their `qrspi-` prefix (plugin namespaces them as
  # `/qrspi:<stem>`). Copilot prompts are flat/un-namespaced, so re-add the
  # prefix to the output filename to keep them `/qrspi-<stem>`. The status
  # command `qrspi.md` is left as-is.
  $outStem = if ($_.BaseName -eq 'qrspi') { 'qrspi' } else { "qrspi-$($_.BaseName)" }
  Emit-Prompt $_.FullName $outStem
}
Get-ChildItem (Join-Path $src 'commands/opsx') -Filter *.md | ForEach-Object { Emit-Prompt $_.FullName ("opsx-" + $_.BaseName) }

# skills -> instructions
$ni = 0
Get-ChildItem (Join-Path $src 'skills') -Directory | Where-Object { $_.Name -ne 'qrspi-sync-copilot' } | ForEach-Object {
  $sf = Join-Path $_.FullName 'SKILL.md'
  if (-not (Test-Path $sf)) { return }
  $p = Split-Front (Get-Content $sf -Raw)
  $out = "---`ndescription: $(Get-Field $p.front 'description')`n---`n`n$($p.body)"
  Write-Out "instructions/$($_.Name).instructions.md" (Rewrite-All $out)
  $ni++
}

Write-Host ("Generated -> {0}: agents={1} prompts={2} instructions={3}" -f $dst, $na, $np, $ni) -ForegroundColor Green

if ($Check) {
  $base = Join-Path $root 'copilot'
  $diff = Compare-Object (Get-ChildItem $base -Recurse -File | Sort-Object FullName) (Get-ChildItem $dst -Recurse -File | Sort-Object FullName) -Property Name -PassThru 2>$null
  $changed = 0
  Get-ChildItem $dst -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($dst.Length)
    $old = Join-Path $base $rel
    if (-not (Test-Path $old) -or (Get-Content $old -Raw) -ne (Get-Content $_.FullName -Raw)) { $changed++; Write-Host "  DIFF: $rel" -ForegroundColor Yellow }
  }
  Write-Host ("`n-Check: {0} file(s) differ from committed copilot/." -f $changed) -ForegroundColor Cyan
  Remove-Item $dst -Recurse -Force -ErrorAction SilentlyContinue
}
