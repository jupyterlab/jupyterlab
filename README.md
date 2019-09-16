# MathJAX 3 extension

A JupyterLab extension for rendering math with [MathJax 3](https://github.com/mathjax/mathjax).

The default LaTeX renderer in JupyterLab uses [MathJax 2](https://www.mathjax.org/).
This extension substitutes the MathJax 2 renderer with the MathJax 3 renderer.

## Prerequisites

* JupyterLab ^1.0
* Node.js >= 8

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
jupyter labextension install packages/mathjax3-extension
# Disable the default mathjax 2 renderer
jupyter labextension disable @jupyterlab/mathjax2-extension
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
