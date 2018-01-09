# Installation

JupyterLab can be installed using `conda` or `pip`:

If you use `conda`, you can install it with:

```bash
conda install -c conda-forge jupyterlab
```

If you use `pip`, you can install it with:

```bash
pip install jupyterlab
jupyter serverextension enable --py jupyterlab --sys-prefix
```

## Prerequisites

JupyterLab requires the Jupyter Notebook version 4.3 or later. To check the
version of the `notebook` package that you have installed:

```bash
jupyter notebook --version
```

## Supported browsers

The following browsers are currently *known to work*:

- Firefox Latest
- Chrome Latest
- Safari Latest

Earlier browser versions or other browsers may also work, but come with no
guarantees.
