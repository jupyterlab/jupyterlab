.. _extension_migration:

Extension Migration Guide
=========================

.. _extension_migration_3.5_3.6:

JupyterLab 3.5 to 3.6
---------------------

AsyncIterable Support
^^^^^^^^^^^^^^^^^^^^^

For the events service, we are using a JavaScript feature introduced in ES2018. If your code is
using TypeScript with ES2017 target (as JupyterLab 3.6), you will either need to update your
target to ES2018 or add ``"ES2018"`` to the `TypeScript lib option <https://www.typescriptlang.org/tsconfig#lib>`_.

.. note::

    JupyterLab 3.6.0 was released with an updated target "ES2018". We strongly advise updating to 3.6.1,
    which reverts the target back to "ES2017".

Jest configuration update
^^^^^^^^^^^^^^^^^^^^^^^^^

If you are using jest to test your extension, some new ES6 packages dependencies are added to JupyterLab 3.6.
They need to be ignore when transforming the code with Jest. You will need to update the
``transformIgnorePatterns`` to match:

.. code-block:: javascript
    :emphasize-lines: 3

    const esModules = [
      '@jupyterlab/',
      '@jupyter/ydoc',
      'lib0',
      'y\\-protocols',
      'y\\-websocket',
      'yjs'
    ].join('|');

    // ...

    transformIgnorePatterns: [`/node_modules/(?!${esModules}).+`]

For more information, have a look at :ref:`testing_with_jest`.

Real-Time Collaboration
^^^^^^^^^^^^^^^^^^^^^^^
In JupyterLab v3.6, it is necessary to install Jupyter Server v2.0 to use real-time collaboration.
This requirement was introduced to take advantage of the new identity API in Jupyter Server v2.0.

On the other side, we also changed how JupyterLab loads documents (only in collaborative mode).
Instead of using the content API, now the provider opens a WebSocket connection to the
`YDocWebSocketHandler`, which is implemented in an external
`jupyter server extension <https://github.com/jupyter-server/jupyter_server_ydoc>`__.

In addition, the shared models' package was moved to an external package called `@jupyter/ydoc
<https://github.com/jupyter-server/jupyter_ydoc>`__. ``@jupyterlab/shared-models`` has been kept
for backward compatibility (except in 3.6.0 and 3.6.1). It is now a proxy to ``@jupyter/ydoc@~0.2.2``;
the API is almost the same; see the required modification for the `example <https://github.com/jupyterlab/extension-examples/pull/224>`_.

**API Changes:**

To be able to fix RTC and make it stable. It was necessary to change the API and make a few breaking changes.
These changes should not affect the vast majority of extensions. They will only affect a couple
of extensions focused on RTC.

It was necessary to change the paradigm of how JupyterLab loads documents and replace the locking mechanism
in the back-end. Instead of identifying the first client to open the document, it now centralizes
the process by instantiating a YDoc client in the back-end. This client is the only one that loads
the content of the document into memory and shares it with every other client connected.

The involved packages are:

- ``@jupyterlab/docprovider``:
   * The interface ``IDocumentProvider``, now extends from ``IDisposable``.
     Removed: ``acquireLock``, ``releaseLock``, ``setPath``, ``destroy``, ``requestInitialContent`` and ``putInitializedState``.
     Added: ``ready`` and ``isDisposed``.

   * ``IDocumentProviderFactory.IOptions`` is now templated with ``T extends ISharedDocument = ISharedDocument``.
     And the ``ymodel`` attribute has been renamed ``model`` typed ``T`` (relaxing typing from ``YDocument`` to ``ISharedDocument``).

   * ``WebSocketProviderWithLocks`` has been renamed to ``WebSocketProvider``.
     It does not extend ``WebSocketProvider`` from ``y-websocket`` anymore.

   * ``WebSocketProvider.IOptions`` has a new optional attribute, ``user``.

- ``@jupyterlab/shared-models``: It is now a proxy to ``@jupyter/ydoc@~0.2.2``.
   - A document model extending ``YDocument`` must define a change interface extending ``DocumentChange``.

- ``@jupyterlab/services``:
   * The interface ``IManager`` has a new optional property, ``user`` that implement `User.IManager <../api/interfaces/services.User.IManager.html>`_.

   * The ``ServiceManager`` class implements the optional property ``user`` from the ``IManager``.

**Future changes:**
Some of the behavior changes coming in JupyterLab 4.0 were made available behind a flag in JupyterLab 3.6:

