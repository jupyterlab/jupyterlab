# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## Documentation and Resources

- **Developer documentation**: `docs/source/developer/` (extension dev, patterns, contributing)
- **Design patterns**: `docs/source/developer/patterns.md` (Lumino patterns, signals, disposables)
- **Extension plugin examples**: `packages/*-extension/src/index.ts`
- **TypeScript Style Guide**: https://github.com/jupyterlab/jupyterlab/wiki/TypeScript-Style-Guide

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

## Code Quality Rules

### Logging

- **Don't**: Use `console.log()` for user-facing messages
- **Do**: Use `console.warn()` for non-critical warnings during development
- **Do**: Use `console.error()` for low-level error details not shown in UI

### Type Safety

- **Do**: Define explicit TypeScript interfaces
- **Don't**: Use the `any` type; prefer `unknown` with type guards
- **Do**: Prefer type guards over type casts

## Code Style and Patterns

### Naming Conventions

**TypeScript** (in `packages/*/src/*.ts` files):

- Classes/interfaces: `PascalCase` (e.g., `NotebookPanel`, `IDocumentManager`)
- Functions/variables: `camelCase` (e.g., `activatePlugin`, `currentWidget`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `PLUGIN_ID`, `DEFAULT_TIMEOUT`)
- Private members: prefix with underscore (e.g., `_isDisposed`, `_onModelChanged`)
- Use 2-space indentation

**Python** (in `jupyterlab/*.py` files):

- Follow PEP 8 with 4-space indentation
- Classes: `PascalCase` (e.g., `LabApp`, `ExtensionManager`)
- Functions/variables: `snake_case` (e.g., `get_app_dir`, `build_check`)

For Lumino patterns (disposables, signals, commands, etc.), see `docs/source/developer/patterns.md`.

## Common Pitfalls

### Package Management

- **Do**: Use `jlpm` exclusively for all package operations
- **Don't**: Mix `npm`, `yarn`, or `pnpm` commands with `jlpm`
- **Don't**: Commit `package-lock.json` (this repo uses `yarn.lock`)

### Import Paths

- **Do**: Import from package entry points: `import { Widget } from '@lumino/widgets'`
- **Don't**: Import from internal paths: `import { Widget } from '@lumino/widgets/lib/widget'`

### React Components

- **Do**: Use functional components with hooks for new code
- **Do**: Follow existing patterns in `@jupyterlab/ui-components`

## Key File Locations

- Jest debugging: Use `jlpm test:debug:watch` then attach VSCode or Chrome debugger
- UI test results: Download `galata-report` artifact from GitHub Actions
- Extension plugin patterns: Look at `packages/*-extension/src/index.ts`
- Settings schemas: `packages/*/schema/*.json`
