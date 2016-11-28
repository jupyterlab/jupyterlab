# JupyterLab Extensions

A JupyterLab extension provides additional, optional functionality to JupyterLab's built-in capabilities. An extension is a module that provides one or more [plugins](plugins.html) to the JupyterLab application. To streamline third-party development of extensions, this library provides a build script for generating third party extension JavaScript bundles.

For information on creating a lab extension, please see the documentation for
the [@jupyterlab/extension-builder](https://github.com/jupyterlab/extension-builder).


## Installing and enabling extensions

You can install your labextension with the command:

`jupyter labextension install path/to/my_extension my_extension [--user|--sys-prefix]`

The default installation is system-wide. You can use ``--user`` to do a per-user installation,
or ``--sys-prefix`` to install to Python's prefix (e.g. in a virtual or conda environment).
Where my_extension is the directory containing the JavaScript files.
This will copy it to a Jupyter data directory (the exact location is platform
dependent - see :ref:`jupyter_path`).

For development, you can use the ``--symlink`` flag to symlink your extension
rather than copying it, so there's no need to reinstall after changes.

To use your extension, you'll also need to **enable** it, which tells the
notebook interface to load it. You can do that with another command:

`jupyter labextension enable my_extension [--sys-prefix]`

There is a corresponding ``disable`` command to stop using an
extension without uninstalling it.