- In JupyterLab 3.x, the CSS for a _disabled_ prebuilt extensions is always loaded on the page.
  This will no longer be the case in JupyterLab 4.0. To preview the impact of these changes on
  your extension/theme start JupyterLab with ``--future-skip-styles-for-disabled`` flag.


.. _extension_migration_3.0_3.1:

JupyterLab 3.0 to 3.1
---------------------

Following semver rules, API are compatible.

New main and context menus customization
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

JupyterLab 3.1 introduces a new way to hook commands into :ref:`mainmenu` and :ref:`context_menu`.
It allows the final user to customize those menus through settings as it is already possible for
the shortcuts.


Jest configuration update
^^^^^^^^^^^^^^^^^^^^^^^^^

If you are using jest to test your extension, some new ES6 packages dependencies are added to JupyterLab.
They need to be ignore when transforming the code with Jest. You will need to update the 
``transformIgnorePatterns`` to match:

.. code::

   const esModules = [
     '@jupyterlab/',
     'lib0',
     'y\\-protocols',
     'y\\-websocket',
     'yjs'
   ].join('|');

   // ...

   transformIgnorePatterns: [`/node_modules/(?!${esModules}).+`]

For more information, have a look at :ref:`testing_with_jest`.

.. note::

   Here is an example of pull request to update to JupyterLab 3.1 in ``@jupyterlab/git`` extension:  
   https://github.com/jupyterlab/jupyterlab-git/pull/979/files


.. _extension_migration_2_3:

JupyterLab 2.x to 3.x
---------------------

Here are some helpful tips for migrating an extension from JupyterLab 2.x to JupyterLab 3.x.

Upgrading library versions manually
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

To update the extensions so it is compatible with the 3.0 release, update the compatibility
range of the ``@jupyterlab`` dependencies in the ``package.json``. The diff should be similar to:

.. code:: diff

   index 6f1562f..3fcdf37 100644
   ^^^ a/package.json
   +++ b/package.json
      "dependencies": {
   -    "@jupyterlab/application": "^2.0.0",
   +    "@jupyterlab/application": "^3.0.0",

Upgrading library versions using the upgrade script
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

JupyterLab 3.0 provides a script to upgrade an existing extension to use the new extension system and packaging.

First, make sure to update to JupyterLab 3.0 and install ``jupyter-packaging`` and ``cookiecutter``. With ``pip``:

.. code:: bash

   pip install jupyterlab -U
   pip install jupyter-packaging cookiecutter


Or with ``conda``:

.. code:: bash

   conda install -c conda-forge jupyterlab=3 jupyter-packaging cookiecutter


Then at the root folder of the extension, run:

.. code:: bash

   python -m jupyterlab.upgrade_extension .

The upgrade script creates the necessary files for packaging the JupyterLab extension as a Python package, such as
``setup.py`` and ``pyproject.toml``.

The upgrade script also updates the dependencies in ``package.json`` to the ``^3.0.0`` packages. Here is an example diff:

.. code:: diff

   index 6f1562f..3fcdf37 100644
   ^^^ a/package.json
   +++ b/package.json
   @@ -29,9 +29,13 @@
      "scripts": {
   -    "build": "tsc",
   -    "build:labextension": "npm run clean:labextension && mkdirp myextension/labextension && cd myextension/labextension && npm pack ../..",
   -    "clean": "rimraf lib tsconfig.tsbuildinfo",
   +    "build": "jlpm run build:lib && jlpm run build:labextension:dev",
   +    "build:prod": "jlpm run build:lib && jlpm run build:labextension",
   +    "build:lib": "tsc",
   +    "build:labextension": "jupyter labextension build .",
   +    "build:labextension:dev": "jupyter labextension build --development True .",
   +    "clean": "rimraf lib tsconfig.tsbuildinfo myextension/labextension",
   +    "clean:all": "jlpm run clean:lib && jlpm run clean:labextension",
      "clean:labextension": "rimraf myextension/labextension",
      "eslint": "eslint . --ext .ts,.tsx --fix",
      "eslint:check": "eslint . --ext .ts,.tsx",
   @@ -59,12 +63,12 @@
      ]
      },
      "dependencies": {
   -    "@jupyterlab/application": "^2.0.0",
   -    "@jupyterlab/apputils": "^2.0.0",
   -    "@jupyterlab/observables": "^3.0.0",
   +    "@jupyterlab/builder": "^3.0.0",
   +    "@jupyterlab/application": "^3.0.0",
   +    "@jupyterlab/apputils": "^3.0.0",
   +    "@jupyterlab/observables": "^3.0.0",
      "@lumino/algorithm": "^1.2.3",
      "@lumino/commands": "^1.10.1",
      "@lumino/disposable": "^1.3.5",
   @@ -99,6 +103,13 @@
   -    "typescript": "~3.8.3"
   +    "typescript": "~4.0.1"
      },
      "jupyterlab": {
   -    "extension": "lib/plugin"
   +    "extension": "lib/plugin",
   +    "outputDir": "myextension/labextension/"
      }
   }


