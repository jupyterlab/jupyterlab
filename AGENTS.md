# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

We welcome contributions made with AI and expect them to be of the highest quality. Maintainers re-check pull requests locally, often with their own agents at the highest effort level. A pull request helps only when it is at least as good as the result of that check. Read [Linting](#linting), [Tests](#tests) and [Pull Requests](#pull-requests) before you open or update one.

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
- Package Manager: Yarn via `jlpm` wrapper (locked version in `jupyterlab/yarn.js`); run tools with `jlpm <tool>`, never `npx <tool>`

## Code Quality Rules

### Logging

- **Don't**: Use `console.log()` for user-facing messages
- **Do**: Use `console.warn()` for non-critical warnings during development
- **Do**: Use `console.error()` for low-level error details not shown in UI

### Type Safety

- **Do**: Define explicit TypeScript interfaces
- **Don't**: Use the `any` type; prefer `unknown` with type guards
- **Do**: Prefer type guards over type casts

### Code Comments

- **Do**: Match the comment density of the surrounding code; most files have few inline comments
- **Do**: Keep docstrings short (1-4 lines): what it is, plus a non-obvious "why" if there is one
- **Do**: Inside function bodies, comment only constraints or non-obvious reasons the code cannot express
- **Don't**: Describe what the code was before the change or how a bug was found
- **Don't**: Restate what the code already says

### Import Paths

- **Do**: Import from package entry points: `import { Widget } from '@lumino/widgets'`
- **Don't**: Import from internal paths: `import { Widget } from '@lumino/widgets/lib/widget'`

### React Components

- **Do**: Use functional components with hooks for new code
- **Do**: Follow existing patterns in `@jupyterlab/ui-components`

## Linting

- **Do**: Install the pre-commit hooks (`pre-commit install`) and do not skip them with `--no-verify`
- **Do**: Also run `jlpm eslint:base --config eslint.config.typecheck.mjs <changed files>`. Pre-commit does not run the type-aware rules that CI checks, and ESLint warnings do not fail it
- **Don't**: Add new ESLint warnings; existing warnings in the files you change can stay

## Tests

- **Do**: Include tests for changes in behaviour; a change such as a typo fix in a comment needs none
- **Do**: Prefer Jest tests (`packages/*/test/`), and use Galata (Playwright, `galata/test/`) when the behaviour needs a browser
- **Don't**: Add a test that costs more to maintain than the change is worth, such as a new dependency or a 1000-line Jest harness for a two-line fix. Write a short Galata test or no test instead, and say why in "Code changes"
- **Do**: Add a Playwright screenshot test when a visual regression is likely. Crop it to the smallest area that still shows a reviewer the change in context, and follow "Good Practices for Integration tests" in `docs/source/developer/contributing.md`
- **Do**: Make sure a test for a bug fix fails without the fix; commit the test before the fix so a reviewer can check out that commit and see it fail
- **Do**: Rebuild after each source edit, or the tests run the old code: Jest loads the compiled `lib/` (run `jlpm build:test` in the package), and Galata runs against the dev mode build (run `jlpm build` at the repository root)

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

## Pull Requests

### Before You Start

- Look for open pull requests on the same issue: `gh pr list --repo jupyterlab/jupyterlab --search <issue number>`. Open another one only when it differs in a way that matters, and say how under "References"

### Description

- Follow `.github/pull_request_template.md`: keep every heading in its order, and write `None` under a heading that does not apply
- Write for a human reader: short, plain, with no spurious details
- Use "Code changes" to highlight what a reviewer needs to know before reading the diff: API changes, design choices, changed behaviour, and unrelated changes included. Do not list files or tests, and do not walk through the diff: the reviewer reads the code
- Do not state that tests, type checks or lint pass: CI reports them
- Do not add "Generated with ..." footers or other tool adverts; disclose AI use only in the "AI usage" section

### AI Usage and Effort Level

- Name every tool and model used, with the effort (reasoning) level it ran at
- Use the highest effort level the model offers. The second-highest level is accepted only for human-supervised work: a person directed the agent, read the whole diff and ran the change
- When no human supervised the work, answer NO to the question on human review and keep the pull request a draft

### Screenshots and Videos

- For a visual change, include before and after screenshots. Prefer screenshots to a video when the change is static
- For a change in interaction, include a video or a GIF. A Playwright recording is accepted when it shows the cursor, the interactions and captions: use `page.screencast.showActions()` and `page.screencast.showChapter()`
- Leave out the pictures only when a human tested the change in the browser and says so in "User-facing changes"

### Updating the Branch

- Do not rebase, force-push or merge the target branch without a reason. Each push runs CI again, and a rebase during a review removes the commits the reviewer has already seen
- Resolve merge conflicts promptly, by merging the target branch
- When the target branch gets changes that interact with the pull request, merge it, push, and check that CI passes
