# MathJAX 3 extension

A JupyterLab extension for rendering math with [MathJax 3 alpha](https://github.com/mathjax/mathjax-v3).

The default LaTeX renderer in JupyterLab uses [MathJax](https://www.mathjax.org/).
This extension substitutes the MathJax renderer with the MathJax 3 (alpha) renderer.

## Prerequisites

* JupyterLab ^0.28.0
* Node.js >= 5

## Install

```bash
jupyter labextension install @jupyterlab/mathjax3-extension
```

## Development

```bash
# Clone the repo to your local environment
git clone https://github.com/jupyterlab/jupyter-renderers.git
cd jupyter-renderers
# Install dependencies
npm install
# Build Typescript source
npm run build
# Link your development version of the extension with JupyterLab
jupyter labextension link packages/mathjax3-extension
# Rebuild Typescript source after making changes
npm run build
# Rebuild JupyterLab after making any changes
jupyter lab build
```

You can watch the jupyter-renderers directory and run JupyterLab in watch mode to watch for changes in the extension's source and automatically rebuild the extension and application.

```bash
# Run jupyterlab in watch mode in one terminal tab
jupyter lab --watch
# Watch the jupyter-renderers directory
npm run watch
```

## Uninstall

```bash
jupyter labextension uninstall @jupyterlab/mathjax3-extension
```
