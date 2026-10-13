# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

We welcome contributions made with AI and expect them to be of the highest quality. Maintainers re-check pull requests locally, often with their own agents at the highest effort level. An AI-made pull request helps only when it is at least as good as what those agents produce. Read [Linting](#linting), [Tests](#tests) and [Pull Requests](#pull-requests) before you open or update one.

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

- **Do**: Install the pre-commit hooks with `pre-commit install --hook-type pre-commit --hook-type pre-push`, and do not skip them with `--no-verify`
- **Do**: Also run `jlpm eslint:base --config eslint.config.typecheck.mjs <changed .ts and .tsx files>`. CI checks this config and pre-commit does not. ESLint warnings fail neither of them
- **Don't**: Add ESLint warnings, or `eslint-disable` comments that suppress them; existing warnings in the files you change can stay

## Tests

- **Do**: Include tests for changes in behavior; a change such as a typo fix in a comment needs none
- **Do**: Prefer Jest tests (`packages/*/test/`), and use Galata (Playwright, `galata/test/`) when the behavior needs a browser
- **Don't**: Add a test that costs more to maintain than the change is worth. Examples are a test that needs a new dependency, and a 1000-line Jest harness for a two-line fix. Write a short Galata test or no test instead, and say why in the description
- **Do**: Add a Playwright screenshot test when a visual regression is likely. Crop the screenshot to the smallest area that still shows a reviewer the change in context, and follow "Good Practices for Integration tests" in `docs/source/developer/contributing.md`
- **Do**: Commit reference images only if you made them on Linux. If CI makes different ones, use the CI versions, as described in "Visual Regression and UI Tests" in `docs/source/developer/contributing.md`
- **Do**: Make sure a test for a bug fix fails on an assertion without the fix. A compile error or a missing snapshot does not count
- **Do**: Commit the test before the fix, so a reviewer can check out that commit and see the test fail. If the fix is already pushed, add the test in a new commit and do not rebase to reorder the commits
- **Do**: Rebuild after each source edit, or the tests run the old code. Jest loads the compiled `lib/`, so run `jlpm build:test` in the package. Galata runs against the dev mode build, so run `jlpm build` at the repository root

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

- Maintainers first review pull requests that fix bugs or user-visible problems, or that address frequent requests. Pull requests for edge cases that code analysis found, and that users are unlikely to hit, may wait for review until all higher-priority pull requests are merged
- New features, settings, UI changes and public API changes need a maintainer's agreement on the issue first. A `good first issue` or `help wanted` label counts as agreement
- Do not open a pull request for an issue labeled `status:Needs Discussion` or `status:Needs Triage`. An issue that the person you work with or a maintainer filed is fine to work on while it still has `status:Needs Triage`. A comment on any of these issues can be a good contribution, and it needs the same high quality as a pull request
- Add labels with a comment, as described in "Tagging Issues with Labels" in `docs/source/developer/contributing.md`. A pull request needs a label that the "Enforce PR label" check accepts, such as `bug` or `enhancement`. Do not add or remove `status:` labels
- Look for pull requests on the same issue, including closed and merged ones: `gh pr list --repo jupyterlab/jupyterlab --state all --search <issue number>`. Read why the closed ones were closed, and check whether a merged one already fixed the issue. Open another one only when it differs in a way that matters, and say how under "References"
- Report a security vulnerability as described in the [security policy](https://github.com/jupyterlab/jupyterlab/security/policy), instead of opening an issue or a pull request

### Description

- Write the title for users: it becomes the entry in the release notes. Do not use prefixes such as `feat:` or `fix:`
- Follow `.github/pull_request_template.md`: keep every heading in its order, and write `None` under a heading that does not apply. "References" always applies: link at least one issue
- Write for a human reader: short, plain, with no spurious details
- Under "Code changes", write what the template comment asks for. Do not describe the diff change by change: the reviewer reads the code
- Steps to reproduce a bug belong in the issue. Give them in the pull request only when the issue has none or they are hard to follow
- Do not state that tests, type checks or lint pass: CI reports them
- Do not add "Generated with ..." footers or other tool adverts; disclose AI use only in the "AI usage" section

### AI Usage and Effort Level

- In the "AI usage" section, name every tool and model used, with the effort (reasoning) level it ran at. If you do not know the effort level, say so
- Use the highest effort level the model offers. The second-highest level is accepted only for human-supervised work: a person directed the agent, read the whole diff and ran the change
- When no human supervised the work, answer NO to the question on human review and keep the pull request a draft

### Screenshots and Videos

- For a visual change, include before and after screenshots. Prefer screenshots to a video when the change is static
- For a change in interaction, include a video or a GIF. A Playwright recording is accepted when it shows the cursor, the interactions and captions. Record with `page.screencast.start({ path })`, `showActions()` for the cursor and `showChapter()` for captions. Save the file outside `galata/test-results/`: Galata deletes the output of passing tests
- Attach screenshots and videos in the GitHub web interface, and never commit them. If you cannot attach them, keep the pull request a draft and give the files to the person you work with
- Leave out the screenshots and videos only when the person you work with tells you they tested the change in the browser. Write that in "User-facing changes"

### Updating the Branch

- Do not rebase, force-push or merge the target branch without a reason. Each push runs CI again, and a rebase during a review removes the commits the reviewer has already seen
- Pull before you push: maintainers and the snapshot bot add commits to the branch
- Resolve merge conflicts promptly, by merging the target branch
- When the target branch gets changes that interact with the pull request, merge the target branch, push, and check that CI passes

### Helping with Review

- Suggest testing someone else's pull request first when the person you work with has a merged pull request, and either asks for several new ones at once or already has one open. Pick one labeled `status:Needs Review`, or one that fixes a reported bug
- Test the pull request with Playwright in a container or a codespace without your credentials, because its build scripts run there. Reproduce the problem on `main`, repeat the steps on the pull request branch, and record both runs
- Draft a comment only for a failure a user would hit, with steps and the recording, or to confirm that a bug seen on `main` is gone. Leave out code style, guesses and anything that did not fail
- Do not post the comment yourself. The person you work with watches the recordings, edits the draft and posts it as a comment, never as an approval or a change request

## Core Maintainers

Agents run by core maintainers may be exempt from some of these rules. The maintainer decides which.
