#!/usr/bin/env pwsh
# Removes the QRSPI GitHub Copilot kit from user scope (~/.copilot). The inverse
# of install.ps1.
#
# It deletes ONLY the files this repo ships: it walks the repo's source trees
# (copilot/) and removes the matching file at ~/.copilot.
# Any other file you keep in those shared folders is left alone. Empty folders
# left behind by the removal are pruned.
#
# Claude Code is delivered as a PLUGIN — remove it with `/plugin uninstall qrspi`,
# not with this script. This script only removes the GitHub Copilot artifacts.
#
# Usage:
#   ./uninstall.ps1            # remove the Copilot kit
#   ./uninstall.ps1 -DryRun    # list what would be removed, delete nothing
#   ./uninstall.ps1 -Yes       # skip the confirmation prompt

param(
    # Show what would be removed without deleting anything.
    [switch]$DryRun,
    # Skip the confirmation prompt (for non-interactive / CI runs).
    [switch]$Yes
)

$ErrorActionPreference = 'Stop'
$src = $PSScriptRoot

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

$dst = Join-Path $HOME '.copilot'
# The repo source trees that were copied into ~/.copilot.
$kind = [ordered]@{
    'agents'             = Join-Path $src 'copilot/agents'
    'instructions'       = Join-Path $src 'copilot/instructions'
    'prompts'            = Join-Path $src 'copilot/prompts'
}

# Confirm (destructive) unless -Yes or -DryRun.
if (-not $Yes -and -not $DryRun) {
    Write-Host "`nThis will remove QRSPI files from:" -ForegroundColor Yellow
    Write-Host ("  {0}" -f $dst) -ForegroundColor Yellow
    Write-Host "Only files this repo ships are removed; your own files are left in place." -ForegroundColor DarkGray
    $ans = Read-Host "Proceed? (y/N)"
    if ($ans -notmatch '^(y|yes)$') { Write-Host "Aborted — nothing removed." -ForegroundColor DarkCyan; return }
}

Write-Host "`nRemoving QRSPI (Copilot) from -> $dst" -ForegroundColor Cyan
$total = 0
foreach ($label in $kind.Keys) {
    $total += Remove-Mirrored $kind[$label] (Join-Path $dst $label) $label
}

if (-not $DryRun) {
    Write-Host "`nNote: install.ps1 may have added these keys to your VS Code settings.json." -ForegroundColor DarkCyan
    Write-Host "Remove them by hand if you no longer want Copilot reading ~/.copilot:" -ForegroundColor DarkCyan
    Write-Host '  "chat.promptFilesLocations" / "chat.agentFilesLocations" / "chat.instructionsFilesLocations"' -ForegroundColor Yellow
}

$verb = if ($DryRun) { 'would be removed' } else { 'removed' }
Write-Host ("`nDone. {0} file(s) {1}." -f $total, $verb) -ForegroundColor Cyan
