#!/usr/bin/env bash
# Installs the QRSPI kit into Claude Code (~/.claude) and/or GitHub Copilot
# (~/.copilot) user scope. Merges: overwrites same-named files, leaves your
# other files alone. Re-run any time you change something in this repo.
#
# Linux/macOS counterpart of install.ps1.
#
# Usage:
#   ./install.sh                      # interactive: choose Claude / Copilot / Both
#   ./install.sh --target claude
#   ./install.sh --target copilot
#   ./install.sh --target both
#   ./install.sh --target copilot --skip-settings   # don't touch VS Code settings.json
#
# claude/ is the source of truth. copilot/ is generated from it by
# /qrspi-sync-copilot (run that after editing claude/, then commit copilot/).

set -euo pipefail

src="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
target=""
skip_settings=0

while [ $# -gt 0 ]; do
    case "$1" in
        --target) target="${2:-}"; shift 2 ;;
        --target=*) target="${1#*=}"; shift ;;
        --skip-settings) skip_settings=1; shift ;;
        -h|--help) grep '^#' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) echo "Unknown argument: $1" >&2; exit 2 ;;
    esac
done

case "$target" in
    claude|copilot|both|"") ;;
    *) echo "Invalid --target '$target' (use claude, copilot, or both)" >&2; exit 2 ;;
esac

# Colors (suppressed when stdout is not a terminal).
if [ -t 1 ]; then
    C_CYAN=$'\033[36m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'
    C_GRAY=$'\033[90m'; C_DKCYAN=$'\033[36m'; C_RESET=$'\033[0m'
else
    C_CYAN=""; C_GREEN=""; C_YELLOW=""; C_GRAY=""; C_DKCYAN=""; C_RESET=""
fi
say() { printf '%s%s%s\n' "${2:-}" "$1" "$C_RESET"; }

if [ -z "$target" ]; then
    say "Install QRSPI for which tool?" "$C_CYAN"
    echo "  [1] Claude Code  (~/.claude)"
    echo "  [2] GitHub Copilot  (~/.copilot)"
    echo "  [3] Both"
    read -r -p "Choose 1/2/3: " choice
    case "$choice" in
        1) target="claude" ;;
        2) target="copilot" ;;
        3) target="both" ;;
        *) target="claude" ;;
    esac
fi

# Copy every file under $from into $to, overwriting same-named files.
copy_tree() {
    local from="$1" to="$2" label="$3"
    if [ ! -d "$from" ]; then
        say "missing source: $from" "$C_YELLOW"
        return
    fi
    mkdir -p "$to"
    cp -R "$from"/. "$to"/
    local n
    n="$(find "$from" -type f | wc -l | tr -d ' ')"
    printf '%s  %-22s %s file(s)%s\n' "$C_GREEN" "$label" "$n" "$C_RESET"
}

# Candidate VS Code user-settings.json paths for this OS (stable, Insiders, VSCodium).
vscode_settings_paths() {
    local base
    case "$(uname -s)" in
        Darwin) base="$HOME/Library/Application Support" ;;
        *)      base="${XDG_CONFIG_HOME:-$HOME/.config}" ;;
    esac
    local dir
    for dir in "Code" "Code - Insiders" "VSCodium"; do
        printf '%s/%s/User/settings.json\n' "$base" "$dir"
    done
}

