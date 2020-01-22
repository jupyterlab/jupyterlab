.. _extension_migration:

JupyterLab 1.x to 2.x Extension Migration Guide
------------------------------------------------

This is a migration guide for updating extensions that support JupyterLab 1.x
to work in JupyterLab 2.x. We will look at two examples of extensions that
cover most of the APIs that extension authors might be using:

- ``@jupyterlab/shortcutui`` migration pull request:
  https://github.com/jupyterlab/jupyterlab-shortcutui/pull/53/files

- ``@jupyterlab/debugger`` migration pull request:
  https://github.com/jupyterlab/debugger/pull/337/files

Upgrading library versions
~~~~~~~~~~~~~~~~~~~~~~~~~~

The ``@phosphor/*`` libraries that JupyterLab 1.x uses have been renamed to
``@lumino/*`` but their APIs have not changed. Updating your ``package.json``
is straightforward. The easiest way to do this is to look in the
`JupyterLab core packages code base <https://github.com/jupyterlab/jupyterlab/tree/master/packages>`__
and to simply adopt the versions of the relevant libraries that are used
there.

.. figure:: extension_migration_dependencies_shortcuts.png
   :align: center
   :class: jp-screenshot
   :alt: Updating the shortcuts UI extensions's package.json

   In the shortcuts UI extension, updating the library versions in
   ``package.json`` looked like this.

.. figure:: extension_migration_dependencies_debugger.png
   :align: center
   :class: jp-screenshot
   :alt: Updating the debugger extensions's package.json

   In the debugger extension, updating the library versions in ``package.json``
   looked like this.

In both cases, note that we are using the ``beta`` version of many libraries.
This is to test the extensions against the JupyterLab 2.0 beta release before
the final version is published. At the time you are upgrading your extension,
the final versions of these packages may be published.

Updating ``import`` statements
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

All of the ``@phosphor`` namespaced imports need to be updated to the new
``@lumino`` namespaced packages.

+-----------------------------+---------------------------+
| ``@phosphor`` import        | ``@lumino`` counterpart   |
+=============================+===========================+
| ``@phosphor/application``   | ``@lumino/application``   |
+-----------------------------+---------------------------+
| ``@phosphor/collections``   | ``@lumino/collections``   |
+-----------------------------+---------------------------+
| ``@phosphor/commands``      | ``@lumino/commands``      |
+-----------------------------+---------------------------+
| ``@phosphor/coreutils``     | ``@lumino/coreutils``     |
+-----------------------------+---------------------------+
| ``@phosphor/datagrid``      | ``@lumino/datagrid``      |
+-----------------------------+---------------------------+
| ``@phosphor/datastore``     | ``@lumino/datastore``     |
+-----------------------------+---------------------------+
| ``@phosphor/default-theme`` | ``@lumino/default-theme`` |
+-----------------------------+---------------------------+
| ``@phosphor/disposable``    | ``@lumino/disposable``    |
+-----------------------------+---------------------------+
| ``@phosphor/domutils``      | ``@lumino/domutils``      |
+-----------------------------+---------------------------+
| ``@phosphor/dragdrop``      | ``@lumino/dragdrop``      |
+-----------------------------+---------------------------+
| ``@phosphor/keyboard``      | ``@lumino/keyboard``      |
+-----------------------------+---------------------------+
| ``@phosphor/messaging``     | ``@lumino/messaging``     |
+-----------------------------+---------------------------+
| ``@phosphor/properties``    | ``@lumino/properties``    |
+-----------------------------+---------------------------+
| ``@phosphor/signaling``     | ``@lumino/signaling``     |
+-----------------------------+---------------------------+
| ``@phosphor/virtualdom``    | ``@lumino/virtualdom``    |
+-----------------------------+---------------------------+
| ``@phosphor/widgets``       | ``@lumino/widgets``       |
+-----------------------------+---------------------------+
