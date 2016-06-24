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

The `examples/` directory contains a few stand-alone examples of components in
the package, such as a simple notebook on a page, a console, terminal,
filebrowser, etc.

### Testing: `test/`

The tests are stored and run in the `test/` directory. The source files are in
`test/src/`.

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

*Note: See the README for the most up to date instructions as well as added details.*

All the instructions below assume you are in the root directory of the repository.

### Build, install and run the development version

To build and install a development version of the server extension, do:

    pip install -e .

 This command will build the npm package, build and webpack the server
 extension javascript, and install the appropriate links into your python
 environment.

 To enable the server extension, do:

    jupyter serverextension enable --sys-prefix --py jupyterlab

 after installation. Then start up JupyterLab with:

    jupyter lab

### Rebuild JavaScript
To rebuild the javascript for both the JupyterLab source and the server extension, run:

    npm run build:all

To rebuild JupyterLab source only, run:

    npm run build:src

To have the system rebuild the JupyterLab source automatically after every
change to the typescript source files, run:

    npm run watch:src

To rebuild the javascript for only the server extension, run:

    npm run build:serverextension


To have the system do both automatically after every change to the typescript
source files, run:

    npm run watch

and refresh your browser after each successful update.

### Build npm package

To build just the `jupyterlab` npm package, run:

	npm install
	npm run build

### Run tests

To run the tests, build the npm package and run tests:

    npm install
    npm run build
    npm test

### Build documentation

To build the docs:

    npm run docs

and go to `docs/index.html`. An automatically-generated version of the docs is
hosted at http://jupyter.org/jupyterlab/.
