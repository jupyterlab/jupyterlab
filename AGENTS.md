# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## Build Commands

```bash
# Initial setup
pip install -e ".[dev,test]"
jlpm install
jlpm run build              # Build dev mode assets

# Full builds
jlpm run build:core         # Build core mode assets (for production)
jlpm run build:dev:prod     # Build dev mode with production settings
npm run clean:slate         # Complete clean and rebuild
```

## Testing

### TypeScript/JavaScript Tests (Jest)
```bash
jlpm test                   # Run all package tests

# Run tests for a specific package
cd packages/notebook
jlpm run build:test
jlpm test --runInBand       # Use --runInBand for packages that spin up Jupyter Server

# Standard Jest options work
jlpm test --testNamePattern="<pattern>"
jlpm test --watch
```

### Python Tests (Pytest)
```bash
pytest jupyterlab/tests
```

### UI/Integration Tests (Galata/Playwright)
```bash
jlpm run test:galata                           # Run UI tests
PWDEBUG=1 jlpm playwright test <path-to-test>  # Debug UI tests
jlpm run test:benchmark                        # Run performance benchmarks
```

## Linting and Formatting

```bash
jlpm lint                   # Run all formatters and fix issues (prettier, eslint, stylelint)

# Individual tools
jlpm prettier               # Format TS/JS/CSS/JSON/MD files
jlpm eslint                 # Fix TypeScript/JavaScript linting
jlpm stylelint              # Fix CSS linting

# Pre-commit hooks (auto-installed with pip install -e ".[dev,test]")
pre-commit run --all-files  # Run all pre-commit hooks manually
```

## Development Server

```bash
jupyter lab --dev-mode --watch  # Auto-rebuild on TypeScript changes (requires page refresh)
```

## Architecture

### Monorepo Structure

- **packages/**: 100+ TypeScript packages with independent versioning via Lerna
  - Pattern: Core package + `-extension` package (e.g., `notebook` + `notebook-extension`)
  - Key packages: `application`, `apputils`, `cells`, `codeeditor`, `codemirror`, `completer`, `console`, `docmanager`, `filebrowser`, `notebook`, `services`, `terminal`, `ui-components`
- **jupyterlab/**: Python server extension, CLI, and entry points
- **galata/**: Playwright-based UI testing framework
- **buildutils/**: Internal scripts for dependency management and versioning
- **dev_mode/**: Development application directory (uses Rspack)
- **testutils/**: Jest test helpers and mocks (`@jupyterlab/testutils`)

### Technology Stack

- Frontend: TypeScript, React 18, Lumino (widgets), CodeMirror 6
- Backend: Python, Jupyter Server, Tornado, Traitlets
- Build: Rspack, TypeScript, Lerna (independent versioning)
- Package Manager: Yarn via `jlpm` wrapper (locked version in `jupyterlab/yarn.js`)

## Code Style and Patterns

**Follow existing code style and patterns strictly:**
- TypeScript Style Guide: https://github.com/jupyterlab/jupyterlab/wiki/TypeScript-Style-Guide
- Design patterns: `docs/source/developer/patterns.md`
- Look at similar code in `packages/*-extension/` for plugin/extension patterns

### JupyterLab-Specific Patterns

- **Disposables**: Always implement `IDisposable`; call `super.dispose()` last; check `isDisposed` in async operations
- **Signals**: Use `.connect(this._onFoo, this)` pattern for proper cleanup via `Signal.clearData(this)`
- **Command IDs**: Format as `package-name:verb-noun`, group in unexported `CommandIDs` namespace

## Key File Locations

- Test utilities and mocks: `testutils/src/mock.ts`
- Jest debugging: Use `jlpm test:debug:watch` then attach VSCode or Chrome debugger
- UI test results: Download `galata-report` artifact from GitHub Actions
