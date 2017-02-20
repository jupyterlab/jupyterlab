# JupyterLab Extensions

A JupyterLab extension provides additional, optional functionality to JupyterLab's built-in capabilities. An extension is a module that provides one or more [plugins](plugins.md) to the JupyterLab application. To streamline third-party development of extensions, this library provides a build script for generating third party extension JavaScript bundles.

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


## Example 
Here is an an example of creating a Python package with a labextension.  It assumes this directory structure:

```
- setup.py
- MANIFEST.in
- my_fancy_module/
  - __init__.py
  - static/
    index.js
```

Defining the labextension
This example shows that the labextension is defined in the `__init__.py` file. 
The first function, `_jupyter_labextension_paths` is required to register the 
lab extension.  The `_jupyter_labextension_config` is for extensions that
require passing dynamic config data to the JupyterLab frontend.

`my_fancy_module/__init__.py`

```python
# Jupyter Lab Extension paths
def _jupyter_labextension_paths():
    return [dict(
        name="my_fancy_module",
        # the path is relative to the `my_fancy_module` directory
        src="static"
    )]


# Jupyter Lab Extension config data.
def _jupyter_labextension_config():
  """Get a dictionary of configuration data to provide to the JupyterLab frontend.

  This is called at each launch of the `/lab` page, and makes data available 
  through the `getConfigOption` [function](http://jupyterlab.github.io/services/globals.html#getconfigoption).

  Example in ES6 JavaScript:
  import { utils } from '@jupyterlab/services';
  let myVar = utils.getConfigOption('my_fancy_module_variable');
  """
  return dict(my_fancy_module_variable=1)
```
