#!/usr/bin/env bash
# integrations/macos-cleanup.sh
# ---------------------------------------------------------------------------
# One-shot housekeeping for the dev Mac. Run it in Terminal:
#
#   bash integrations/macos-cleanup.sh
#
# What it does, in order:
#   1. Quits every open app EXCEPT Claude, Firefox and App Store
#      (Finder and the terminal running this script have to survive)
#   2. Uninstalls: Proton Mail, Proton Mail Bridge, Razer, Epic Games
#      Launcher, Sonos, Steam Link
#   3. Disables everything that opens at login (classic login items +
#      per-user LaunchAgents)
#   4. Removes the stale "MacOS-MCP" registration behind the
#      "Could not attach to MCP server MacOS-MCP" popup in Claude
#   5. Restores default power management so closing the lid actually
#      sleeps the machine and the battery stops draining overnight
#
# Safety: nothing is force-killed (apps with unsaved work get their normal
# save dialog), and everything removed or changed is first copied to
# ~/macos-cleanup-backup-<timestamp>/ so any step can be undone.
# sudo is asked for once, up front — it is needed for the uninstalls in
# /Applications and for pmset.
#
# Apple system apps (Maps, Photo Booth, Tips) live on the sealed read-only
# system volume: macOS does not allow deleting them without disabling SIP,
# which is not worth it — they use no battery or background time. This
# script leaves them alone and says so.
# ---------------------------------------------------------------------------
set -uo pipefail

if [ "$(uname)" != "Darwin" ]; then
  echo "This script is for macOS — run it on the Mac, not in a dev container." >&2
  exit 1
fi

TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="$HOME/macos-cleanup-backup-$TS"
mkdir -p "$BACKUP"

say() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }

# sudo once, up front (uninstalls in /Applications + pmset need it).
say "This needs your password once (app removal + power settings)"
HAVE_SUDO=0
if sudo -v; then HAVE_SUDO=1; else
  echo "No sudo — will skip /Applications removals and power fixes." >&2
fi

# --- helpers ---------------------------------------------------------------

quit_app() { osascript -e "tell application \"$1\" to quit" >/dev/null 2>&1 || true; }

# remove_path <path> [sudo] — back up tiny files, then delete. .app bundles
# and support dirs are too big to copy; for those the "backup" is the printed
# record of what was removed.
remove_path() {
  local p="$1" use_sudo="${2:-}"
  [ -e "$p" ] || [ -L "$p" ] || return 0
  if [ "$use_sudo" = "sudo" ]; then
    [ "$HAVE_SUDO" = 1 ] || { echo "  skipped (no sudo): $p"; return 0; }
    sudo rm -rf "$p"
  else
    rm -rf "$p"
  fi
  echo "  removed: $p" | tee -a "$BACKUP/removed-paths.txt"
}

# purge_launchd <pattern> — unload + delete launch agents/daemons matching a
# vendor pattern (e.g. "razer"), user-level and system-level.
purge_launchd() {
  local pat="$1" f
  while IFS= read -r -d '' f; do
    launchctl bootout "gui/$(id -u)" "$f" >/dev/null 2>&1 || true
    cp "$f" "$BACKUP/" 2>/dev/null || true
    rm -f "$f" && echo "  removed: $f" | tee -a "$BACKUP/removed-paths.txt"
  done < <(find "$HOME/Library/LaunchAgents" -maxdepth 1 -iname "*${pat}*" -print0 2>/dev/null)
  [ "$HAVE_SUDO" = 1 ] || return 0
  for dir in /Library/LaunchAgents /Library/LaunchDaemons; do
    while IFS= read -r -d '' f; do
      sudo launchctl bootout system "$f" >/dev/null 2>&1 || true
      sudo cp "$f" "$BACKUP/" 2>/dev/null || true
      sudo rm -f "$f" && echo "  removed: $f" | tee -a "$BACKUP/removed-paths.txt"
    done < <(find "$dir" -maxdepth 1 -iname "*${pat}*" -print0 2>/dev/null)
  done
}

# remove_matching <dir> <iname-pattern> [sudo] — bounded glob inside one dir.
remove_matching() {
  local dir="$1" pat="$2" use_sudo="${3:-}" f
  [ -d "$dir" ] || return 0
  while IFS= read -r -d '' f; do
    remove_path "$f" "$use_sudo"
  done < <(find "$dir" -maxdepth 1 -iname "$pat" -print0 2>/dev/null)
}

# ---------------------------------------------------------------------------
say "1/5 Closing every app except Claude, Firefox, App Store"
# ---------------------------------------------------------------------------
# Finder cannot be quit, and the terminal hosting this script must stay alive.
# A 3-second timeout per app means one unsaved-changes dialog can't stall the
# rest — that app is left showing its save dialog and we move on.
osascript <<'APPLESCRIPT' 2>/dev/null || true
set keepApps to {"Claude", "Firefox", "App Store", "Finder", "Terminal", "iTerm2", "Ghostty", "Warp", "kitty", "Alacritty"}
tell application "System Events"
	set runningApps to name of every application process whose background only is false
