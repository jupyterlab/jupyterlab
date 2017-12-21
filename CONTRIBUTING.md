# Contributing to JupyterLab

If you're reading this section, you're probably interested in contributing to
JupyterLab.  Welcome and thanks for your interest in contributing!

Please take a look at the Contributor documentation, familiarize yourself with
using the Jupyter Notebook, and introduce yourself on the mailing list and share
what area of the project you are interested in working on.

We have labeled some issues as [good first issue](https://github.com/jupyterlab/jupyterlab/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22)
that we believe are good examples of small, self contained changes.
We encourage those that are new to the code base to implement and/or ask
questions about these issues.


## General Guidelines

For general documentation about contributing to Jupyter projects, see the
[Project Jupyter Contributor Documentation](https://jupyter.readthedocs.io/en/latest/contributor/content-contributor.html).

All source code is written in [TypeScript](http://www.typescriptlang.org/Handbook). See the [Style Guide](https://github.com/jupyterlab/jupyterlab/wiki/TypeScript-Style-Guide).


## Setting Up a Development Environment

### Installing Node.js and jlpm

Building the JupyterLab from its GitHub source code requires Node.js version
4+.

If you use ``conda``, you can get it with:

```bash
conda install -c conda-forge nodejs
```

If you use [Homebrew](http://brew.sh/) on Mac OS X:

```bash
brew install node
```

You can also use the installer from the [Node.js](https://nodejs.org) website.


## Installing JupyterLab

JupyterLab requires Jupyter Notebook version 4.3 or later.

If you use ``conda``, you can install notebook using:

```bash
conda install -c conda-forge notebook
```

You may also want to install `nb_conda_kernels` to have a kernel option for different [conda environments](http://conda.pydata.org/docs/using/envs.html)

```bash
conda install -c conda-forge nb_conda_kernels
```

If you use `pip` you can install notebook using:

```bash
pip install notebook
```

Fork the JupyterLab [repository](https://github.com/jupyterlab/jupyterlab).

Once you have installed the dependencies mentioned above, use the following
steps:

```bash
git clone https://github.com/<your-github-username>/jupyterlab.git
cd jupyterlab
pip install -e .
jlpm install
jlpm run build  # Build the dev mode assets (optional)
jlpm run build:core  # Build the core mode assets (optional)
jupyter lab build  # Build the app dir assets (optional)
jupyter serverextension enable --py jupyterlab  # (optional)
```

Notes:

* The `jlpm` command is a JupyterLab-provided, locked version of the [yarn](https://yarnpkg.com/en/) package manager.  If you have `yarn` installed
already, you can use the `yarn` command when developing, and it will use the
local version of `yarn` in `jupyterlab/yarn.js` when run in the repository or
a built application directory.

* At times, it may be necessary to clean your local repo with the command `jlpm run clean:slate`.  This will clean the repository, and re-install and
rebuild.

* If `pip` gives a `VersionConflict` error, it usually means that the installed
version of `jupyterlab_launcher` is out of date. Run `pip install --upgrade
jupyterlab_launcher` to get the latest version.

* To install JupyterLab in isolation for a single conda/virtual environment, you can add the `--sys-prefix` flag to the extension activation above; this will tie the installation to the `sys.prefix` location of your environment, without writing anything in your user-wide settings area (which are visible to all your envs):

* You can run `jlpm run build:main:prod` to build more accurate sourcemaps that show the original
  Typescript code when debugging. However, it takes a bit longer to build the sources, so is used only to build for production
  by default.

```
jupyter serverextension enable --py --sys-prefix jupyterlab
```

### Run JupyterLab

Start JupyterLab in development mode:

```bash
jupyter lab --dev-mode
```

Development mode ensures that you are running the JavaScript assets that are
built in the dev-installed Python package.  When running from source in development
mode, the page will have a red stripe at the top to indicate it is an unreleased version.

### Build and run the tests

```bash
jlpm run build:test
jlpm test
```

### Build and run the stand-alone examples

To install and build the examples in the `examples` directory:

```bash
jlpm run build:examples
```

To run a specific example, change to the example's directory (i.e.
`examples/filebrowser`) and enter:

```bash
python main.py
```

----

## High level Architecture

The JupyterLab application is made up of two major parts:

- an npm package
- a Jupyter server extension (Python package)

Each part is named `jupyterlab`. The [developer tutorial documentation](https://jupyterlab-tutorial.readthedocs.io/en/latest/index.html)
provides additional architecture information.

## The NPM Packages

The repository consists of many npm packages that are managed using the lerna
build tool.  The npm package source files are in the `packages/` subdirectory.

### Build the NPM Packages from Source

```bash
git clone https://github.com/jupyterlab/jupyterlab.git
cd jupyterlab
pip install -e .
jlpm
jlpm run build:packages
```

**Rebuild**

```bash
jlpm run clean
jlpm run build:packages
```

## The Jupyter Server Extension

The Jupyter server extension source files are in the `jupyterlab/`
subdirectory. To use this extension, make sure the Jupyter notebook server
version 4.3 or later is installed.

### Build the JupyterLab server extension

When you make a change to JupyterLab npm package source files, run:

```bash
jlpm run build
```

to build the changes and then refresh your browser to see the changes.

To have the system build after each source file change, run:

```bash
jupyter lab --dev-mode --watch
```

You can also run `jupyter lab --dev-mode --fast-watch` to skip
the initial build if the assets are already built.


## Build Utilities

There are a series of build utilities for maintaining the repository.
To get a suggested version for a library use `jlpm run get:dependency foo`.
To update the version of a library across the repo use `jlpm run update:dependency foo@^x.x`.
To remove an unwanted dependency use `jlpm run remove:dependency foo`.

The key utility is `jlpm run integrity`, which ensures the integrity of
the packages in the repo. It will:

- Ensure the core package version dependencies match everywhere.
- Ensure imported packages match dependencies.
- Ensure a consistent version of all packages.
- Manage the meta package.

The `packages/metapackage` package is used to build all of the TypeScript
in the repository at once, instead of 50+ individual builds.

The integrity script also allows you to automatically add a dependency for
a package by importing from it in the TypeScript file, and then running:
`jlpm run integrity` from the repo root.

We also have scripts for creating and removing packages in `packages/`,
`jlpm run create:package` and `jlpm run remove:package`.


## Notes

- By default, the application will load from the JupyterLab staging directory (default is `<sys-prefix>/share/jupyter/lab/build`.  If you wish to run
the core application in `<git root>/jupyterlab/build`,
run `jupyter lab --core-mode`.  This is the core application that will
be shipped.

- If working with extensions, see the extension documentation on
https://jupyterlab-tutorial.readthedocs.io/en/latest/index.html.

- The npm modules are fully compatible with Node/Babel/ES6/ES5. Simply
omit the type declarations when using a language other than TypeScript.
