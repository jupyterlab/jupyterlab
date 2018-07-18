# jupyterlab-shortcutui

[![Binder](https://beta.mybinder.org/badge.svg)](https://mybinder.org/v2/gh/jupyterlab/jupyterlab-shortcutui/master?urlpath=lab)

A JupyterLab extension for managing keyboard shortcuts

## Prerequisites

- JupyterLab

## Installation

```bash
jupyter labextension install jupyterlab-shortcutui
```

## Development

### Contributing

If you would like to contribute to the project, please read our [contributor documentation](https://github.com/jupyterlab/jupyterlab/blob/master/CONTRIBUTING.md).

JupyterLab follows the official [Jupyter Code of Conduct](https://github.com/jupyter/governance/blob/master/conduct/code_of_conduct.md).

### Development Install

For a development install (requires npm version 4 or later), do the following in the repository directory:

```bash
npm install
npm run build
jupyter labextension link .
```

To rebuild the package and the JupyterLab app:

```bash
npm run build
jupyter lab build
```