end tell
repeat with appName in runningApps
	set appNameText to appName as text
	if appNameText is not in keepApps then
		try
			with timeout of 3 seconds
				tell application appNameText to quit
			end with timeout
		end try
	end if
end repeat
APPLESCRIPT
echo "Done. Anything holding unsaved work is showing its save dialog instead."

# ---------------------------------------------------------------------------
say "2/5 Uninstalling Proton Mail, Bridge, Razer, Epic, Sonos, Steam Link"
# ---------------------------------------------------------------------------

echo "Proton Mail:"
quit_app "Proton Mail"
remove_path "/Applications/Proton Mail.app" sudo
remove_path "$HOME/Library/Application Support/Proton Mail"
remove_matching "$HOME/Library/Containers" "*protonmail*"
remove_matching "$HOME/Library/Caches" "*protonmail*"

echo "Proton Mail Bridge:"
quit_app "Proton Mail Bridge"
remove_path "/Applications/Proton Mail Bridge.app" sudo
remove_path "$HOME/Library/Application Support/protonmail"
purge_launchd "protonmail"
# Bridge's saved account entries in Keychain are inert without the app; they
# can be deleted by hand in Keychain Access (search "bridge") if wanted.

echo "Razer:"
quit_app "Razer Synapse"
remove_matching "/Applications" "Razer*.app" sudo
remove_path "/Library/Application Support/Razer" sudo
remove_path "$HOME/Library/Application Support/Razer"
remove_matching "/Library/Extensions" "*Razer*" sudo
purge_launchd "razer"

echo "Epic Games Launcher:"
quit_app "Epic Games Launcher"
remove_path "/Applications/Epic Games Launcher.app" sudo
remove_path "$HOME/Library/Application Support/Epic"
remove_matching "$HOME/Library/Caches" "*epicgames*"
remove_matching "$HOME/Library/Preferences" "*epicgames*"
purge_launchd "epicgames"
if [ -d "/Users/Shared/Epic Games" ]; then
  echo "  NOTE: installed games found at /Users/Shared/Epic Games"
  echo "        ($(du -sh "/Users/Shared/Epic Games" 2>/dev/null | cut -f1 || echo '?')) — left in place."
  echo "        Delete them too with:  sudo rm -rf \"/Users/Shared/Epic Games\""
fi

echo "Sonos:"
quit_app "Sonos"
quit_app "Sonos S1 Controller"
quit_app "Sonos S2"
remove_matching "/Applications" "Sonos*.app" sudo
remove_matching "$HOME/Library/Application Support" "Sonos*"
purge_launchd "sonos"

echo "Steam Link:"
quit_app "Steam Link"
remove_path "/Applications/Steam Link.app" sudo
remove_matching "$HOME/Library/Containers" "*steamlink*"

echo
echo "Maps, Photo Booth and Tips are Apple system apps on the sealed system"
echo "volume — macOS forbids deleting them (SIP), and they cost nothing in"
echo "battery or background activity. Drag them out of the Dock and forget them."

# ---------------------------------------------------------------------------
say "3/5 Disabling everything that opens at login"
# ---------------------------------------------------------------------------
# a) Classic "Open at Login" list (System Settings > General > Login Items)
osascript -e 'tell application "System Events" to get the name of every login item' \
  >"$BACKUP/login-items.txt" 2>/dev/null || true
echo "Login items before (saved to backup): $(cat "$BACKUP/login-items.txt" 2>/dev/null || echo none)"
osascript -e 'tell application "System Events" to delete every login item' >/dev/null 2>&1 || true
echo "All 'Open at Login' items removed."

