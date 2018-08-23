# JupyterLab Status Bar

This extension creates a generic statusbar to showcase the various states of JupyterLab. Different components will render depending on the active context: notebook, console, file editor, and terminal. This extension can be used by other
extensions to add custom elements into the statusbar.

Changing Contexts
![Context Changes](http://g.recordit.co/OndGalRjws.gif)

Component Interactions
![Component Previews](http://g.recordit.co/jT0NA6D9c9.gif)

## Dependencies

-   JupyterLab

## Optional Dependencies

-   [nbresuse](https://github.com/yuvipanda/nbresuse)

```bash
pip install nbresuse
jupyter serverextension enable --py nbresuse
```

## Installation

```bash
jupyter labextension install @jupyterlab/statusbar
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
