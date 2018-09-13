.. _developer-guide:

The JupyterLab Developer Guide is for developing JupyterLab extensions or developing JupyterLab itself.

General Codebase Orientation
----------------------------

The ``jupyterlab/jupyterlab`` repository contains two packages:

-  an npm package indicated by a ``package.json`` file in the repo's
   root directory
-  a Python package indicated by a ``setup.py`` file in the repo's root
   directory

The npm package and the Python package are both named ``jupyterlab``.

See the `Contributing
Guidelines <https://github.com/jupyterlab/jupyterlab/blob/master/CONTRIBUTING.md>`__
for developer installation instructions.

Directories
~~~~~~~~~~~

NPM package: ``src/``, ``lib/``, ``typings/``, ``buildutils/``
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

-  ``src/``: the source typescript files.

   -  ``jlpm run build`` builds the source files into javascript files
      in ``lib/``.
   -  ``jlpm run clean`` deletes the ``lib/`` directory.

-  ``typings/``: type definitions for external libraries that typescript
   needs.
-  ``buildutils/``: Utilities for managing the repo

Examples: ``examples/``
^^^^^^^^^^^^^^^^^^^^^^^

The ``examples/`` directory contains stand-alone examples of components,
such as a simple notebook on a page, a console, terminal, and a
filebrowser. The ``lab`` example illustrates a simplified combination of
components used in JupyterLab. This example shows multiple stand-alone
components combined to create a more complex application.

Testing: ``test/``
^^^^^^^^^^^^^^^^^^

The tests are stored and run in the ``test/`` directory. The source
files are in ``test/src/``.

Notebook extension: ``jupyterlab/``
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The ``jupyterlab/`` directory contains the Jupyter server extension.

The server extension includes a private npm package in order to build
the **webpack bundle** which the extension serves. The private npm
package depends on the ``jupyterlab`` npm package found in the repo's
root directory.

Git hooks: ``git-hooks/``
^^^^^^^^^^^^^^^^^^^^^^^^^

The ``git-hooks/`` directory stores some convenience git hooks that
automatically rebuild the npm package and server extension every time
you check out or merge (via pull request or direct push to master) in
the git repo.

Documentation: ``docs/``
^^^^^^^^^^^^^^^^^^^^^^^^

After building the docs (``jlpm run docs``), ``docs/index.html`` is the
entry point to the documentation.
