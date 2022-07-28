.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

.. _jupyterhub:

JupyterLab on JupyterHub
========================

JupyterLab works out of the box with JupyterHub 1.0+, and can even run side by side
with the classic Notebook.

When JupyterLab is deployed with JupyterHub it will show additional menu
items in the File menu that allow the user to log out or go to the JupyterHub
control panel.

Use JupyterLab by Default
-------------------------

If you install JupyterLab on a system running JupyterHub, it will immediately be
available at the ``/lab`` URL, but users will still be directed to the classic
Notebook (``/tree``) by default. To change the user's default user interface to
JupyterLab, set the following configuration option in your
:file:`jupyterhub_config.py` file::

    c.Spawner.default_url = "/lab"

Example Configuration
---------------------

For a fully-configured example of using JupyterLab with JupyterHub, see
the `jupyterhub-deploy-teaching
<https://github.com/jupyterhub/jupyterhub-deploy-teaching>`__ repository.
