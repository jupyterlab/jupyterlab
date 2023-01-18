.. _binder:

JupyterLab on Binder
====================

JupyterLab works out of the box with Binder, and can even run side by side
with the classic Notebook.

Override default settings
^^^^^^^^^^^^^^^^^^^^^^^^^

It can be useful to change the default settings of JupyterLab for example to
deactivate the announcements feature.
To do that, you will need to add those two files in your Binder configuration:

.. code-block:: json
    :caption: overrides.json

    {
      "@jupyterlab/apputils-extension:notification": {
        "fetchNews": "false"
      }
    }

.. code-block:: sh
    :caption: postBuild

    #!/usr/bin/env bash
    set -eux

    mkdir -p ${NB_PYTHON_PREFIX}/share/jupyter/lab/settings
    cp overrides.json ${NB_PYTHON_PREFIX}/share/jupyter/lab/settings

Jupyter Server v2 or above
^^^^^^^^^^^^^^^^^^^^^^^^^^

Starting with JupyterLab 3.5.0, you can use either Jupyter Server v1 or v2. That
dependency is maintained independently of JupyterLab as another project within
the Jupyter organization. The source code and issues tracker can be found on `GitHub <https://github.com/jupyter-server/jupyter_server/>`__.

Unfortunately by default, Binder does not support Jupyter Server v2 or above. If
you need that specific version (e.g. it is needed for real time collaboration 
starting with JupyterLab 3.6.0), you will need to add the following file in your Binder
configuration to override the default application start up:

.. code-block:: sh
    :caption: start

    #!/bin/bash

    set -e

    echo $@

    exec jupyter-lab "${@:4}"
