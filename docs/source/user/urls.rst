.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

.. _urls:

JupyterLab URLs
===============

Like the classic notebook, JupyterLab provides a way for users to copy URLs that
open a specific notebook or file. Additionally, JupyterLab URLs are an advanced
part of the user interface that allows for managing workspaces. These two
functions -- file paths and workspaces -- can be :ref:`combined in URLs that open a
specific file in a specific workspace <url-combine>`.

.. _url-tree:

File Navigation with ``/tree``
------------------------------

JupyterLab's file navigation URLs adopts
the nomenclature of the classic notebook; these URLs are ``/tree`` URLs:

.. code-block:: none

  http(s)://<server:port>/<lab-location>/lab/tree/path/to/notebook.ipynb

By default, the file browser will navigate to the folder containing the requested
file. This behavior can be changed with the optional ``file-browser-path`` query parameter:

.. code-block:: none

  http(s)://<server:port>/<lab-location>/lab/tree/path/to/notebook.ipynb?file-browser-path=/

Entering the above URL will show the workspace root folder instead of the ``/path/to/``
folder in the file browser.


Linking Notebook Sections
-------------------------

To create an URL which will scroll to a specific heading in the notebook append
a hash (``#``) followed by the heading text with spaces replaced by minus
characters (``-``), for example:

.. code-block:: none

  /lab/tree/path/to/notebook.ipynb?#my-heading

To get a link for a specific heading, hover over it in a rendered markdown cell
until you see a pilcrow mark (``¶``) which will contain the desired anchor link:

.. image:: ../images/notebook-heading-anchor-link.png
   :alt: A markdown cell with pilcrow mark (¶) which serves as an anchor link and is placed after a heading
   :class: jp-screenshot


.. note::

    Currently disambiguation of headings with identical text is not supported.

JupyterLab experimentally supports scrolling to a specified cell by identifier
using ``#cell-id=<cell-id>`` Fragment Identification Syntax.

.. code-block:: none

  /lab/tree/path/to/notebook.ipynb?#cell-id=my-cell-id

.. note::

    The ``cell-id`` fragment locator is not part of a formal Jupyter standard and subject to change.
    To leave feedback, please comment in the discussion: `nbformat#317 <https://github.com/jupyter/nbformat/issues/317>`_.

.. _url-workspaces:

Managing Workspaces (URL)
-------------------------

JupyterLab sessions always reside in a workspace. Workspaces contain the state
of JupyterLab: the files that are currently open, the layout of the application
areas and tabs, etc. When the page is refreshed, the workspace is restored.

The default workspace does not have a name and resides at the primary ``/lab``
URL:

.. code-block:: none

  http(s)://<server:port>/<lab-location>/lab

All other workspaces have a name that is part of the URL:

.. code-block:: none

  http(s)://<server:port>/<lab-location>/lab/workspaces/foo

Workspaces save their state on the server and can be shared between
multiple users (or browsers) as long as they have access to the same server.

A workspace should only be open in a single browser tab at a time. If JupyterLab
detects that a workspace is being opened multiple times simultaneously, it will
prompt for a new workspace name.

.. _url-clone:

Cloning Workspaces
------------------

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
---------------------

Use the ``reset`` url parameter to clear a workspace of its contents.

To reset the contents of the workspace ``foo``:

.. code-block:: none

  http(s)://<server:port>/<lab-location>/lab/workspaces/foo?reset

To reset the contents of the default workspace:

.. code-block:: none

  http(s)://<server:port>/<lab-location>/lab/workspaces/lab?reset

.. _url-combine:

Combining URL Functions
-----------------------

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
