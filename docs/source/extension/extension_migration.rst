.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

.. _extension_migration:

Extension Migration Guide
================================================

JupyterLab 3.x to 4.x
---------------------

.. note::

   With JupyterLab 4.x, the npm package version policy changed to not bump major version with
   the Python package unless required to ease extension compatibility.

API breaking changes
^^^^^^^^^^^^^^^^^^^^

Here is a list of JupyterLab npm packages that encountered API changes and therefore have
bumped their major version (following semver convention). We want to point out particularly
``@jupyterlab/documentsearch`` and ``@jupyterlab/toc`` API that have been fully reworked.

- ``@jupyterlab/application`` from 3.x to 4.x
   Major version bump to allow alternate ``ServiceManager`` implementations in ``JupyterFrontEnd``.
   Specifically this allows the use of a mock manager.
   This also makes the ``JupyterLab.IOptions`` more permissive to not require a shell when options are
   given and allow a shell that meets the ``ILabShell`` interface.
   As a consequence, all other ``@jupyterlab/`` packages have their major version bumped too.
   See https://github.com/jupyterlab/jupyterlab/pull/11537 for more details.
- ``@jupyterlab/apputils`` from 3.x to 4.x
   Rename ``IToolbarWidgetRegistry.registerFactory`` to ``IToolbarWidgetRegistry.addFactory``
- ``@jupyterlab/buildutils`` from 3.x to 4.x
   * The ``create-theme`` script has been removed. If you want to create a new theme extension, you
     should use the `Theme Cookiecutter <https://github.com/jupyterlab/theme-cookiecutter>`_ instead.
   * The ``add-sibling`` script has been removed. Check out :ref:`source_dev_workflow` instead.
   * The ``exitOnUuncaughtException`` util function has been renamed to ``exitOnUncaughtException`` (typo fix).
- ``@jupyterlab/cells`` from 3.x to 4.x
   ``MarkdownCell.toggleCollapsedSignal`` renamed ``MarkdownCell.headingCollapsedChanged``
   To support notebook windowing, cell widget children (e.g. the editor or the output area) are not instantiated
   when the cell is attached to the notebook. You can test for ``isPlaceholder()`` to see if the cell has been
   fully instantiated or wait for the promise ``ready`` to be resolved. Additionally an attribute ``inViewport``
   and a signal ``inViewportChanged`` are available to test if the cell is attached to the DOM.
   If you instantiate standalone cells outside of a notebook, you will probably need to set the constructor option
   ``placeholder`` to ``false`` to ensure direct rendering of the cell.
- ``@jupyterlab/completer`` from 3.x to 4.x
   Major version bumped following the removal of ``ICompletionManager`` token and the replacement
   of ``ICompletableAttributes`` interface by ``ICompletionProvider``. To create a completer provider
   for JupyterLab, users need to implement the interface ``ICompletionProvider`` and then register
   this provider with ``ICompletionProviderManager`` token.
- ``@jupyterlab/console`` from 3.x to 4.x
   The type of ``IConsoleHistory.sessionContext`` has been updated to ``ISessionContext | null`` instead of ``ISessionContext``.
   This might break the compilation of plugins accessing the ``sessionContext`` from a ``ConsoleHistory``,
   in particular those with the strict null checks enabled.
- ``@jupyterlab/docmanager`` from 3.x to 4.x
   * The ``renameDialog`` now receives the ``DocumentRegistry.Context`` instead of a path.
   * The interface ``DocumentManager.IWidgetOpener`` is now ``IDocumentWidgetOpener`` and is provided
     by a new plugin ``@jupyterlab/docmanager-extension:opener``.
     The ``IDocumentWidgetOpener`` interface also now defines an ```opened``` signal that is emitted when a widget is opened.
- ``@jupyterlab/docprovider`` from 3.x to 4.x
   * ``WebSocketProviderWithLocks`` has been renamed to ``WebSocketProvider``.
     ``acquireLock``, ``releaseLock``, ``requestInitialContent`` and ``putInitializedState`` have been removed from ``IDocumentProvider``.
     ``renameAck`` is not optional anymore in ``IDocumentProvider``.
   * ``IDocumentProviderFactory.IOptions`` is now templated with ``T extends ISharedDocument``.
     And the ``ymodel`` attribute has been renamed ``model`` typed ``T`` (relaxing typing from ``YDocument`` to ``ISharedDocument``).
