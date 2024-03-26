.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

.. _workspaces:

Workspaces
==========

A JupyterLab Workspace defines the layout and state of the user interface such as the position of files, notebooks, sidebars, and open/closed state of the panels.

Workspaces can be managed in three ways:

- :ref:`via Graphical User Interface <workspaces-gui>`
- :ref:`via Command Line Interface <workspaces-cli>`
- :ref:`via URL schema and parameters <url-workspaces>`


A workspace name may only contain ASCII letters (a-z and A-Z), digits (0-9), hyphen-minuses (``-``) and underscores (``_``).

.. _workspaces-gui:

Managing Workspaces (GUI)
-------------------------

There are several commands for managing workspaces from the main menu, sidebar, and command palette:

- `create-new`, `clone`, `rename`, `reset`, and `delete` act on the workspaces stored by on the server in :ref:`the dedicated location <workspaces-directory>`.
- `save`, `save as`, `import`, and `export` can load and store the workspace to/from the file system (contained within the Jupyter root directory); `save` will save the workspace to the most recently saved file.

In the sidebar, in the "Running Terminals and Kernels" panel, under "Workspaces", the current workspace has a check mark (✓). Clicking on another workspace will open. Opening the context menu (right click) over the workspace item in the sidebar will present actions available for management of that workspace:

.. image:: ../images/workspaces-sidebar.png
   :align: center
   :class: jp-screenshot
   :alt: The context menu opened over workspaces sidebar

.. _workspaces-cli:

Managing Workspaces (CLI)
-------------------------

JupyterLab provides a command line interface for workspace ``import`` and
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

The ``export`` command will generate a URL for any workspace you provide as an argument,
even if the workspace does not yet exist. Visiting a URL for a nonexistent workspace will create
a new workspace with that name.

The ``import`` functionality validates the structure of the workspace file and
validates the ``id`` field in the workspace ``metadata`` to make sure its URL is
compatible with either the ``workspaces_url`` configuration or the ``page_url``
configuration to verify that it is a correctly named workspace or it is the
default workspace.


Workspace File Format
---------------------

A workspace file is a JSON file that contains one object with two required top-level keys, `data`, and `metadata`.

The `metadata` must be a mapping with an `id`
key that has the same value as the ID of the workspace. This should also be the relative URL path to access the workspace,
like `/lab/workspaces/foo`. Additionally, `metadata` may contain `created` and `last_modified` fields with date and time creation and most recent modification, respectively.
The date and time are encoded using ISO 8601 format, for example ``2022-06-15T23:41:15.818986+00:00``.

The `data` key maps to the initial state of the ``IStateDB``. Many plugins look in the State DB for the configuration.
Also any plugins that register with the ``ILayoutRestorer`` will look up all keys in the State DB
that start with the `namespace` of their tracker before the first ``:``. The values of these keys should have a `data`
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

It will run the `docmanager:open` with the ``{ "path": "package.json", "factory": "JSON" }`` args, because the `application-mimedocuments` tracker is registered with the `docmanager:open` command, like this:


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

Note the part of the data key after the first ``:`` (``package.json:JSON``) is dropped and is irrelevant.
