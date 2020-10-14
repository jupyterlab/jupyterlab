.. _extension_migration_2_3:

JupyterLab 2.x to 3.x Extension Migration Guide
------------------------------------------------

This is a migration guide for updating extensions that support JupyterLab 2.x to work in JupyterLab 3.x.

Upgrading Library Versions
~~~~~~~~~~~~~~~~~~~~~~~~~~

JupyterLab 3.0 provides a script to upgrade an existing extension to use the new extension system and packaging.

First, make sure to update to JupyterLab 3.0 with ``pip``:

.. code:: bash

   pip install jupyterlab -U


Or with ``conda``:

.. code:: bash

   conda install -c conda-forge jupyterlab=3


Then at the root folder of the extension, run:

.. code:: bash

   python -m jupyterlab.upgrade_extension .


Publishing the extension to PyPI and conda-forge
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

TODO
