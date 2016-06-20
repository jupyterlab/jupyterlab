# General Codebase Orientation

The `jupyter/jupyterlab` repository contains two packages:

- an npm package indicated by a `package.json` file in the repo's root directory
- a Python package indicated by a `setup.py` file in the repo's root directory

Th npm package and the Python package are both named `jupyterlab`.

## Directories

### NPM package: `src/`, `lib/`, `typings/`, `scripts/`

* `src/`: the source typescript files.
    - `npm run build` builds the source files into javascript files in `lib/`.
    - `npm run clean` deletes the `lib/` directory.
* `typings/`: type definitions for external libraries that typescript needs.
* `scripts/`: various scripts that the npm commands invoke.

### Examples: `examples/`

The `examples/` directory contains a few stand-alone examples of components in the package, such as a simple notebook on a page, a console, terminal, filebrowser, etc.

### Testing: `test/`

The tests are stored and run in the `test/` directory. The source files are in `test/src/`.

### Notebook extension: `jupyterlab/`

The `jupyterlab/` directory contains the Jupyter server extension.

The server extension includes a private npm package in order to build the
**webpack bundle** which the extension serves. The private npm package depends
on the `jupyterlab` npm package found in the repo's root directory.

### Git hooks: `git-hooks/`

The `git-hooks/` directory stores some convenience git hooks that automatically
rebuild the npm package and server extension every time you check out or merge
(via pull request or direct push to master) in the git repo.

### Documentation: `docs/`

After building the docs (`npm run docs`), `docs/index.html` is the entry
point to the documentation.

## Development Quickstart

All the instructions below assume you are in the root directory of the repository. See the README for more instructions (which may be more up to date as well).

To build and install a development version of the server extension, do `pip install -e .` (this will build the npm package, build and webpack the server extension javascript, and install the appropriate links into your python environment). To enable the server extension, do `jupyter serverextension enable --sys-prefix --py jupyterlab` after installation. Then start up JupyterLab with `jupyter lab`.

To rebuild the javascript for the server extension, do `npm run build:serverextension`. To have the system do this automatically after every change to the typescript source files, do `npm run watch:serverextension` and refresh your browser after each successful update.

To build just the `jupyterlab` npm package, do `npm install` and then `npm run build`. To run the tests, build the npm package, then do `npm test`. To build the docs, do `npm run docs` and go to `docs/index.html`. An automatically-generated version of the docs is hosted at http://jupyter.org/jupyterlab/.
