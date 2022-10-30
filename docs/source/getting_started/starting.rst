.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

.. _starting:

Starting JupyterLab
===================

Start JupyterLab using:

.. code:: bash

    jupyter lab

JupyterLab will open automatically in your browser.

If your notebook files are not in the current directory, you can pass your working directory path as argument when starting JupyterLab. Avoid running it from your root volume (e.g. `C:\` on Windows or `/` on Linux) to limit the risk of modifying system files.

Example:

.. code:: bash

    #Windows Example
    jupyter lab --notebook-dir=E:/ --preferred-dir E:/Documents/Somewhere/Else
    #Linux Example
    jupyter lab --notebook-dir=/var/ --preferred-dir /var/www/html/example-app/

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

JupyterLab runs on top of Jupyter Server, so see the `security
section <https://jupyter-server.readthedocs.io/en/latest/operators/security.html>`__
of Jupyter Server's documentation for security-related information.
