#!/usr/bin/env bash
# Removes the QRSPI GitHub Copilot kit from user scope (~/.copilot). The inverse
# of install.sh.
#
# It deletes ONLY the files this repo ships: it walks the repo's source trees
# (copilot/) and removes the matching file at ~/.copilot.
# Any other file you keep in those shared folders is left alone. Empty folders
# left behind by the removal are pruned.
#
# Linux/macOS counterpart of uninstall.ps1.
#
# Claude Code is delivered as a PLUGIN — remove it with `/plugin uninstall qrspi`,
# not with this script. This script only removes the GitHub Copilot artifacts.
#
# Usage:
#   ./uninstall.sh                  # remove the Copilot kit
#   ./uninstall.sh --dry-run        # list what would be removed, delete nothing
#   ./uninstall.sh --yes            # skip the confirmation prompt

set -euo pipefail

src="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
dry_run=0
assume_yes=0

while [ $# -gt 0 ]; do
    case "$1" in
        --dry-run) dry_run=1; shift ;;
        --yes|-y) assume_yes=1; shift ;;
        -h|--help) grep '^#' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) echo "Unknown argument: $1" >&2; exit 2 ;;
    esac
done

# Colors (suppressed when stdout is not a terminal).
if [ -t 1 ]; then
    C_CYAN=$'\033[36m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'
    C_GRAY=$'\033[90m'; C_DKCYAN=$'\033[36m'; C_RESET=$'\033[0m'
else
    C_CYAN=""; C_GREEN=""; C_YELLOW=""; C_GRAY=""; C_DKCYAN=""; C_RESET=""
fi
say() { printf '%s%s%s\n' "${2:-}" "$1" "$C_RESET"; }

# Remove every empty directory under $root (bottom-up), then $root itself if empty.
remove_empty_dirs() {
    local root="$1"
    [ -d "$root" ] || return 0
    # -depth processes children before parents; rmdir only removes empty dirs.
    find "$root" -depth -type d -exec rmdir {} + 2>/dev/null || true
}

# For each file the repo ships under $from, remove the mirror at $to. Echoes the count.
remove_mirrored() {
    local from="$1" to="$2" label="$3"
    if [ ! -d "$from" ]; then
        say "missing source: $from" "$C_YELLOW"
        echo 0
        return
    fi
    local n=0 rel target_file
    while IFS= read -r -d '' f; do
        rel="${f#"$from"/}"
        target_file="$to/$rel"
        if [ -e "$target_file" ]; then
            if [ "$dry_run" -eq 1 ]; then
                say "    would remove  $target_file" "$C_GRAY" >&2
            else
                rm -f "$target_file"
            fi
            n=$((n + 1))
        fi
    done < <(find "$from" -type f -print0)
    [ "$dry_run" -eq 1 ] || remove_empty_dirs "$to"
    local verb; verb=$([ "$dry_run" -eq 1 ] && echo "would remove" || echo "removed")
    printf '%s  %-22s %s file(s) %s%s\n' "$C_GREEN" "$label" "$n" "$verb" "$C_RESET" >&2
    echo "$n"
}

dst="$HOME/.copilot"

# Confirm (destructive) unless --yes or --dry-run.
if [ "$assume_yes" -eq 0 ] && [ "$dry_run" -eq 0 ]; then
    say "" ""
    say "This will remove QRSPI files from:" "$C_YELLOW"
    say "  $dst" "$C_YELLOW"
    say "Only files this repo ships are removed; your own files are left in place." "$C_GRAY"
    read -r -p "Proceed? (y/N) " ans
    case "$ans" in
        y|Y|yes|Yes) ;;
        *) say "Aborted — nothing removed." "$C_DKCYAN"; exit 0 ;;
    esac
fi

say "" ""
say "Removing QRSPI (Copilot) from -> $dst" "$C_CYAN"
total=0
labels=(agents instructions prompts)
froms=("$src/copilot/agents" "$src/copilot/instructions" "$src/copilot/prompts")
for i in "${!labels[@]}"; do
    n="$(remove_mirrored "${froms[$i]}" "$dst/${labels[$i]}" "${labels[$i]}")"
    total=$((total + n))
done

if [ "$dry_run" -eq 0 ]; then
    say "" ""
    say "Note: install.sh may have added these keys to your VS Code settings.json." "$C_DKCYAN"
    say "Remove them by hand if you no longer want Copilot reading ~/.copilot:" "$C_DKCYAN"
    say '  "chat.promptFilesLocations" / "chat.agentFilesLocations" / "chat.instructionsFilesLocations"' "$C_YELLOW"
fi

verb=$([ "$dry_run" -eq 1 ] && echo "would be removed" || echo "removed")
say "" ""
say "Done. $total file(s) $verb." "$C_CYAN"