On the diff above, we see that additional development scripts are also added, as they are used by the new extension system workflow.

The diff also shows the new ``@jupyterlab/builder`` as a ``devDependency``.
``@jupyterlab/builder`` is a package required to build the extension as a federated (prebuilt) extension.
It hides away internal dependencies such as ``webpack``, and produces the assets that can then be distributed as part of a Python package.

Extension developers do not need to interact with ``@jupyterlab/builder`` directly, but instead can use the
``jupyter labextension build`` command. This command is run automatically as part of the ``build`` script
(``jlpm run build``).

For more details about the new file structure and packaging of the extension, check out the extension tutorial: :ref:`extension_tutorial`

Publishing the extension to PyPI and conda-forge
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Starting from JupyterLab 3.0, extensions can be distributed as a Python package.

The extension tutorial provides explanations to package the extension so it can be
published on PyPI and conda forge: :ref:`extension_tutorial_publish`.

.. note::

   While publishing to PyPI is the new recommended way for distributing extensions to users,
   it is still useful to continue publishing extensions to ``npm`` as well,
   so other developers can extend them in their own extensions.


.. _extension_migration_1_2:

JupyterLab 1.x to 2.x
---------------------

Here are some helpful tips for migrating an extension from JupyterLab 1.x to
JupyterLab 2.x. We will look at two examples of extensions that cover most of
the APIs that extension authors might be using:

- ``@jupyterlab/debugger`` migration pull request:
  https://github.com/jupyterlab/debugger/pull/337/files

- ``@jupyterlab/shortcutui`` migration pull request:
  https://github.com/jupyterlab/jupyterlab-shortcutui/pull/53/files

Upgrading library versions
^^^^^^^^^^^^^^^^^^^^^^^^^^

