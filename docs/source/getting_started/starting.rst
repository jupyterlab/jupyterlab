.. _starting:

Starting JupyterLab
===================

Start JupyterLab using:

.. code:: bash

    jupyter lab

JupyterLab will open automatically in your browser.

You may access JupyterLab by entering the notebook server's :ref:`URL <urls>`
into the browser. JupyterLab sessions always reside in a
:ref:`workspace <url-workspaces-ui>`. The default workspace is the main ``/lab`` URL:

.. code-block:: none

  http(s)://<server:port>/<lab-location>/lab

Like the classic notebook,
JupyterLab provides a way for users to copy URLs that
:ref:`open a specific notebook or file <url-tree>`. Additionally,
JupyterLab URLs are an advanced part of the user interface that allows for
managing :ref:`workspaces <url-workspaces-ui>`. To learn more about URLs in
Jupyterlab, visit :ref:`urls`.

To open the classic Notebook from JupyterLab, select "Launch Classic Notebook"
from the JupyterLab Help menu, or you can change the URL
from ``/lab`` to ``/tree``.

JupyterLab runs on top of Jupyter Server, so see the `security
section <https://jupyter-server.readthedocs.io/en/latest/operators/security.html>`__
of Jupyter Server's documentation for security-related information.
