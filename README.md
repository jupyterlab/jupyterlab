# JupyterLab Status Bar

This extension creates a generic statusbar component it the main JupyterLab view. This extension can be used by other
extensions to add custom elements into the statusbar.

## Prerequisites

* JupyterLab

## Installation

```bash
jupyter labextension install statusbar
```

## Development

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
