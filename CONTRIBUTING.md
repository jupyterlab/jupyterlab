# Contributing to JupyterLab

If you're reading this section, you're probably interested in contributing to
JupyterLab.  Welcome and thanks for your interest in contributing!

Please take a look at the Contributor documentation, familiarize yourself with
using the Jupyter Notebook, and introduce yourself on the mailing list and share
what area of the project you are interested in working on.

We have labeled some issues as [sprint friendly](https://github.com/jupyterlab/jupyterlab/issues?q=is%3Aopen+is%3Aissue+label%3Asprint-friendly)
that we believe are good examples of small, self contained changes.
We encourage those that are new to the code base to implement and/or ask
questions about these issues.


## General Guidelines

For general documentation about contributing to Jupyter projects, see the
[Project Jupyter Contributor Documentation](https://jupyter.readthedocs.io/en/latest/contributor/content-contributor.html).

All source code is written in [TypeScript](http://www.typescriptlang.org/Handbook). See the [Style Guide](https://github.com/jupyterlab/jupyterlab/wiki/TypeScript-Style-Guide).


## Setting Up a Development Environment

### Installing Node.js and npm

Building the JupyterLab from its GitHub source code requires Node.js version 
6+ and Node's package manager, ``npm``.

If you use ``conda``, you can get them with:

```bash
conda install -c conda-forge nodejs
```

If you use [Homebrew](http://brew.sh/) on Mac OS X:

```bash
brew install node
```

You can also use the installer from the [Node.js](https://nodejs.org) website.


## Installing JupyterLab

JupyterLab requires Jupyter Notebook version 4.2 or later.

If you use ``conda``, you can install it as:

```bash
conda install notebook
```

You may also want to install `nb_conda_kernels` to have a kernel option for different [conda environments](http://conda.pydata.org/docs/using/envs.html)

```bash
conda install nb_conda_kernels
```

If you use `pip` you can install it as:

```bash
pip install notebook
```

Once you have installed the dependencies mentioned above, use the following
steps::

    git clone https://github.com/<your-github-username>/jupyterlab.git
    cd jupyterlab
    pip install -e . # will take a long time to build everything
    npm install
    npm run build:main
    jupyter serverextension enable --py jupyterlab

Notes:

* At times, it may be necessary to clean your local repo with the command ``git
clean -fdx``.

* If `pip` gives a `VersionConflict` error, it usually means that the installed
version of `jupyterlab_launcher` is out of date. Run `pip install --upgrade
jupyterlab_launcher` to get the latest version.

* To install JupyterLab in isolation for a single conda/virtual environment, you can add the `--sys-prefix` flag to the extension activation above; this will tie the installation to the `sys.prefix` location of your environment, without writing anything in your user-wide settings area (which are visible to all your envs):

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
npm run build:test
npm test
```

### Build and run the stand-alone examples

To install and build the examples in the `examples` directory:

```bash
npm run build:examples
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

**Prerequisites**

- [node](http://nodejs.org/) (preferably version 5 or later)
- Jupyter notebook server version 4.2 or later (to run examples)

```bash
npm install --save jupyterlab
```

### Build the NPM Packages from Source

```bash
git clone https://github.com/jupyterlab/jupyterlab.git
cd jupyterlab
npm install
npm run build:packages
```

**Rebuild**

```bash
npm run clean
npm run build:packages
```

## The Jupyter Server Extension

The Jupyter server extension source files are in the `jupyterlab/`
subdirectory. To use this extension, make sure the Jupyter notebook server
version 4.2 or later is installed.

### Build the JupyterLab server extension

When you make a change to JupyterLab npm package source files, run:

```bash
npm run build
```

to build the changes and then refresh your browser to see the changes.

To have the system build after each source file change, run:

```bash
npm run watch
```

and refresh the browser.

## Notes

- By default, the application will load from the JupyterLab staging directory (default is `<sys-prefix>/share/jupyter/lab/build`.  If you wish to run
the core application in `<git root>/jupyterlab/build`,
run `jupyter lab --core-mode`.  This is the core application that will
be shipped.

- If working with extensions, see the extension documentation on
https://jupyterlab-tutorial.readthedocs.io/en/latest/index.html.

- The npm modules are fully compatible with Node/Babel/ES6/ES5. Simply
omit the type declarations when using a language other than TypeScript.

