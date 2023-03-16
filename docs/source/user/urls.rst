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

By default, the file browser will navigate to the directory containing the requested
file. This behavior can be changed with the optional ``file-browser-path`` query parameter:

.. code-block:: none

  http(s)://<server:port>/<lab-location>/lab/tree/path/to/notebook.ipynb?file-browser-path=/

Entering the above URL will show the workspace root directory instead of the ``/path/to/``
directory in the file browser.


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

.. _url-workspaces-ui:

Managing Workspaces (UI)
------------------------

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

.. _url-workspaces-cli:

Managing Workspaces (CLI)
-------------------------

JupyterLab provides a command-line interface for workspace ``import`` and
``export``:

.. code-block:: bash

  $ # Exports the default JupyterLab workspace
  $ jupyter lab workspaces export
  {"data": {}, "metadata": {"id": "/lab"}}
  $
  $ # Exports the workspaces named `foo`
  $ jupyter lab workspaces export foo
  {"data": {}, "metadata": {"id": "/lab/workspaces/foo"}}
  $
  $ # Exports the workspace named `foo` into a file called `file_name.json`
  $ jupyter lab workspaces export foo > file_name.json
  $
  $ # Imports the workspace file `file_name.json`.
  $ jupyter lab workspaces import file_name.json
  Saved workspace: <workspaces-directory>/labworkspacesfoo-54d5.jupyterlab-workspace

The ``export`` functionality is as friendly as possible: if a workspace does not
exist, it will still generate an empty workspace for export.

The ``import`` functionality validates the structure of the workspace file and
validates the ``id`` field in the workspace ``metadata`` to make sure its URL is
compatible with either the ``workspaces_url`` configuration or the ``page_url``
configuration to verify that it is a correctly named workspace or it is the
default workspace.


Workspace File Format
---------------------

A workspace file in a JSON file with a specific spec.


There are two top level keys requires, `data`, and `metadata`.

The `metadata` must be a mapping with an `id`
key that has the same value as the ID of the workspace. This should also be the relative URL path to access the workspace,
like `/lab/workspaces/foo`.

The `data` key maps to the initial state of the `IStateDB`. Many plugins look in the State DB for the configuration.
Also any plugins that register with the `ILayoutRestorer` will look up all keys in the State DB
that start with the `namespace` of their tracker before the first `:`. The values of these keys should have a `data`
attribute that maps.

For example, if your workspace looks like this:

.. code-block:: json

  {
    "data": {
      "application-mimedocuments:package.json:JSON": {
        "data": { "path": "package.json", "factory": "JSON" }
      }
    }
  }

It will run the `docmanager:open` with the `{ "path": "package.json", "factory": "JSON" }` args, because the `application-mimedocuments` tracker is registered with the `docmanager:open` command, like this:


.. code-block:: typescript

  const namespace = 'application-mimedocuments';
  const tracker = new WidgetTracker<MimeDocument>({ namespace });
  void restorer.restore(tracker, {
    command: 'docmanager:open',
    args: widget => ({
      path: widget.context.path,
      factory: Private.factoryNameProperty.get(widget)
    }),
    name: widget =>
      `${widget.context.path}:${Private.factoryNameProperty.get(widget)}`
  });

Note the part of the data key after the first `:` (`package.json:JSON`) is dropped and is irrelevant.
