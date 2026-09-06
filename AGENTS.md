# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## Documentation and Resources

- **Contributing guide**: `docs/source/developer/contributing.md` (build, test, lint commands)
- **Repository structure**: `docs/source/developer/repo.md` (monorepo layout, packages)
- **Design patterns**: `docs/source/developer/patterns.md` (Lumino patterns, signals, disposables)
- **Extension plugin examples**: `packages/*-extension/src/index.ts`
- **TypeScript Style Guide**: https://github.com/jupyterlab/jupyterlab/wiki/TypeScript-Style-Guide

## Technology Stack

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

### Import Paths

- **Do**: Import from package entry points: `import { Widget } from '@lumino/widgets'`
- **Don't**: Import from internal paths: `import { Widget } from '@lumino/widgets/lib/widget'`

### React Components

- **Do**: Use functional components with hooks for new code
- **Do**: Follow existing patterns in `@jupyterlab/ui-components`

## Naming Conventions

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

## Key File Locations

- Extension plugin patterns: `packages/*-extension/src/index.ts`
- Settings schemas: `packages/*/schema/*.json`
- Jest test helpers: `testutils/` (`@jupyterlab/testutils`)
- UI test framework: `galata/`
