#!/usr/bin/env bash
# Packages a clean, itch.io-ready HTML5 build: index.html, style.css, icon.png,
# and js/*.js only — no server/, docs/, tests, or dev tooling. itch.io's HTML5
# embed requires index.html at the ZIP ROOT (not inside a subfolder), which is
# exactly what this produces.
#
# Usage: ./build-itch-zip.sh
# Then on itch.io: New Project -> Kind of project: HTML -> upload the zip ->
# check "This file will be played in the browser" -> set viewport 1280x720.
# See docs/itch-io-listing.md for page copy and full step-by-step.
set -euo pipefail
cd "$(dirname "$0")"

OUT="slash-tv-itch.zip"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$STAGE/js"
cp index.html style.css icon.png "$STAGE/"
cp js/*.js "$STAGE/js/"

rm -f "$OUT"
( cd "$STAGE" && zip -rq "$OLDPWD/$OUT" . )
echo "Built $OUT ($(du -h "$OUT" | cut -f1)) — upload this file to itch.io."
