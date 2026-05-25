# @jupyterlab/code-optimizer-extension

JupyterLab extension that adds AI-powered code optimization to notebooks using Google Gemini, with a rule-based fallback when no API key is configured.

## How to Run

From the repo root:

```bash
bash scripts/start-dev.sh
```

Then open **http://127.0.0.1:8888/lab** in your browser.

> The extension runs in dev mode — no separate install step needed.

## Setting Up Gemini (Required for AI optimization)

1. Open JupyterLab in the browser
2. Go to **Settings → Settings Editor → Code Optimizer**
3. Fill in:
   - **LLM Provider**: `google`
   - **LLM Model**: `gemini-2.0-flash`
   - **LLM API Key**: your Gemini key from [aistudio.google.com](https://aistudio.google.com)

Your settings are saved locally and never committed to git.

> **Quota note**: The free tier of Gemini API has limited daily requests. If you see "quota exceeded", enable billing at [aistudio.google.com](https://aistudio.google.com) or wait for the daily reset.

## Using the Optimizer

Two buttons appear in every notebook:

| Button | Location | What it does |
|--------|----------|--------------|
| ⚡ **Optimize All** | Notebook toolbar (top) | Optimizes all code cells at once |
| ⚡ | Each cell's toolbar | Optimizes just that one cell |

If Gemini is configured and reachable, it rewrites the code using the LLM. Otherwise it falls back to rule-based optimizations (vectorization hints, loop simplification, etc.).

## Fallback Behavior

- **Gemini working** → AI-optimized code, method shown as `gemini`
- **Quota exceeded** → rule-based + message pointing to aistudio.google.com billing
- **No API key** → rule-based optimization only

## Troubleshooting

**JupyterLab won't start** — make sure Node.js is installed via nvm:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 20
```

**Extension buttons not visible** — the extension only loads in `--dev-mode`. Always use `scripts/start-dev.sh` to start the server.
