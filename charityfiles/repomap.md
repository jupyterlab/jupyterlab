# JupyterLab Repository Map

## 🏗️ High-Level Architecture

JupyterLab is a **monorepo** with independent versioning (Lerna) combining:
- **Frontend**: 60+ TypeScript packages in `packages/` → compiled to JavaScript
- **Backend**: Python server in `jupyterlab/` → Jupyter Server extension
- **Build System**: Rspack/Webpack orchestration in `builder/` and `dev_mode/`
- **Testing**: E2E in `galata/`, unit tests in `tests/` and `testutils/`

---

## 📦 Key Directories

| Directory | What's There | Role |
|-----------|-------------|------|
| **`packages/`** | 60+ TypeScript packages | Core UI, editors, viewers, plugins |
| **`jupyterlab/`** | Python backend code | Server, extension management, HTTP handlers |
| **`builder/` & `buildutils/`** | Build tooling | Rspack config, extension builder CLI |
| **`dev_mode/`** | Dev environment | Webpack dev server, unminified builds |
| **`tests/` & `testutils/`** | Unit tests | Jest test configs and test utilities |
| **`galata/`** | E2E tests | Playwright browser automation tests |
| **`examples/`** | Example apps | Demo projects (app, notebook, console, terminal) |
| **`docs/`** | Documentation | Developer guides, API docs |
| **`jupyter-config/`** | Server config | Extension metadata |

---

## 📦 What's in `packages/` (by category)

### Core Infrastructure
- `application/` — Main app shell
- `services/` — Jupyter Server API client
- `coreutils/`, `apputils/` — Shared utilities
- `codeeditor/`, `codemirror/` — Editor abstraction & CodeMirror 6 integration

### Document & Cell Handling
- `notebook/`, `cells/` — Notebook model & cell widgets
- `outputarea/`, `rendermime/` — Output rendering
- `docmanager/` — Document management

### Viewers & Editors
- `fileeditor/` — Text editor
- `filebrowser/` — File browser
- `terminal/`, `console/` — Terminal & IPython console
- `imageviewer/`, `markdownviewer/`, `csvviewer/`, etc. — Specialized viewers

### Advanced Features
- `debugger/` — Debugger (DAP support)
- `lsp/` — Language Server Protocol
- `notebook-collab-extension/` — Real-time collaboration
- `extensionmanager/` — Extension marketplace

### UI Shell
- `mainmenu/`, `statusbar/`, `toolbar/`, `launcher/` — Main UI components
- `workspaces/`, `toc/` — Workspace & table of contents management

### Utilities
- `settingregistry/`, `settingeditor/` — Settings system
- `translation/` — Internationalization support
- `completer/` — Code completion
- Themes: `theme-dark-extension/`, `theme-light-extension/`
- `markedparser-extension/` — Markdown parsing
- `hub-extension/` — JupyterHub integration

---

## 🐍 Python Backend Structure (`jupyterlab/`)

```
jupyterlab/
├── labapp.py             # Main Jupyter Server extension
├── handlers/             # HTTP handlers for REST API
├── extensions/           # Extension loading infrastructure
├── labextensions.py      # Extension management CLI
├── commands.py           # CLI commands
├── staging/              # Built JS assets (output of npm build)
└── tests/                # Python test suite
```

---

## 🔧 How It's Built

1. **TypeScript packages** (`packages/`) compile → JavaScript
2. **JavaScript bundled** by Rspack → output goes to `jupyterlab/staging/`
3. **Python package** in `jupyterlab/` serves those static assets via Jupyter Server
4. **Delivered** as a single pip-installable package

### Build Commands
```
jlpm install              # Install dependencies
npm run build            # Build everything
npm run watch            # Watch mode (rebuild on changes)
jupyter lab --dev-mode  # Run dev server
jlpm test               # Run tests
```

---

## 📚 Developer Documentation

- [Contributing guide](docs/source/developer/contributing.md) — setup and build commands
- [Repository structure](docs/source/developer/repo.md) — detailed directory guide
- [Design patterns](docs/source/developer/patterns.md) — Lumino signals, disposables, plugin patterns

---

## 🎯 Plugin Architecture

Each feature typically has **two packages**:
- **Model package** (e.g., `notebook/`) — logic, no UI
- **Extension package** (e.g., `notebook-extension/`) — UI, plugin registration

This separation allows the model to be used independently while the extension integrates it into the app.

---

## 🚀 Technology Stack

- **Frontend**: TypeScript, React 18, Lumino (widgets), CodeMirror 6
- **Backend**: Python, Jupyter Server, Tornado, Traitlets
- **Build**: Rspack, TypeScript, Lerna (independent versioning)
- **Package Manager**: Yarn (via `jlpm` wrapper)