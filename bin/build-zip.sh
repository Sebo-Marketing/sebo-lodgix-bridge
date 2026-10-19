#!/usr/bin/env bash
# Builds sebo-lodgix-bridge.zip with the plugin in a sebo-lodgix-bridge/ folder, as WordPress installs it.
set -euo pipefail
cd "$(dirname "$0")/.."
out="$PWD/sebo-lodgix-bridge.zip"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir "$tmp/sebo-lodgix-bridge"
rsync -a --exclude .git --exclude .github --exclude tests --exclude bin --exclude '*.zip' --exclude .DS_Store ./ "$tmp/sebo-lodgix-bridge/"
rm -f "$out"
(cd "$tmp" && zip -qr "$out" sebo-lodgix-bridge)
echo "$out"
