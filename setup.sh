#!/usr/bin/env bash
# One-time setup. Safe to run again.
#   ./setup.sh            ffmpeg, Node.js and Puppeteer
#   ./setup.sh --cutout   also PyTorch, for the looks that cut you out of the background
set -euo pipefail
cd "$(dirname "$0")"
need() { command -v "$1" >/dev/null 2>&1; }
if [ "$(uname)" = "Darwin" ] && ! need brew; then
  echo "Install Homebrew first: https://brew.sh  (then run ./setup.sh again)"; exit 1; fi
install() { # install <command> <brew package> <apt package>
  need "$1" && { echo "ok  $1"; return; }
  if need brew; then brew install "$2"; elif need apt-get; then sudo apt-get install -y "$3"
  else echo "Please install $1 yourself, then run ./setup.sh again"; exit 1; fi; }
install ffmpeg ffmpeg ffmpeg
install node node nodejs
install python3 python python3
npm install --no-fund --no-audit
if [ "${1:-}" = "--cutout" ]; then python3 -m pip install --user torch torchvision; fi
echo
echo "All set. Try it:"
echo "  ./extract.sh your-clip.mov 0 3"
echo "  node render.js looks/glass.html"