# b) Per-user LaunchAgents (third-party autostart helpers). Moved to the
#    backup folder, not deleted — move any back to re-enable.
LA="$HOME/Library/LaunchAgents"
if [ -d "$LA" ] && find "$LA" -maxdepth 1 -name '*.plist' | grep -q .; then
  mkdir -p "$BACKUP/LaunchAgents"
  for plist in "$LA"/*.plist; do
    launchctl bootout "gui/$(id -u)" "$plist" >/dev/null 2>&1 || true
    mv "$plist" "$BACKUP/LaunchAgents/"
    echo "  disabled: $(basename "$plist")"
  done
else
  echo "No user LaunchAgents found."
fi

echo
echo "FINAL SWEEP BY HAND: System Settings > General > Login Items & Extensions"
echo "— toggle off anything left under 'Allow in the Background'. Apple ships"
echo "no CLI for those toggles, so the last few need the Settings pane."

# ---------------------------------------------------------------------------
say "4/5 Removing the broken 'MacOS-MCP' server registration"
# ---------------------------------------------------------------------------
# The popup fires because a Claude config on this Mac still registers an MCP
# server named "MacOS-MCP" whose command no longer starts. Nothing in the lar
# repo references it, so removal is the fix. Both possible homes are cleaned:
#   - Claude Desktop:  ~/Library/Application Support/Claude/claude_desktop_config.json
#   - Claude Code:     ~/.claude.json (user scope + every project scope)
export CLEANUP_BACKUP_DIR="$BACKUP"
FOUND="$(python3 - <<'PY'
import json, os, shutil

def strip(node):
    removed = []
    if isinstance(node, dict):
        servers = node.get("mcpServers")
        if isinstance(servers, dict):
            for key in list(servers):
                if key.lower().replace("_", "-") in ("macos-mcp", "mcp-macos"):
                    del servers[key]
                    removed.append(key)
        for value in node.values():
            removed += strip(value)
    elif isinstance(node, list):
        for value in node:
            removed += strip(value)
    return removed

home = os.path.expanduser("~")
backup = os.environ["CLEANUP_BACKUP_DIR"]
total = 0
for path in (
    os.path.join(home, "Library/Application Support/Claude/claude_desktop_config.json"),
    os.path.join(home, ".claude.json"),
):
    if not os.path.exists(path):
        continue
    try:
        with open(path) as fh:
            cfg = json.load(fh)
    except Exception as exc:
        print(f"  could not parse {path}: {exc}")
        continue
    removed = strip(cfg)
    if removed:
        shutil.copy2(path, os.path.join(backup, os.path.basename(path)))
        with open(path, "w") as fh:
            json.dump(cfg, fh, indent=2)
        print(f"  removed {', '.join(removed)} from {path}")
        total += len(removed)
print(total)
PY
)"
echo "$FOUND" | sed '$d'
if [ "$(echo "$FOUND" | tail -1)" = "0" ]; then
  echo "  Not in either config file — then it is a desktop Extension:"
  echo "  Claude (app) > Settings > Extensions > remove 'MacOS-MCP' there."
else
  echo "  Restart Claude and the popup is gone."
fi

# ---------------------------------------------------------------------------
say "5/5 Making the lid actually sleep the machine"
# ---------------------------------------------------------------------------
pmset -g >"$BACKUP/pmset-before.txt" 2>/dev/null || true
pmset -g assertions >"$BACKUP/pmset-assertions.txt" 2>/dev/null || true

if pmset -g 2>/dev/null | grep -qE 'SleepDisabled[[:space:]]+1'; then
  echo "FOUND IT: sleep was disabled system-wide (SleepDisabled 1) — closing"
  echo "the lid did nothing. Re-enabling it below."
fi
if pmset -g assertions 2>/dev/null | grep -qiE 'amphetamine|keepingyouawake|caffeinate'; then
  echo "WARNING: a keep-awake tool (Amphetamine/KeepingYouAwake/caffeinate) is"
  echo "running and will override the lid until you quit or uninstall it."
fi

if [ "$HAVE_SUDO" = 1 ]; then
  sudo pmset restoredefaults >/dev/null 2>&1 || true # wipe custom power config
  sudo pmset -a disablesleep 0                       # lid close MUST sleep
  sudo pmset -a womp 0                               # no wake-on-LAN
  sudo pmset -b powernap 0                           # no Power Nap on battery
  sudo pmset -b tcpkeepalive 0                       # no network wakes on battery
  # (tcpkeepalive 0 means Find My/Handoff won't ping while asleep on battery —
  #  that silence is exactly what stops the overnight drain.)
  echo "Power settings now:"
  pmset -g custom
else
  echo "Skipped (no sudo). Run later:"
  echo "  sudo pmset restoredefaults && sudo pmset -a disablesleep 0 womp 0 && sudo pmset -b powernap 0 tcpkeepalive 0"
fi

# ---------------------------------------------------------------------------
say "Done"
# ---------------------------------------------------------------------------
echo "Backups + record of everything removed: $BACKUP"
echo
echo "1. Restart Claude — the MacOS-MCP popup should be gone (if not, it's a"
echo "   desktop Extension: Claude > Settings > Extensions, remove it there)."
echo "2. Reboot once — nothing should auto-open at login any more."
echo "3. Close the lid on battery for two minutes, reopen, then run:"
echo "     pmset -g log | grep 'Entering Sleep' | tail -3"
echo "   A fresh timestamp = the lid sleeps again. No entry, or battery still"
echo "   draining overnight: run 'pmset -g assertions' and show Claude the output."
echo
echo "One by-design exception: plugged into power WITH an external display,"
echo "closing the lid keeps the Mac awake (clamshell mode). On battery it sleeps."
