.. _urls:

JupyterLab URLs
---------------

Like the classic notebook, JupyterLab provides a way for users to copy URLs that
open a specific notebook or file. Additionally, JupyterLab URLs are an advanced
part of the user interface that allows for managing workspaces. These two
functions -- file paths and workspaces -- can be :ref:`combined in URLs that open a
specific file in a specific workspace <url-combine>`.

.. _url-tree:

File Navigation with ``/tree``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

JupyterLab's file navigation URLs adopts
the nomenclature of the classic notebook; these URLs are ``/tree`` URLs:

.. code-block:: none

  http(s)://<server:port>/<lab-location>/lab/tree/path/to/notebook.ipynb

Entering this URL will open the notebook in JupyterLab in
:ref:`single-document mode <tabs>`.


.. _url-workspaces:

Managing Workspaces
~~~~~~~~~~~~~~~~~~~

JupyterLab sessions always reside in a workspace. Workspaces contain the state
of JupyterLab: the files that are currently open, the layout of the application
areas and tabs, etc. When the page is refreshed, the workspace is restored.

The default workspace is not named and only saves its state on the
user's local browser:

.. code-block:: none

  http(s)://<server:port>/<lab-location>/lab

Named workspaces save their state on the server and can be shared between
multiple users (or browsers) as long as they have access to the same server:

.. code-block:: none

  http(s)://<server:port>/<lab-location>/lab/workspaces/foo

A workspace should only be open in a single browser tab at a time. If JupyterLab
detects that a workspace is being opened multiple times simultaneously, it will
prompt for a new workspace name. Opening a document in two different browser
tabs simultaneously is also not supported.

.. _url-clone:

Cloning Workspaces
~~~~~~~~~~~~~~~~~~

You can copy the contents of a workspace into another workspace with the ``clone`` url parameter.

To copy the contents of the workspace ``foo`` into the workspace ``bar``:

.. code-block:: none

  http(s)://<server:port>/<lab-location>/lab/workspaces/bar?clone=foo

To copy the contents of the default workspace into the workspace ``foo``:

.. code-block:: none

  http(s)://<server:port>/<lab-location>/lab/workspaces/foo?clone

To copy the contents of the workspace ``foo`` into the default workspace:

.. code-block:: none

  http(s)://<server:port>/<lab-location>/lab?clone=foo

.. _url-reset:

Resetting a Workspace
~~~~~~~~~~~~~~~~~~~~~

Use the ``reset`` url parameter to clear a workspace of its contents.

To reset the contents of the workspace ``foo``:

.. code-block:: none

  http(s)://<server:port>/<lab-location>/lab/workspaces/foo?reset

To reset the contents of the default workspace:

.. code-block:: none

  http(s)://<server:port>/<lab-location>/lab/workspaces/lab?reset

.. _url-combine:

Combining URL Functions
~~~~~~~~~~~~~~~~~~~~~~~


These URL functions can be used separately, as above, or in combination.

To reset the workspace ``foo`` and load a specific notebook afterward:

.. code-block:: none

  http(s)://<server:port>/<lab-location>/lab/workspaces/foo/tree/path/to/notebook.ipynb?reset

To clone the contents of the workspace ``bar`` into the workspace ``foo`` and
load a notebook afterward:

.. code-block:: none

  http(s)://<server:port>/<lab-location>/lab/workspaces/foo/tree/path/to/notebook.ipynb?clone=bar

To reset the contents of the default workspace and load a notebook:

.. code-block:: none

  http(s)://<server:port>/<lab-location>/lab/tree/path/to/notebook.ipynb?reset
