#!/usr/bin/env bash
# ============================================================================
#  sync-copilot.sh — bash entry point for the claude/ -> copilot/ generator
# ----------------------------------------------------------------------------
#  This is a THIN wrapper. All logic lives in sync-copilot.ps1 (the single
#  source of truth); this just forwards to PowerShell so the script is runnable
#  from a bash shell without remembering the `pwsh -File ...` incantation.
#
#  Usage:
#    ./sync-copilot.sh            regenerate copilot/ from claude/
#    ./sync-copilot.sh --check    dry-run: diff against committed copilot/
#                                 (also accepts -Check / -check)
# ============================================================================
set -euo pipefail

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v pwsh >/dev/null 2>&1; then
  echo "sync-copilot: PowerShell 7+ (pwsh) is required but was not found." >&2
  echo "Install it from https://learn.microsoft.com/powershell/ and retry." >&2
  exit 1
fi

# Normalize the check flag to the PowerShell switch the .ps1 expects.
args=()
for a in "$@"; do
  case "$a" in
    --check|-check|-Check) args+=("-Check") ;;
    *) args+=("$a") ;;
  esac
done

exec pwsh -NoProfile -File "$dir/sync-copilot.ps1" "${args[@]}"