The ``@phosphor/*`` libraries that JupyterLab 1.x uses have been renamed to
``@lumino/*``. Updating your ``package.json`` is straightforward. The easiest
way to do this is to look in the
`JupyterLab core packages code base <https://github.com/jupyterlab/jupyterlab/tree/3.6.x/packages>`__
and to simply adopt the versions of the relevant libraries that are used
there.

.. figure:: images/extension_migration_dependencies_debugger.png
   :align: center
   :class: jp-screenshot
   :alt: Updating the debugger extension's libraries in package.json

   Updating the debugger extension's libraries in ``package.json``

.. figure:: images/extension_migration_dependencies_shortcuts.png
   :align: center
   :class: jp-screenshot
   :alt: Updating the shortcuts UI extension's libraries in package.json

   Updating the shortcuts UI extension's libraries in ``package.json``

.. tip::
  In these examples, note that we are using the ``2.0.0-beta.x`` version of
  many libraries. This was to test the extensions against the JupyterLab 2.0
  beta release before the final version. For the final release, your
  ``package.json`` should depend on version ``^2.0.0`` of these packages.

Migrating from ``@phosphor`` to ``@lumino``
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^-

The foundational packages used by JupyterLab are now all prefixed with the NPM
namespace ``@lumino`` instead of ``@phosphor``. The APIs for these packages
have not changed. The ``@phosphor`` namespaced imports need to be updated to
the new ``@lumino`` namespaced packages:

.. list-table:: Update from ``@phosphor/...`` to ``@lumino/...``

  * - ``@phosphor/application``
    - ``@lumino/application``
  * - ``@phosphor/collections``
    - ``@lumino/collections``
  * - ``@phosphor/commands``
    - ``@lumino/commands``
  * - ``@phosphor/coreutils``
    - ``@lumino/coreutils``
  * - ``@phosphor/datagrid``
    - ``@lumino/datagrid``
  * - ``@phosphor/datastore``
    - ``@lumino/datastore``
  * - ``@phosphor/default-theme``
    - ``@lumino/default-theme``
  * - ``@phosphor/disposable``
    - ``@lumino/disposable``
  * - ``@phosphor/domutils``
    - ``@lumino/domutils``
  * - ``@phosphor/dragdrop``
    - ``@lumino/dragdrop``
  * - ``@phosphor/keyboard``
    - ``@lumino/keyboard``
  * - ``@phosphor/messaging``
    - ``@lumino/messaging``
  * - ``@phosphor/properties``
    - ``@lumino/properties``
  * - ``@phosphor/signaling``
    - ``@lumino/signaling``
  * - ``@phosphor/virtualdom``
    - ``@lumino/virtualdom``
  * - ``@phosphor/widgets``
    - ``@lumino/widgets``

.. warning::
  ``p-`` prefixed CSS classes, ``data-p-`` attributes and ``p-`` DOM events
  are deprecated. They will continue to work until the next major release of
  Lumino.

  - ``.p-`` CSS classes such as ``.p-Widget`` should be updated to ``.lm-``,
    e.g. ``.lm-Widget``
  - ``data-p-`` attributes such as ``data-p-dragscroll`` should be updated to
    ``data-lm-``, e.g. ``data-lm-dragscroll``
  - ``p-`` DOM events such as ``p-dragenter`` should be updated to ``lm-``,
    e.g. ``lm-dragenter``

Updating former ``@jupyterlab/coreutils`` imports
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^-

JupyterLab 2.0 introduces several new packages with classes and tokens that
have been moved out of ``@jupyterlab/coreutils`` into their own packages. These
exports have been moved.

.. tip::
  It might be helpful to delete ``node_modules`` and ``yarn.lock`` when
  updating these libraries.

============================  =================================
 Export                        Package
============================  =================================
 ``DataConnector``             ``@jupyterlab/statedb``
 ``Debouncer``                 ``@lumino/polling``
 ``DefaultSchemaValidator``    ``@jupyterlab/settingregistry``
 ``IDataConnector``            ``@jupyterlab/statedb``
 ``IObjectPool``               ``@jupyterlab/statedb``
 ``IPoll``                     ``@lumino/polling``
 ``IRateLimiter``              ``@lumino/polling``
 ``IRestorable``               ``@jupyterlab/statedb``
 ``IRestorer``                 ``@jupyterlab/statedb``
 ``ISchemaValidator``          ``@jupyterlab/settingregistry``
 ``ISettingRegistry``          ``@jupyterlab/settingregistry``
 ``IStateDB``                  ``@jupyterlab/statedb``
 ``nbformat``                  ``@jupyterlab/nbformat``
 ``Poll``                      ``@lumino/polling``
 ``RateLimiter``               ``@lumino/polling``
 ``RestorablePool``            ``@jupyterlab/statedb``
 ``SettingRegistry``           ``@jupyterlab/settingregistry``
 ``Settings``                  ``@jupyterlab/settingregistry``
 ``StateDB``                   ``@jupyterlab/statedb``
 ``Throttler``                 ``@lumino/polling``
============================  =================================

Using ``Session`` and ``SessionContext`` to manage kernel sessions
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. note::

  For full API documentation and examples of how to use
  ``@jupyterlab/services``,
  `consult the repository <https://github.com/jupyterlab/jupyterlab/tree/3.6.x/packages/services#readme>`__.

``ConsolePanel`` and ``NotebookPanel`` now expose a
``sessionContext: ISessionContext`` attribute that allows for a uniform way to
interact with kernel sessions.

Any widget that matches the ``interface IDocumentWidget`` has a
``context: DocumentRegistry.IContext`` attribute with a
``sessionContext: ISessionContext`` attribute.

For example, consider how the ``@jupyterlab/debugger`` extension's
``DebuggerService`` updated its ``isAvailable()`` method.

.. figure:: images/extension_migration_session.png
   :align: center
   :class: jp-screenshot
   :alt: Updating the isAvailable method of the debugger service

   From the `PR migrating the debugger extension to JupyterLab 2.0 <https://github.com/jupyterlab/debugger/pull/337/files#diff-22ccf3ebb0cb6b300ee90a38b88edff8>`__

.. note::

  ``await kernel.ready`` is no longer necessary before the kernel connection
  ``kernel`` can be used. Kernel messages will be buffered as needed while a
  kernel connection is coming online, so you should be able to use a kernel
  connection immediately. If you want to retrieve the kernel info (or if for
  some other reason you want to wait until at least one message has returned
  from a new kernel connection), you can do ``await kernel.info``.

Using the new icon system and ``LabIcon``
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. note::

  For full API documentation and examples of how to use
  the new icon support based on ``LabIcon`` from ``@jupyterlab/ui-components``,
  `consult the repository <https://github.com/jupyterlab/jupyterlab/tree/3.6.x/packages/ui-components#readme>`__.


