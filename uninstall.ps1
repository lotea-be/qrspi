#!/usr/bin/env pwsh
# Removes the QRSPI kit from Claude Code (~/.claude) and/or GitHub Copilot
# (~/.copilot) user scope. The inverse of install.ps1.
#
# It deletes ONLY the files this repo ships: it walks the repo's source trees
# (claude/, copilot/, openspec-templates/) and removes the matching file at the
# install target. Any other file you keep in those shared folders is left alone.
# Empty folders left behind by the removal are pruned.
#
# Usage:
#   ./uninstall.ps1                 # interactive: choose Claude / Copilot / Both
#   ./uninstall.ps1 -Target claude
#   ./uninstall.ps1 -Target copilot
#   ./uninstall.ps1 -Target both
#   ./uninstall.ps1 -Target both -DryRun   # list what would be removed, delete nothing
#   ./uninstall.ps1 -Target both -Yes      # skip the confirmation prompt

param(
    [ValidateSet('claude', 'copilot', 'both')]
    [string]$Target,
    # Show what would be removed without deleting anything.
    [switch]$DryRun,
    # Skip the confirmation prompt (for non-interactive / CI runs).
    [switch]$Yes
)

$ErrorActionPreference = 'Stop'
$src = $PSScriptRoot

if (-not $Target) {
    Write-Host "Uninstall QRSPI from which tool?" -ForegroundColor Cyan
    Write-Host "  [1] Claude Code  (~/.claude)"
    Write-Host "  [2] GitHub Copilot  (~/.copilot)"
    Write-Host "  [3] Both"
    $choice = Read-Host "Choose 1/2/3"
    $Target = switch ($choice) { '1' { 'claude' } '2' { 'copilot' } '3' { 'both' } default { 'claude' } }
}

# Remove every empty directory under $root (bottom-up), then $root itself if empty.
function Remove-EmptyDirs($root) {
    if (-not (Test-Path $root)) { return }
    Get-ChildItem $root -Recurse -Directory -Force -ErrorAction SilentlyContinue |
        Sort-Object { $_.FullName.Length } -Descending |
        ForEach-Object { if (-not (Get-ChildItem $_.FullName -Force -ErrorAction SilentlyContinue)) { Remove-Item -LiteralPath $_.FullName -Force } }
    if (-not (Get-ChildItem $root -Force -ErrorAction SilentlyContinue)) { Remove-Item -LiteralPath $root -Force }
}

# For each file the repo ships under $from, remove the mirror at $to. Returns the count.
function Remove-Mirrored($from, $to, $label) {
    if (-not (Test-Path $from)) { Write-Warning "missing source: $from"; return 0 }
    $n = 0
    Get-ChildItem $from -Recurse -File | ForEach-Object {
        $rel    = $_.FullName.Substring($from.Length).TrimStart('\', '/')
        $target = Join-Path $to $rel
        if (Test-Path -LiteralPath $target) {
            if ($DryRun) { Write-Host "    would remove  $target" -ForegroundColor DarkGray }
            else { Remove-Item -LiteralPath $target -Force }
            $n++
        }
    }
    if (-not $DryRun) { Remove-EmptyDirs $to }
    $verb = if ($DryRun) { 'would remove' } else { 'removed' }
    Write-Host ("  {0,-22} {1} file(s) {2}" -f $label, $n, $verb) -ForegroundColor Green
    return $n
}

# Map of install target -> the repo source trees that were copied into it.
$plan = [ordered]@{
    claude  = @{
        dst  = Join-Path $HOME '.claude'
        kind = [ordered]@{
            'agents'             = Join-Path $src 'claude/agents'
            'commands'           = Join-Path $src 'claude/commands'
            'skills'             = Join-Path $src 'claude/skills'
            'openspec-templates' = Join-Path $src 'openspec-templates'
        }
    }
    copilot = @{
        dst  = Join-Path $HOME '.copilot'
        kind = [ordered]@{
            'agents'             = Join-Path $src 'copilot/agents'
            'instructions'       = Join-Path $src 'copilot/instructions'
            'prompts'            = Join-Path $src 'copilot/prompts'
            'openspec-templates' = Join-Path $src 'openspec-templates'
        }
    }
}

$tools = if ($Target -eq 'both') { 'claude', 'copilot' } else { @($Target) }

# Confirm (destructive) unless -Yes or -DryRun.
if (-not $Yes -and -not $DryRun) {
    Write-Host "`nThis will remove QRSPI files from:" -ForegroundColor Yellow
    foreach ($t in $tools) { Write-Host ("  {0}" -f $plan[$t].dst) -ForegroundColor Yellow }
    Write-Host "Only files this repo ships are removed; your own files are left in place." -ForegroundColor DarkGray
    $ans = Read-Host "Proceed? (y/N)"
    if ($ans -notmatch '^(y|yes)$') { Write-Host "Aborted — nothing removed." -ForegroundColor DarkCyan; return }
}

$total = 0
foreach ($t in $tools) {
    $dst = $plan[$t].dst
    Write-Host "`nRemoving QRSPI ($t) from -> $dst" -ForegroundColor Cyan
    foreach ($label in $plan[$t].kind.Keys) {
        $total += Remove-Mirrored $plan[$t].kind[$label] (Join-Path $dst $label) $label
    }
}

if ($tools -contains 'copilot' -and -not $DryRun) {
    Write-Host "`nNote: install.ps1 may have added these keys to your VS Code settings.json." -ForegroundColor DarkCyan
    Write-Host "Remove them by hand if you no longer want Copilot reading ~/.copilot:" -ForegroundColor DarkCyan
    Write-Host '  "chat.promptFilesLocations" / "chat.agentFilesLocations" / "chat.instructionsFilesLocations"' -ForegroundColor Yellow
}

$verb = if ($DryRun) { 'would be removed' } else { 'removed' }
Write-Host ("`nDone ({0}). {1} file(s) {2}." -f $Target, $total, $verb) -ForegroundColor Cyan