- ``@jupyterlab/documentsearch`` from 3.x to 4.x
   * ``@jupyterlab/documentsearch:plugin`` has been renamed to ``@jupyterlab/documentsearch-extension:plugin``
   * ``@jupyterlab/documentsearch:labShellWidgetListener`` has been renamed to ``@jupyterlab/documentsearch-extension:labShellWidgetListener``

   This may impact application configuration (for instance if the plugin was disabled).
   The search provider API has been fully reworked. But the logic is similar, for new type of documents
   you will need to register a ``ISearchProviderFactory`` to the ``ISearchProviderRegistry``. The
   factory will build a ``ISearchProvider`` for the document widget.
- ``@jupyterlab/extensionmanager`` from 3.x to 4.x
   The frontend API has been drastically reduced to fetch all information from the backend. It is now advised
   that you implement a custom ``ExtensionManager`` class for your needs rather than overriding the frontend plugins.
   See ``jupyterlab/extensions/pypi.py`` for an example using PyPI.org and pip. You can then register your manager
   by defining an entry point in the Python package; see ``pyproject.toml::project.entry-points."jupyterlab.extension_manager_v1"``.
- ``@jupyterlab/fileeditor`` from 3.x to 4.x
   Remove the class ``FileEditorCodeWrapper``, instead, you can use ``CodeEditorWrapper`` from ``@jupyterlab/codeeditor``.
- ``@jupyterlab/filebrowser-extension`` from 3.x to 4.x
   Remove command ``filebrowser:create-main-launcher``. You can replace by ``launcher:create`` (same behavior)
   All launcher creation actions are moved to ``@jupyterlab/launcher-extension``.
- ``@jupyterlab/galata`` from 4.x to 5.x
   * ``ContentsHelper`` and ``galata.newContentsHelper`` have new constructor arguments to use Playwright API request object:
     ``new ContentsHelper(baseURL, page?, request?)`` -> ``new ContentsHelper(request?, page?)``
     ``galata.newContentsHelper(baseURL, page?, request?)`` -> ``galata.newContentsHelper(request?, page?)``
     you need to provide ``request`` or ``page``; they both are fixtures provided by Playwright.
   * ``galata.Mock.clearRunners(baseURL, runners, type)`` -> ``galata.Mock.clearRunners(request, runners, type)``
- ``@jupyterlab/notebook`` from 3.x to 4.x
   * The ``NotebookPanel._onSave`` method is now ``private``.
   * ``NotebookActions.collapseAll`` method renamed to ``NotebookActions.collapseAllHeadings``.
   * Command ``Collapsible_Headings:Toggle_Collapse`` renamed to ``notebook:toggle-heading-collapse``.
   * Command ``Collapsible_Headings:Collapse_All`` renamed to ``notebook:collapse-all-headings``.
   * Command ``Collapsible_Headings:Expand_All`` renamed to ``notebook:expand-all-headings``.
   * To support windowing, a new method ``scrollToItem(index, behavior)`` is available to scroll to any
     cell that may or may not be in the DOM. And new ``cellInViewportChanged`` signal is available to listen
     for cells entering or leaving the viewport (in windowing mode). And ``scrollToCell(cell)`` is now returning
     a ``Promise<void>`` calling internally ``scrollToItem``.
   * ``fullyRendered``, ``placeholderCellRendered`` and ``remainingCellToRenderCount`` have been removed.
     The defer rendering mode still exists. It will render some cells during spare CPU Idle time.
   * Settings ``numberCellsToRenderDirectly``, ``remainingTimeBeforeRescheduling``, ``renderCellOnIdle``,
     ``observedTopMargin`` and ``observedBottomMargin`` have been removed. Instead a ``windowingMode``
     with value of *defer*, *full* or *none* and ``overscanCount`` have been added to manage the rendering
     mode.
- ``@jupyterlab/rendermime`` from 3.x to 4.x
  The markdown parser has been extracted to its own plugin ``@jupyterlab/markedparser-extension:plugin``
  that provides a new token ``IMarkdownParser`` (defined in ``@jupyterlab/rendermime``).
  Consequently the ``IRendererFactory.createRenderer`` has a new option ``markdownParser``.
- ``@jupyterlab/rendermime-interfaces`` from 3.x to 4.x
  Remove ``IRenderMime.IRenderer.translator?`` attribute; the translator object is still passed to
  the constructor if needed by the renderer factory.
- ``@jupyterlab/services`` from 6.x to 7.x
   * Remove ``Contents.IDrive.modelDBFactory`` and ``Contents.IManager.getModelDBFactory``.
