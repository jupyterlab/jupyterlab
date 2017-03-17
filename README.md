**[Prerequisites](#prerequisites)** |
**[Installation](#installation)** |
**[Contributing](#contributing)** |
**[License](#license)** |
**[Getting help](#getting-help)**


# [JupyterLab](http://jupyterlab.github.io/jupyterlab/)

[![Build Status](https://travis-ci.org/jupyterlab/jupyterlab.svg?branch=master)](https://travis-ci.org/jupyterlab/jupyterlab)
[![Binder](http://mybinder.org/badge.svg)](http://mybinder.org/repo/jupyterlab/jupyterlab/lab)
[![Documentation Status](https://readthedocs.org/projects/jupyterlab-tutorial/badge/?version=latest)](https://jupyterlab-tutorial.readthedocs.io/en/latest/?badge=latest)
[![Google Group](https://img.shields.io/badge/-Google%20Group-lightgrey.svg)](https://groups.google.com/forum/#!forum/jupyter)

An extensible computational environment for Jupyter.

**JupyterLab is a very early developer preview, and is not suitable for
general usage yet. Features and implementation are subject to change. **

With JupyterLab, you can create a computational environment for Jupyter that
meets your workflow needs. Here's a quick preview of JupyterLab:

<img src="jupyter-plugins-demo.gif" alt="JupyterLab Demo" style="width: 100%;"/>

We have a [roadmap](https://github.com/jupyter/roadmap/blob/master/jupyterlab.md) of planned development.

----

## Prerequisites

Jupyter notebook version 4.2 or later. To check the notebook version:

```bash
jupyter notebook --version
```

### Supported Runtimes

The runtime versions which are currently *known to work*:

- Firefox 49+
- Chrome 39+
- Safari 10+

Earlier browser versions may also work, but come with no guarantees.

JupyterLab uses CSS Variables for styling, which is one reason for the
minimum versions listed above.  IE 11+ or Edge 14 do not support
CSS Variables, and are not directly supported at this time.
A tool like [postcss](http://postcss.org/) can be used to convert the CSS files in the
`jupyterlab/build` directory manually if desired.

----

## Installation

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

Instructions on how to install the project from the git sources are available in our [contributor documentation](CONTRIBUTING.md).

----

## Contributing

If you would like to contribute to the project, please read our [contributor documentation](CONTRIBUTING.md).

----

## License
We use a shared copyright model that enables all contributors to maintain the
copyright on their contributions.

All code is licensed under the terms of the revised BSD license.

----

## Getting help
We encourage you to ask questions on the [mailing list](https://groups.google.com/forum/#!forum/jupyter),
and you may participate in development discussions or get live help on [Gitter](https://gitter.im/jupyterlab/jupyterlab).


## Resources

- [Reporting Issues](https://github.com/jupyterlab/jupyterlab/issues)
- [Architecture tutorial](https://jupyterlab-tutorial.readthedocs.io/en/latest/index.html)
- [Documentation for Project Jupyter](https://jupyter.readthedocs.io/en/latest/index.html) | [PDF](https://media.readthedocs.org/pdf/jupyter/latest/jupyter.pdf)
- [Project Jupyter website](https://jupyter.org)
