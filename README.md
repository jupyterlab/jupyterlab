**[Prerequisites](#prerequisites)** |
**[Installation](#installation)** |
**[Documentation](#docker)** |
**[Contributing](#contributing)** |
**[Supported runtimes](#supported runtimes)**


# [JupyterLab](http://jupyter.github.io/jupyterlab/)

[![Binder](http://mybinder.org/badge.svg)](http://mybinder.org/repo/jupyter/jupyterlab/lab)

An extensible computational environment for Jupyter.

**JupyterLab is a very early developer preview, and is not suitable for
general usage yet. Features and implementation are subject to change.**

With JupyterLab, you can create a computational environment for Jupyter that
meets your workflow needs. Here's a quick preview of JupyterLab:

<img src="jupyter-plugins-demo.gif" alt="JupyterLab Demo" style="width: 100%;"/>

## Getting started

### Prerequisites

Jupyter notebook version 4.2 or later. To check the notebook version:

```bash
jupyter notebook --version
```

### Installation

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

## Contributing

See the [Contributing Guidelines](http://github.com/jupyter/jupyterlab/CONTRIBUTING.md).

## Supported Runtimes

The runtime versions which are currently *known to work*:

- IE 11+
- Firefox 32+
- Chrome 38+

Earlier browser versions may also work, but come with no guarantees.

## License
We use a shared copyright model that enables all contributors to maintain the
copyright on their contributions.

All code is licensed under the terms of the revised BSD license.

## Getting help
We encourage you to ask questions on the [mailing list](https://groups.google.com/forum/#!forum/jupyter),
and you may participate in development discussions or get live help on [Gitter](https://gitter.im/jupyterhub/jupyterlab).
