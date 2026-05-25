#!/usr/bin/env bash
# start-dev.sh — Launch JupyterLab in dev mode with the code-optimizer extension.
# Run from the repo root:  bash scripts/start-dev.sh

set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ── 1. Python venv check ────────────────────────────────────────────────────
JUPYTER="$REPO_ROOT/jl-env/bin/jupyter"
if [[ ! -x "$JUPYTER" ]]; then
  echo "ERROR: jl-env not found. Create it first:"
  echo "  python3 -m venv jl-env && jl-env/bin/pip install -e '.[dev]'"
  exit 1
fi

# ── 2. Node.js check (nvm aware) ────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  # Try loading nvm
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  [[ -s "$NVM_DIR/nvm.sh" ]] && source "$NVM_DIR/nvm.sh"
fi

if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js not found. Install via nvm:"
  echo "  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
  echo "  nvm install 20"
  exit 1
fi

NODE_BIN="$(dirname "$(command -v node)")"
echo "Using node: $(node --version)  at $NODE_BIN"
echo "Using jupyter: $("$JUPYTER" --version | head -1)"

# ── 3. Launch ────────────────────────────────────────────────────────────────
echo ""
echo "Starting JupyterLab (dev mode) at http://127.0.0.1:8888/lab"
echo "Optimizer buttons: ⚡ in the notebook toolbar (Optimize All) and on each code cell."
echo "To set your Gemini API key: Settings → Code Optimizer → LLM API Key"
echo ""

exec env PATH="$NODE_BIN:$PATH" "$JUPYTER" lab \
  --dev-mode \
  --no-browser \
  --port=8888 \
  --ip=127.0.0.1 \
  --NotebookApp.token="" \
  --NotebookApp.password=""
