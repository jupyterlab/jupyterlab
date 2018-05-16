.. _jupyterlab:

JupyterLab on JupyterHub
------------------------

JupyterLab works out of the box with JupyterHub, and can even run side by side
with the classic Notebook.

Use JupyterLab by Default
~~~~~~~~~~~~~~~~~~~~~~~~~

If you install JupyterLab on a system running JupyterHub, it will immediately be
available at the ``/lab`` URL, but users will still be directed to the classic
Notebook (``/tree``) by default. To change the user's default user interface to
JupyterLab, set the following configuration option in your
:file:`jupyterhub_config.py` file::

    c.Spawner.default_url = '/lab'

In this configuration, users can still access the classic Notebook at ``/tree``,
by either typing that URL into the browser, or by using the "Launch Classic
Notebook" item in JupyterLab's Help menu.

Further Integration
~~~~~~~~~~~~~~~~~~~

Additional integration between JupyterLab and JupyterHub is offered by the
`jupyterlab-hub <https://github.com/jupyterhub/jupyterlab-hub>`__ extension for
JupyterLab. It provides a Hub menu with items to access the JupyterHub control
panel or logout of the hub.

To install the ``jupyterlab-hub`` extension, run::

    jupyter labextension install @jupyterlab/hub-extension

Further directions are provided on the `jupyterlab-hub GitHub repository
<https://github.com/jupyterhub/jupyterlab-hub>`__.

Example Configuration
~~~~~~~~~~~~~~~~~~~~~

For a fully-configured example of using JupyterLab with JupyterHub, see
the `jupyterhub-deploy-teaching
<https://github.com/jupyterhub/jupyterhub-deploy-teaching>`__ repository.