- ``@jupyterlab/shared-models`` from 3.x to 4.x
   The ``createCellFromType`` function has been renamed to ``createCellModelFromSharedType``
- ``@jupyterlab/statusbar`` from 3.x to 4.x
  Setting ``@jupyterlab/statusbar-extension:plugin . startMode`` moved to ``@jupyterlab/application-extension:shell . startMode``
  Plugin ``@jupyterlab/statusbar-extension:mode-switch`` renamed to ``@jupyterlab/application-extension:mode-switch``
  Plugin ``@jupyterlab/statusbar-extension:kernel-status`` renamed to ``@jupyterlab/apputils-extension:kernel-status``
  Plugin ``@jupyterlab/statusbar-extension:running-sessions-status`` renamed to ``@jupyterlab/apputils-extension:running-sessions-status``
  Plugin ``@jupyterlab/statusbar-extension:line-col-status`` renamed to ``@jupyterlab/codemirror-extension:line-col-status``
  ``HoverBox`` component moved from ``@jupyterlab/apputils`` to ``@jupyterlab/ui-components``.
- ``@jupyterlab/toc`` from 3.x to 4.x
   ``@jupyterlab/toc:plugin`` renamed ``@jupyterlab/toc-extension:registry``
   This may impact application configuration (for instance if the plugin was disabled).
   The namespace ``TableOfContentsRegistry`` has been renamed ``TableOfContents``.
   The API has been fully reworked. The new table of content providers must implement a factory
   ``TableOfContents.IFactory`` that will create a model ``TableOfContents.IModel<TableOfContents.IHeading>``
   for supported widget. The model provides a list of headings described by a ``text`` and
   a ``level`` and optionally a ``prefix``, a ``collapsed`` state and a ``dataset`` (data
   DOM attributes dictionary).
- ``@jupyterlab/ui-components`` from 3.x to 4.x
   Major version bumped following removal of Blueprint JS dependency. Extensions using proxied
   components like ``Checkbox``, ``Select`` or ``Intent`` will need to import them explicitly
   from Blueprint JS library. Extensions using ``Button``, ``Collapse`` or ``InputGroup`` may
   need to switch to the Blueprint components as the interfaces of those components in JupyterLab
   do not match those of Blueprint JS.
   Remove ``Collapse`` React component.
- TypeScript 4.7 update
   As a result of the update to TypeScript 4.7, a couple of interfaces have had their definitions changed.
   The ``anchor`` parameter of ``HoverBox.IOptions`` is now a ``DOMRect`` instead of ``ClientRect``.
   The ``CodeEditor.ICoordinate`` interface now extends ``DOMRectReadOnly`` instead of ``JSONObject, ClientRect``.

Extension Development Changes
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

- The ``externalExtensions`` field in the ``dev_mode/package.json`` file corresponding to the ``@jupyterlab/application-top``
  ``private`` package has now been removed in ``4.0``. If you were using this field to develop source extensions against
  a development build of JupyterLab, you should instead switch to the federated extensions system (via the ``--extensions-in-dev-mode`` flag)
  or to using the ``--splice-source`` option. See :ref:`prebuilt_dev_workflow` and :ref:`source_dev_workflow` for more information.
- The ``webpack`` dependency in ``@jupyterlab/builder`` has been updated to ``5.72`` (or newer). Base rules have been updated to use the
  `Asset Modules <https://webpack.js.org/guides/asset-modules>`_ instead of the previous ``file-loader``, ``raw-loader`` and ``url-loader``.
  This might affect third-party extensions if they were relying on specific behaviors from these loaders.
- In JupyterLab 3.x, the CSS for a _disabled_ prebuilt extensions would still be loaded on the page.
  This is no longer the case in JupyterLab 4.0.

JupyterLab 3.0 to 3.1
---------------------

New main and context menus customization
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

JupyterLab 3.1 introduces a new way to hook commands into :ref:`mainmenu` and :ref:`context_menu`.
It allows the final user to customize those menus through settings as it is already possible for
the shortcuts.
Using the API is not recommended any longer except to create dynamic menus.


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

JupyterLab 2.x to 3.x
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
`JupyterLab core packages code base <https://github.com/jupyterlab/jupyterlab/tree/master/packages>`__
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
  `consult the repository <https://github.com/jupyterlab/jupyterlab/tree/master/packages/services#readme>`__.

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
  `consult the repository <https://github.com/jupyterlab/jupyterlab/tree/master/packages/ui-components#readme>`__.