# Offer to add the three chat.*FilesLocations entries that point VS Code at ~/.copilot.
# Edits text (not a JSON round-trip) so comments/trailing commas in settings.json survive.
add_copilot_settings() {
    local settings="$1"
    local keys=("chat.promptFilesLocations" "chat.agentFilesLocations" "chat.instructionsFilesLocations")
    local paths=("~/.copilot/prompts" "~/.copilot/agents" "~/.copilot/instructions")

    local text=""
    if [ -f "$settings" ]; then
        text="$(cat "$settings")"
    else
        text=$'{\n}\n'
    fi

    local inject=()
    local i
    for i in "${!keys[@]}"; do
        local key="${keys[$i]}" path="${paths[$i]}"
        if printf '%s' "$text" | grep -qF -- "$path"; then
            printf '%s    ok (already set)  %s%s\n' "$C_GRAY" "$key" "$C_RESET"
        elif printf '%s' "$text" | grep -qF -- "\"$key\""; then
            say "    $key exists but lacks $path — add \"$path\": true to it by hand." "$C_YELLOW"
        else
            inject+=("    \"$key\": { \"$path\": true },")
        fi
    done

    if [ ${#inject[@]} -eq 0 ]; then
        say "  VS Code settings already wired for ~/.copilot." "$C_GREEN"
        return
    fi

    say "" ""
    say "  Add to $settings :" "$C_CYAN"
    local line
    for line in "${inject[@]}"; do say "  $line" "$C_YELLOW"; done
    read -r -p "  Patch settings.json now? (y/N) " ans
    case "$ans" in
        y|Y|yes|Yes) ;;
        *) say "  Skipped — add the lines above by hand to enable the prompts." "$C_DKCYAN"; return ;;
    esac

    # Insert just after the first '{'.
    if ! printf '%s' "$text" | grep -q '{'; then
        say "  $settings is not a JSON object; skipped." "$C_YELLOW"
        return
    fi

    if [ -f "$settings" ]; then
        local bak="$settings.qrspi-$(date +%Y%m%d-%H%M%S).bak"
        cp "$settings" "$bak"
        say "  backup -> $bak" "$C_GRAY"
    else
        mkdir -p "$(dirname -- "$settings")"
    fi

    local block
    block="$(printf '%s\n' "${inject[@]}")"
    # Replace the first '{' with '{\n<block>'. awk handles the one-shot substitution.
    awk -v block="$block" '
        !done && /{/ {
            pos = index($0, "{")
            printf "%s{\n%s%s\n", substr($0, 1, pos - 1), block, substr($0, pos + 1)
            done = 1
            next
        }
        { print }
    ' <<<"$text" >"$settings"
    say "  Patched. Reload the VS Code window (Developer: Reload Window)." "$C_GREEN"
}

if [ "$target" = "claude" ] || [ "$target" = "both" ]; then
    dst="$HOME/.claude"
    say "" ""
    say "Installing Claude Code kit -> $dst" "$C_CYAN"
    copy_tree "$src/claude/agents"        "$dst/agents"             "agents"
    copy_tree "$src/claude/commands"      "$dst/commands"           "commands"
    copy_tree "$src/claude/skills"        "$dst/skills"             "skills"
    copy_tree "$src/openspec-templates"   "$dst/openspec-templates" "openspec-templates"
    say "Claude: restart Claude Code, then run /qrspi in any repo to verify." "$C_DKCYAN"
fi

if [ "$target" = "copilot" ] || [ "$target" = "both" ]; then
    dst="$HOME/.copilot"
    say "" ""
    say "Installing GitHub Copilot kit -> $dst" "$C_CYAN"
    copy_tree "$src/copilot/agents"       "$dst/agents"             "agents"
    copy_tree "$src/copilot/instructions" "$dst/instructions"       "instructions"
    copy_tree "$src/copilot/prompts"      "$dst/prompts"            "prompts"
    copy_tree "$src/openspec-templates"   "$dst/openspec-templates" "openspec-templates"
    say "Copilot: VS Code only reads these once its chat.*FilesLocations point at ~/.copilot." "$C_DKCYAN"
    if [ "$skip_settings" -eq 1 ]; then
        say "  (--skip-settings) add by hand to your user settings.json:" "$C_DKCYAN"
        say '           "chat.promptFilesLocations":       { "~/.copilot/prompts": true },' "$C_YELLOW"
        say '           "chat.agentFilesLocations":        { "~/.copilot/agents": true },' "$C_YELLOW"
        say '           "chat.instructionsFilesLocations": { "~/.copilot/instructions": true }' "$C_YELLOW"
    else
        found=()
        while IFS= read -r s; do
            [ -d "$(dirname -- "$s")" ] && found+=("$s")
        done < <(vscode_settings_paths)
        if [ ${#found[@]} -eq 0 ]; then
            say "  No VS Code install detected. Add the chat.*FilesLocations keys by hand," "$C_DKCYAN"
            say "  or re-run with the editor installed." "$C_DKCYAN"
        else
            for s in "${found[@]}"; do add_copilot_settings "$s"; done
        fi
    fi
    say "Then reload the VS Code window and type / in Copilot Chat to see the qrspi prompts." "$C_DKCYAN"
fi

say "" ""
say "Done ($target)." "$C_CYAN"
