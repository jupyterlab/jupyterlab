# [JupyterLab](http://jupyter.github.io/jupyterlab/)

[![Binder](http://mybinder.org/badge.svg)](http://mybinder.org/repo/jupyter/jupyterlab/lab)

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

If you use ``conda``, you can install as:

```bash
conda install -c conda-forge jupyterlab
```

If you use ``pip``, you can install it as:

```bash
pip install jupyterlab
jupyter serverextension enable --py jupyterlab --sys-prefix
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

See the [Contributing Guidelines](http://github.com/jupyterlab/CONTRIBUTING.md).

## Supported Runtimes

The runtime versions which are currently *known to work*:

- IE 11+
- Firefox 32+
- Chrome 38+

Earlier browser versions may also work, but come with no guarantees.
