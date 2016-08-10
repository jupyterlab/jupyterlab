# [JupyterLab](http://jupyter.github.io/jupyterlab/)

An extensible computational environment for Jupyter.

**JupyterLab is a very early developer preview, and is not suitable for
general usage yet. Features and implementation are subject to change.**

With JupyterLab, you can create a computational environment for Jupyter that
meets your workflow needs. Here's a quick preview of JupyterLab:

<img src="jupyter-plugins-demo.gif" alt="JupyterLab Demo" style="width: 100%;"/>

## Getting started

### Prerequisite

Jupyter notebook version 4.2 or later. To check the notebook version:

```bash
jupyter notebook --version
```

### User installation

From the command line:

```bash
pip install jupyterlab
jupyter serverextension enable --py jupyterlab
```

Start up JupyterLab:

```bash
jupyter lab
```

JupyterLab will open automatically in your browser. You may also access
JupyterLab by entering the notebook server's URL (`http://localhost:8888`) in
the browser.

----

## Documentation

- [API Docs](http://jupyter.github.io/jupyterlab/)
- [Architecture tutorial](http://jupyterlab-tutorial.readthedocs.io/en/latest/index.html)

----

## Contributing to JupyterLab

### Setting up a development system

#### Prerequisites

- Jupyter notebook version 4.2 or later
- NodeJS (preferably version 5 or later) and npm
- Optionally (if you plan to use ipython widgets in the notebook): ipywidgets dev master installed from https://github.com/ipython/ipywidgets

#### Installation

Fork the JupyterLab repo using the GitHub UI. Clone the repo and build using these commands:

```bash
git clone https://github.com/<your-github-username>/jupyterlab.git
cd jupyterlab
pip install -e . # will take a long time to build everything
jupyter serverextension enable --py jupyterlab
```

### Run JupyterLab

Start JupyterLab:

```bash
jupyter lab
```

Alternatively, you can run JupyterLab in debug mode:

```bash
jupyter lab --debug
```

### Run the tests

```bash
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

### Build API Docs

To build the [API docs](http://jupyter.github.io/jupyterlab/):

```bash
npm run docs
```

Navigate to `docs/index.html`.

----

## High level Architecture

The JupyterLab application is made up of two major parts:

- an npm package
- a Jupyter server extension (Python package)

Each part is named `jupyterlab`. The [developer tutorial documentation](http://jupyterlab-tutorial.readthedocs.io/en/latest/index.html)
provides additional architecture information.

## The NPM Package

The npm package source files are in the `src/` subdirectory.

**Prerequisites**
- [node](http://nodejs.org/) (preferably version 5 or later)
- Jupyter notebook server version 4.2 or later (to run examples)

```bash
npm install --save jupyterlab
```

### Build the NPM Package from Source

```bash
git clone https://github.com/jupyter/jupyterlab.git
cd jupyterlab
npm install
npm run build
cd jupyterlab  # into the server extension
npm install
npm run build
```

Note: If using an earlier version of node (<4), it is advised that you
run `npm dedupe` after `npm install`, since older versions of node
did not install dependencies maximally flat, which can cause version conflicts.

**Rebuild**

```bash
npm run clean
npm run build:all
```

## The Jupyter Server Extension

The Jupyter server extension source files are in the `jupyterlab/`
subdirectory. To use this extension, make sure the Jupyter notebook server
version 4.2 or later is installed.

### Build the JupyterLab server extension

When you make a change to JupyterLab npm package source files, run:

```bash
npm run build:serverextension
```

to build the changes and then refresh your browser to see the changes.

To have the system build after each source file change, run:

```bash
npm run watch:serverextension
```

and refresh the browser.

## Bundle for the Browser

Follow the package install instructions first.

Any bundler that understands how to `require()` files with `.js` and `.css`
extensions can be used with this package.

**Note:** This npm module is fully compatible with Node/Babel/ES6/ES5. Simply
omit the type declarations when using a language other than TypeScript.

## Supported Runtimes

The runtime versions which are currently *known to work*:

- IE 11+
- Firefox 32+
- Chrome 38+

Earlier browser versions may also work, but come with no guarantees.

Note: "requirejs" must be included in a global context (usually as a
`<script>` tag) for Comm targets.

## Publishing packages for a JupyterLab release

We publish an npm package, a Python source package, and a Python universal binary wheel.

```bash
npm version patch
git push origin master --tags
npm publish
python setup.py sdist upload
python setup.py bdist_wheel --universal upload
```
