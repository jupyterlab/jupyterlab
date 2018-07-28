# jupyterlab-shortcutui

[![Binder](https://beta.mybinder.org/badge.svg)](https://mybinder.org/v2/gh/jupyterlab/jupyterlab-shortcutui/master?urlpath=lab)

A JupyterLab extension for managing keyboard shortcuts

![](http://g.recordit.co/8qiMfgjQfV.gif)

## Prerequisites

- JupyterLab

## Usage

- Open the keyboard shortcuts editor from the *Settings* or *Help* menu
- Open the keyboard shortcuts editor from the command palette by searching for
  "Keyboard Shortcut Editor"

## Install

```bash
jupyter labextension install @jupyterlab/shortcutui
```

## Development

### Contributing

If you would like to contribute to the project, please read our [contributor documentation](https://github.com/jupyterlab/jupyterlab/blob/master/CONTRIBUTING.md).

JupyterLab follows the official [Jupyter Code of Conduct](https://github.com/jupyter/governance/blob/master/conduct/code_of_conduct.md).

### Install

Requires node 4+ and npm 4+

```bash
# Clone the repo to your local environment
git clone https://github.com/jupyterlab/jupyterlab-shortcutui.git
cd jupyterlab-shortcutui
# Install dependencies
npm install # or yarn
# Build Typescript source
npm run build # or yarn build
# Link your development version of the extension with JupyterLab
jupyter labextension link .
# Rebuild Typescript source after making changes
npm run build # or yarn build
```

To rebuild the package and the JupyterLab app:

```bash
npm run build
jupyter lab build
```
