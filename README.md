# [JupyterLab](http://jupyter.github.io/jupyterlab/)

An extensible computational environment for Jupyter.

**This is a very early pre-alpha developer preview and not suitable for
general usage yet. Features and implementation are subject to change.**

With JupyterLab, you can create a computational environment for Jupyter that
meets your workflow needs. Here's a quick preview of JupyterLab:

<img src="jupyter-plugins-demo.gif" alt="JupyterLab Demo" style="width: 100%;"/>

## Getting started

### Prerequisites

Jupyter notebook version 4.2 or later

### User installation

Install JupyterLab from the command line:

```bash
pip install jupyterlab
jupyter serverextension enable --py jupyterlab
```

Start up JupyterLab with the command:

```bash
jupyter lab
```

JupyterLab should open automatically in your browser. You can also access it
by opening a browser to the notebook server's URL (e.g., `http://localhost:8888`).

----

## Documentation

- [API Docs](http://jupyter.github.io/jupyterlab/)
- [Architecture tutorial - useful for individuals developing JupyterLab](http://jupyterlab-tutorial.readthedocs.io/en/latest/index.html)

----

## Development of JupyterLab

The remainder of this document provides information for individuals that are
developing JupyterLab. 

### Prerequisites

- Jupyter notebook version 4.2 or later
- npm (preferably version 5 or later)

### Installation

First fork the JupyterLab repo in the GitHub UI. Then
clone the repo locally and building using these commands:

```bash
git clone https://github.com/<your-github-username>/jupyterlab.git
cd jupyterlab
npm install
pip install -e . # will take a long time to build everything
jupyter serverextension enable --py jupyterlab
```

### Run JupyterLab
Start up Jupyterlab with the command:

```bash
jupyter lab
```

Open a browser to the notebook server's URL (e.g., `http://localhost:8888`).

### Run Tests

Follow the source build instructions first. Enter:

```bash
npm test
```

### Build and Run the Examples

To install and build the examples in the `examples` directory:

- Follow the source build instructions first.
- Requires a Python install with the Jupyter notebook (version 4.2 or later).
- Run the command:

```bash
npm run build:examples
```

To run an example:

- Change into the specific example's directory in the `examples` directory
- run `python main.py`

### Build API Docs

Follow the source build instructions first. Enter:

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
npm run build:all
```

**Rebuild**

```bash
npm run clean
npm run build:all
```

## The Jupyter Server Extension

The Jupyter server extension source files are in the `jupyterlab/` subdirectory. 
To use this extension, you need the Jupyter notebook server version 4.2 or later.

### Build JupyterLab server extension

When you make a change to JupyterLab npm package source files, run:

```bash
npm run build:serverextension
```

to build the changes and refresh your browser to see the changes.

To have the system build after each change to the source files, run:
 
```bash
npm run watch:serverextension
```

and refresh the browser after each successful update.

## Bundle for the Browser

Follow the package install instructions first.

Any bundler that understands how to `require()` files with `.js` and `.css`
extensions can be used with this package.

**Note:** This npm module is fully compatible with Node/Babel/ES6/ES5. Simply
omit the type declarations when using a language other than TypeScript.

## Supported Runtimes

The runtime versions which are currently *known to work* are listed below.
Earlier versions may also work, but come with no guarantees.

- IE 11+
- Firefox 32+
- Chrome 38+

Note: "requirejs" must be included in a global context (usually as a
`<script>` tag) for Comm targets.

## Publishing packages for a JupyterLab release

We publish an npm package, a pypi source package, and a pypi universal binary wheel.

```bash
npm version patch
git push origin master --tags
npm publish
python setup.py sdist upload
python setup.py bdist_wheel --universal upload
```
