.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

.. _developer-extension-points:

Common Extension Points
=======================

Most of the component parts of JupyterLab are designed to be extensible,
and they provide services that can be requested in extensions via tokens.
A list of common core tokens that extension authors can request is given in :ref:`core_tokens`.

Following the list of core tokens is a guide for using some of JupyterLab's most commonly-used extension points.
However, it is not an exhaustive account of how to extend the application components,
and more detailed descriptions of their public APIs may be found in the
`JupyterLab <../api/index.html>`__ and
`Lumino <https://lumino.readthedocs.io/>`__ API documentation.

.. contents:: Table of contents
    :local:
    :depth: 1

.. _core_tokens:

Core Plugins
------------

The core packages of JupyterLab provide the following plugins. They can be
enabled or disabled using the command ``jupyter labextension enable <plugin-id>`` or
``jupyter labextension disable <plugin-id>``.

.. include:: plugins_list.rst
   :parser: myst_parser.sphinx_

Core Tokens
-----------

The core packages of JupyterLab provide many services for plugins. The tokens
for these services are listed here, along with short descriptions of when you
might want to use the services in your extensions.

.. include:: tokens_list.rst
   :parser: myst_parser.sphinx_


Commands
--------

Add a Command to the Command Registry
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Perhaps the most common way to add functionality to JupyterLab is via commands.
These are lightweight objects that include a function to execute combined with
additional metadata, including how they are labeled and when they are to be enabled.
The application has a single command registry, keyed by string command IDs,
to which you can add your custom commands.

The commands added to the command registry can then be used to populate
several of the JupyterLab user interface elements, including menus and the launcher.

Here is a sample block of code that adds a command to the application (given by ``app``):

.. code:: typescript

    const commandID = 'my-command';
    let toggled = false;

    app.commands.addCommand(commandID, {
      label: 'My Cool Command',
      isEnabled: () => true,
      isVisible: () => true,
      isToggled: () => toggled,
      iconClass: 'some-css-icon-class',
      execute: () => {
        console.log(`Executed ${commandID}`);
        toggled = !toggled;
    });

This example adds a new command, which, when triggered, calls the ``execute`` function.
``isEnabled`` indicates whether the command is enabled, and determines whether renderings of it are greyed out.
``isToggled`` indicates whether to render a check mark next to the command.
``isVisible`` indicates whether to render the command at all.
``iconClass`` specifies a CSS class which can be used to display an icon next to renderings of the command.

Each of ``isEnabled``, ``isToggled``, and ``isVisible`` can be either
a boolean value or a function that returns a boolean value, in case you want
to do some logic in order to determine those conditions.

Likewise, each of ``label`` and ``iconClass`` can be either
a string value or a function that returns a string value.

There are several more options which can be passed into the command registry when
adding new commands. These are documented
`here <https://lumino.readthedocs.io/en/latest/api/interfaces/commands.CommandRegistry.ICommandOptions.html>`__.

After a command has been added to the application command registry
you can add them to various places in the application user interface,
where they will be rendered using the metadata you provided.

For example, you can add a button to the Notebook toolbar to run the command with the ``CommandToolbarButtonComponent``.

Add a Command to the Command Palette
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

In order to add an existing, registered command to the command palette, you need to request the
``ICommandPalette`` token in your extension.
Here is an example showing how to add a command to the command palette (given by ``palette``):

.. code:: typescript

    palette.addItem({
      command: commandID,
      category: 'my-category',
      args: {}
    });

The command ID is the same ID that you used when registering the command.
You must also provide a ``category``, which determines the subheading of
the command palette in which to render the command.
It can be a preexisting category (e.g., ``'notebook'``), or a new one of your own choosing.

The ``args`` are a JSON object that will be passed into your command's functions at render/execute time.
You can use these to customize the behavior of your command depending on how it is invoked.
For instance, you can pass in ``args: { isPalette: true }``.
Your command ``label`` function can then check the ``args`` it is provided for ``isPalette``,
and return a different label in that case.
This can be useful to make a single command flexible enough to work in multiple contexts.

.. _context_menu:

Context Menu
------------

JupyterLab has an application-wide context menu available as
``app.contextMenu``. The application context menu is shown when the user right-clicks,
and is populated with menu items that are most relevant to the thing that the user clicked.

The context menu system determines which items to show based on
`CSS selectors <https://developer.mozilla.org/en-US/docs/Learn/CSS/Introduction_to_CSS/Selectors>`__.
It propagates up the DOM tree and tests whether a given HTML element
matches the CSS selector provided by a given command.

Items can be added in the context menu in two ways:

1. Using the settings - this is the preferred way as they are configurable by the user.
2. Using the API - this is for advanced cases like dynamic menu or semantic items.

Here is an example showing how to add a command to the application context
menu using the settings.


.. code:: json

    {
      "jupyter.lab.menus": {
        "context": [
          {
            "command": "my-command",
            "selector": ".jp-Notebook",
            "rank": 500
          }
        ]
      }
    }

In this example, the command with id ``my-command`` is shown whenever the user
right-clicks on a DOM element matching ``.jp-Notebook`` (that is to say, a notebook).
The selector can be any valid CSS selector, and may target your own UI elements, or existing ones.
A list of CSS selectors currently used by context menu commands is given in :ref:`css-selectors`.

Item must follow this definition:

.. literalinclude:: ../snippets/packages/settingregistry/src/jupyter.lab.menus.json
   :language: json
   :lines: 14-34

where ``menuItem`` definition is:

.. literalinclude:: ../snippets/packages/settingregistry/src/menuItem.json
   :language: json


The same example using the API is shown below. See the Lumino `docs
<https://lumino.readthedocs.io/en/latest/api/interfaces/widgets.ContextMenu.IItemOptions.html>`__
for the item creation options.

.. code:: typescript

    app.contextMenu.addItem({
      command: commandID,
      selector: '.jp-Notebook'
    })

If you don't want JupyterLab's custom context menu to appear for your element, because you have
your own right click behavior that you want to trigger, you can add the `data-jp-suppress-context-menu` data attribute
to any node to have it and its children not trigger it.

For example, if you are building a custom React element, it would look like this:

.. code::

    function MyElement(props: {}) {
      return (
        <div data-jp-suppress-context-menu>
          <p>Hi</p>
          <p onContextMenu={() => {console.log("right clicked")}}>There</p>
        </div>
      )
    }


Alternatively, you can use a 'contextmenu' event listener and
call ``event.stopPropagation`` to prevent the application context menu
handler from being called (it is listening in the bubble phase on the
``document``). At this point you could show your own Lumino
`contextMenu <https://lumino.readthedocs.io/en/latest/api/modules/widgets.ContextMenu.html>`__,
or simply stop propagation and let the system context menu be shown.
This would look something like the following in a ``Widget`` subclass:

.. code:: javascript

    // In `onAfterAttach()`
    this.node.addEventListener('contextmenu', this);

    // In `handleEvent()`
    case 'contextmenu':
      event.stopPropagation();

.. _copy_shareable_link:

Copy Shareable Link
-------------------

The file browser provides a context menu item "Copy Shareable Link". The
desired behavior will vary by deployment and the users it serves. The file
browser supports overriding the behavior of this item.

.. code:: typescript

   import {
     IFileBrowserFactory
   } from '@jupyterlab/filebrowser';

   import {
     JupyterFrontEnd, JupyterFrontEndPlugin
   } from '@jupyterlab/application';


   const shareFile: JupyterFrontEndPlugin<void> = {
     activate: activateShareFile,
     id: commandID,
     requires: [IFileBrowserFactory],
     autoStart: true
   };

   function activateShareFile(
     app: JupyterFrontEnd,
     factory: IFileBrowserFactory
   ): void {
     const { commands } = app;
     const { tracker } = factory;

     commands.addCommand('filebrowser:share-main', {
       execute: () => {
         const widget = tracker.currentWidget;
         if (!widget) {
           return;
         }
         const path = encodeURI(widget.selectedItems().next().path);
         // Do something with path.
       },
       isVisible: () =>
         tracker.currentWidget &&
         Array.from(tracker.currentWidget.selectedItems()).length === 1,
       iconClass: 'jp-MaterialIcon jp-LinkIcon',
       label: 'Copy Shareable Link'
     });
   }

Note that an extension providing a replacement plugin like this must either :ref:`automatically disable <disabledExtensions>` the replaced core plugin or the user must disable the core plugin manually:

.. code-block:: bash

   jupyter labextension disable @jupyterlab/filebrowser-extension:share-file


Icons
-----

See :ref:`ui_components`


Keyboard Shortcuts
------------------

There are two ways of adding keyboard shortcuts in JupyterLab.
If you don't want the shortcuts to be user-configurable,
you can add them directly to the application command registry:

.. code:: typescript

    app.commands.addKeyBinding({
      command: commandID,
      args: {},
      keys: ['Accel T'],
      selector: '.jp-Notebook'
    });

In this example ``my-command`` command is mapped to ``Accel T``,
where ``Accel`` corresponds to ``Cmd`` on a Mac and ``Ctrl`` on Windows and Linux computers.

The behavior for keyboard shortcuts is very similar to that of the context menu:
the shortcut handler propagates up the DOM tree from the focused element
and tests each element against the registered selectors. If a match is found,
then that command is executed with the provided ``args``.
Full documentation for the options for ``addKeyBinding`` can be found
`here <https://lumino.readthedocs.io/en/latest/api/interfaces/commands.CommandRegistry.IKeyBindingOptions.html>`__.

JupyterLab also provides integration with its settings system for keyboard shortcuts.
Your extension can provide a settings schema with a ``jupyter.lab.shortcuts`` key,
declaring default keyboard shortcuts for a command:

.. code:: json

    {
      "jupyter.lab.shortcuts": [
        {
          "command": "my-command",
          "keys": ["Accel T"],
          "selector": ".jp-mod-searchable"
        }
      ]
    }

Shortcuts added to the settings system will be editable by users.

From Jupyterlab version 3.1 onwards, it is possible to execute multiple commands with a single shortcut.
This requires you to define a keyboard shortcut for ``apputils:run-all-enabled`` command:

.. code:: json

    {
      "command": "apputils:run-all-enabled",
      "keys": ["Accel T"],
      "args": {
        "commands": [
          "my-command-1",
          "my-command-2"
        ],
        "args": [
          {},
          {}
        ]
      },
      "selector": "body"
    }

In this example ``my-command-1`` and ``my-command-2`` are passed in ``args``
of ``apputils:run-all-enabled`` command as ``commands`` list.
You can optionally pass the command arguments of ``my-command-1`` and ``my-command-2`` in ``args``
of ``apputils:run-all-enabled`` command as ``args`` list.

Launcher
--------

As with menus, keyboard shortcuts, and the command palette, new items can be added
to the application launcher via commands.
You can do this by requesting the ``ILauncher`` token in your extension:

.. code:: typescript

    launcher.add({
      command: commandID,
      category: 'Other',
      rank: 0
    });

In addition to providing a command ID, you also provide a category in which to put your item,
(e.g. 'Notebook', or 'Other'), as well as a rank to determine its position among other items.

.. _shell:

Jupyter Front-End Shell
-----------------------

The Jupyter front-end
`shell <../api/interfaces/application.JupyterFrontEnd.IShell.html>`__
is used to add and interact with content in the application. The ``IShell``
interface provides an ``add()`` method for adding widgets to the application.
In JupyterLab, the application shell consists of:

-  A ``top`` area for things like top-level toolbars and information.
-  A ``menu`` area for top-level menus, which is collapsed into the ``top`` area in multiple-document mode and put below it in single-document mode.
-  ``left`` and ``right`` sidebar areas for collapsible content.
-  A ``main`` work area for user activity.
-  A ``down`` area for information content; like log console, contextual help.
-  A ``bottom`` area for things like status bars.
-  A ``header`` area for custom elements.

Top Area
^^^^^^^^

The top area is intended to host most persistent user interface elements that span the whole session of a user.
A toolbar named **TopBar** is available on the right of the main menu bar. For example, JupyterLab adds a user
dropdown to that toolbar when started in ``collaborative`` mode.

See :ref:`generic toolbars <generic-toolbar>` to see how to add a toolbar or a custom widget to a toolbar.

You can use a numeric rank to control the ordering of top bar items in the settings; see :ref:`Toolbar definitions <toolbar-settings-definition>`.

JupyterLab adds a spacer widget to the top bar at rank ``50`` by default.
You can then use the following guidelines to place your items:

* ``rank <= 50`` to place items to the left side in the top bar
* ``rank > 50`` to place items to the right side in the top bar

Left/Right Areas
^^^^^^^^^^^^^^^^

The left and right sidebar areas of JupyterLab are intended to host more persistent user interface
elements than the main area. That being said, extension authors are free to add whatever
components they like to these areas. The outermost-level of the object that you add is expected
to be a Lumino ``Widget``, but that can host any content you like (such as React components).

As an example, the following code executes an application command to a terminal widget
and then adds the terminal to the right area:

.. code:: typescript

  app.commands
    .execute('terminal:create-new')
    .then((terminal: WidgetModuleType.Terminal) => {
      app.shell.add(terminal, 'right');
    });

You can use a numeric rank to control the ordering of the left and right tabs:

.. code:: typescript

  app.shell.add(terminal, 'left', {rank: 600});

The recommended ranges for this rank are:

* 0-500: reserved for first-party JupyterLab extensions.
* 501-899: reserved for third-party extensions.
* 900: The default rank if none is specified.
* 1000: The JupyterLab extension manager.

.. _mainmenu:

Main Menu
---------

There are two ways to extend JupyterLab's main menu.

1. Using the settings - this is the preferred way as they are configurable by the user.
2. Using the API - this is for advanced cases like dynamic menu or semantic items.

Settings-defined menu
^^^^^^^^^^^^^^^^^^^^^

JupyterLab provides integration with its settings system for menu definitions.
Your extension can provide a settings schema with a ``jupyter.lab.menus`` key,
declaring default menus. You don't need to set anything in the TypeScript code
(except the command definitions).

To add a new menu with your extension command:

.. code:: json

    {
      "jupyter.lab.menus": {
        "main": [
          {
            "id": "jp-mainmenu-myextension",
            "label": "My Menu",
            "items": [
              {
                "command": "my-command",
                "rank": 500
              }
            ],
            "rank": 100
          }
        ]
      }
    }

The menu item label will be set with the command label. For menus (and
submenus), the label needs to be set explicitly with the ``label``
property.

Menu and item have a ``rank`` that will determine the elements order.


To add a new entry in an existing menu:

.. code:: json

    {
      "jupyter.lab.menus": {
        "main": [
          {
            "id": "jp-mainmenu-file",
            "items": [
              {
                "command": "my-command",
                "rank": 500
              }
            ]
          }
        ]
      }
    }

Here is the list of default menu ids:

- File menu: ``jp-mainmenu-file``

  * New file submenu: ``jp-mainmenu-file-new``

- Edit menu: ``jp-mainmenu-edit``
- View menu: ``jp-mainmenu-view``

  * Appearance submenu: ``jp-mainmenu-view-appearance``

- Run menu: ``jp-mainmenu-run``
- Kernel menu: ``jp-mainmenu-kernel``
- Tabs menu: ``jp-mainmenu-tabs``
- Settings menu: ``jp-mainmenu-settings``
- Help menu: ``jp-mainmenu-help``

The default main menu is defined in the ``mainmenu-extension`` package settings.

A menu must respect the following schema:

.. literalinclude:: ../snippets/packages/settingregistry/src/jupyter.lab.menus.json
   :language: json
   :lines: 5-13

And an item must follow:

.. literalinclude:: ../snippets/packages/settingregistry/src/menu.json
   :language: json

Menus added to the settings system will be editable by users using the ``mainmenu-extension``
settings. In particular, they can be disabled at the item or the menu level by setting the
property ``disabled`` to ``true``.

API-defined menu
^^^^^^^^^^^^^^^^

To use the API, you should request the ``IMainMenu`` token for your extension.

There are three main ways to extend:

1. You can add your own menu to the menu bar.
2. You can add new commands to the existing menus.
3. You can register your extension with one of the existing semantic menu items.

Adding a New Menu
~~~~~~~~~~~~~~~~~

To add a new menu to the menu bar, you need to create a new
`Lumino menu <https://lumino.readthedocs.io/en/latest/api/classes/widgets.Menu-1.html>`__.

You can then add commands to the menu in a similar way to the command palette,
and add that menu to the main menu bar:

.. code:: typescript

    const menu = new Menu({ commands: app.commands });
    menu.addItem({
      command: commandID,
      args: {},
    });

    mainMenu.addMenu(menu, { rank: 40 });

As with the command palette, you can optionally pass in ``args`` to customize the
rendering and execution behavior of the command in the menu context.


Adding a New Command to an Existing Menu
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

In many cases you will want to add your commands to the existing JupyterLab menus
rather than creating a separate menu for your extension.
Because the top-level JupyterLab menus are shared among many extensions,
the API for adding items is slightly different.
In this case, you provide a list of commands and a rank,
and these commands will be displayed together in a separate group within an existing menu.

For instance, to add a command group with ``firstCommandID`` and ``secondCommandID``
to the File menu, you would do the following:

.. code:: typescript

    mainMenu.fileMenu.addGroup([
      {
        command: firstCommandID,
      },
      {
        command: secondCommandID,
      }
    ], 40 /* rank */);


Registering a Semantic Menu Item
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

There are some commands in the JupyterLab menu system that are considered
common and important enough that they are treated differently.

For instance, we anticipate that many activities may want to provide a command
to close themselves and perform some cleanup operation (like closing a console and shutting down its kernel).
Rather than having a proliferation of similar menu items for this common operation
of "closing-and-cleanup", we provide a single command that can adapt itself to this use case,
which we term a "semantic menu item".
For this example, it is the File Menu ``closeAndCleaners`` set.

Here is an example of using the ``closeAndCleaners`` semantic menu item:

.. code:: typescript

    mainMenu.fileMenu.closeAndCleaners.add({
      id: 'notebook:close-and-shutdown',
      isEnabled: (w: Widget) => tracker.currentWidget !== null && tracker.has(w)
    });

In this example, ``tracker`` is a :ref:`widget-tracker`, which allows the menu
item to determine whether to delegate the menu command to your activity, and ``id`` is a the command identifier.

More examples for how to register semantic menu items are found throughout the JupyterLab code base.
The available semantic menu items are:

- ``IEditMenu.IUndoer``: an activity that knows how to undo and redo.
- ``IEditMenu.IClearer``: an activity that knows how to clear its content.
- ``IEditMenu.IGoToLiner``: an activity that knows how to jump to a given line.
- ``IFileMenu.ICloseAndCleaner``: an activity that knows how to close and clean up after itself.
- ``IFileMenu.IConsoleCreator``: an activity that knows how to create an attached code console for itself.
- ``IHelpMenu.IKernelUser``: an activity that knows how to get a related kernel session.
- ``IKernelMenu.IKernelUser``: an activity that can perform various kernel-related operations.
- ``IRunMenu.ICodeRunner``: an activity that can run code from its content.
- ``IViewMenu.IEditorViewer``: an activity that knows how to set various view-related options on a text editor that it owns.


Status Bar
----------

JupyterLab's status bar is intended to show small pieces of contextual information.
Like the left and right areas, it only expects a Lumino ``Widget``,
which might contain any kind of content. Since the status bar has limited space,
you should endeavor to only add small widgets to it.

The following example shows how to place a status item that displays the current
"busy" status for the application. This information is available from the ``ILabStatus``
token, which we reference by a variable named ``labStatus``.
We place the ``statusWidget`` in the middle of the status bar.
When the ``labStatus`` busy state changes, we update the text content of the
``statusWidget`` to reflect that.

.. code:: typescript

    const statusWidget = new Widget();
    labStatus.busySignal.connect(() => {
      statusWidget.node.textContent = labStatus.isBusy ? 'Busy' : 'Idle';
    });
    statusBar.registerStatusItem('lab-status', {
      align: 'middle',
      item: statusWidget
    });

.. _toolbar-registry:


Toolbar Registry
----------------

JupyterLab provides an infrastructure to define and customize toolbar widgets
from the settings, which is similar to that defining the context menu and the main menu
bar.

Document Widgets
^^^^^^^^^^^^^^^^

A typical example is the notebook toolbar as in the snippet below:

.. code:: typescript

   function activatePlugin(
     app: JupyterFrontEnd,
     // ...
     toolbarRegistry: IToolbarWidgetRegistry | null,
     settingRegistry: ISettingRegistry | null
   ): NotebookWidgetFactory.IFactory {
     const { commands } = app;
     let toolbarFactory:
       | ((widget: NotebookPanel) => DocumentRegistry.IToolbarItem[])
       | undefined;

     // Register notebook toolbar specific widgets
     if (toolbarRegistry) {
       toolbarRegistry.registerFactory<NotebookPanel>(FACTORY, 'cellType', panel =>
         ToolbarItems.createCellTypeItem(panel, translator)
       );

       toolbarRegistry.registerFactory<NotebookPanel>(
         FACTORY,
         'kernelStatus',
         panel => Toolbar.createKernelStatusItem(panel.sessionContext, translator)
       );
       // etc...

       if (settingRegistry) {
         // Create the factory
         toolbarFactory = createToolbarFactory(
           toolbarRegistry,
           settingRegistry,
           // Factory name
           FACTORY,
           // Setting id in which the toolbar items are defined
           '@jupyterlab/notebook-extension:panel',
           translator
         );
       }
     }

     const factory = new NotebookWidgetFactory({
       name: FACTORY,
       fileTypes: ['notebook'],
       modelName: 'notebook',
       defaultFor: ['notebook'],
       // ...
       toolbarFactory,
       translator: translator
     });
     app.docRegistry.addWidgetFactory(factory);

The registry ``registerFactory`` method allows an extension to provide special widget for a unique pair
(factory name, toolbar item name). Then the helper ``createToolbarFactory`` can be used to extract the
toolbar definition from the settings and build the factory to pass to the widget factory.

The default toolbar items can be defined across multiple extensions by providing an entry in the ``"jupyter.lab.toolbars"``
mapping. For example for the notebook panel:

.. _toolbar-settings-definition:

.. code:: js

   "jupyter.lab.toolbars": {
     "Notebook": [ // Factory name
       // Item with non-default widget - it must be registered within an extension
       {
         "name": "save", // Unique toolbar item name
         "rank": 10 // Item rank
       },
       // Item with default button widget triggering a command
       { "name": "insert", "command": "notebook:insert-cell-below", "rank": 20 },
       { "name": "cut", "command": "notebook:cut-cell", "rank": 21 },
       { "name": "copy", "command": "notebook:copy-cell", "rank": 22 },
       { "name": "paste", "command": "notebook:paste-cell-below", "rank": 23 },
       { "name": "run", "command": "runmenu:run", "rank": 30 },
       { "name": "interrupt", "command": "kernelmenu:interrupt", "rank": 31 },
       { "name": "restart", "command": "kernelmenu:restart", "rank": 32 },
       {
         "name": "restart-and-run",
         "command": "notebook:restart-run-all",
         "rank": 33 // The default rank is 50
       },
       { "name": "cellType", "rank": 40 },
       // Horizontal spacer widget
       { "name": "spacer", "type": "spacer", "rank": 100 },
       { "name": "kernelName", "rank": 1000 },
       { "name": "kernelStatus", "rank": 1001 }
     ]
   },
   "jupyter.lab.transform": true,
   "properties": {
     "toolbar": {
       "title": "Notebook panel toolbar items",
       "items": {
         "$ref": "#/definitions/toolbarItem"
       },
       "type": "array",
       "default": []
     }
   }


The settings registry will merge those definitions from settings schema with any
user-provided overrides (customizations) transparently and save them under the
``toolbar`` property in the final settings object. The ``toolbar`` list will be used to
create the toolbar. Both the source settings schema and the final settings object
are identified by the plugin ID passed to ``createToolbarFactory``. The user can
customize the toolbar by adding new items or overriding existing ones (like
providing a different rank or adding ``"disabled": true`` to remove the item).

.. note::

   You need to set ``jupyter.lab.transform`` to ``true`` in the plugin id that will gather all items.


The current widget factories supporting the toolbar customization are:

- ``Notebook``: Notebook panel toolbar
- ``Cell``: Cell toolbar
- ``Editor``: Text editor toolbar
- ``HTML Viewer``: HTML Viewer toolbar
- ``CSVTable``: CSV (Comma Separated Value) Viewer toolbar
- ``TSVTable``: TSV (Tabulation Separated Value) Viewer toolbar

.. _toolbar-item:

And the toolbar item must follow this definition:

.. literalinclude:: ../snippets/packages/settingregistry/src/toolbarItem.json
   :language: json

.. _generic-toolbar:

Generic Widget with Toolbar
^^^^^^^^^^^^^^^^^^^^^^^^^^^

The logic detailed in the previous section can be used to customize any widgets with a toolbar.

The additional keys used in ``jupyter.lab.toolbars`` settings attributes are:

- ``Cell``: Cell toolbar
- ``FileBrowser``: Default file browser panel toolbar items
- ``TopBar``: Top area toolbar (right of the main menu bar)

Here is an example for enabling a toolbar on a widget:

.. code:: typescript

   function activatePlugin(
     app: JupyterFrontEnd,
     // ...
     toolbarRegistry: IToolbarWidgetRegistry,
     settingRegistry: ISettingRegistry
   ): void {

     const browser = new FileBrowser();

     // Toolbar
     // - Define a custom toolbar item
     toolbarRegistry.registerFactory(
       'FileBrowser', // Factory name
       'uploader',
       (browser: FileBrowser) =>
         new Uploader({ model: browser.model, translator })
     );

     // - Link the widget toolbar and its definition from the settings
     setToolbar(
       browser, // This widget is the one passed to the toolbar item factory
       createToolbarFactory(
         toolbarRegistry,
         settings,
         'FileBrowser', // Factory name
         plugin.id,
         translator
       ),
       // You can explicitly pass the toolbar widget if it is not accessible as `toolbar` attribute
       // toolbar,
     );

See :ref:`Toolbar definitions <toolbar-settings-definition>` example on how to define the toolbar
items in the settings.

.. _widget-tracker:

Widget Tracker
--------------

Often extensions will want to interact with documents and activities created by other extensions.
For instance, an extension may want to inject some text into a notebook cell,
or set a custom keymap, or close all documents of a certain type.
Actions like these are typically done by widget trackers.
Extensions keep track of instances of their activities in ``WidgetTrackers``,
which are then provided as tokens so that other extensions may request them.

For instance, if you want to interact with notebooks, you should request the ``INotebookTracker`` token.
You can then use this tracker to iterate over, filter, and search all open notebooks.
You can also use it to be notified via signals when notebooks are added and removed from the tracker.

Widget tracker tokens are provided for many activities in JupyterLab, including
notebooks, consoles, text files, mime documents, and terminals.
If you are adding your own activities to JupyterLab, you might consider providing
a ``WidgetTracker`` token of your own, so that other extensions can make use of it.


Completion Providers
--------------------

Both code completer and inline completer can be extended by registering
an (inline) completion provider on the completion manager provided by
the ``ICompletionProviderManager`` token.


Code Completer
^^^^^^^^^^^^^^

A minimal code completion provider needs to implement the `fetch` and `isApplicable`
methods, and define a unique `identifier` property, but the ``ICompletionProvider``
interface allows for much more extensive customization of the completer.

.. code:: typescript

    import {
      CompletionHandler,
      ICompletionProviderManager,
      ICompletionContext,
      ICompletionProvider
    } from '@jupyterlab/completer';

    class MyProvider implements ICompletionProvider {
      readonly identifier = 'my-provider';

      async isApplicable(context: ICompletionContext) {
        return true;
      }

      async fetch(
        request: CompletionHandler.IRequest,
        context: ICompletionContext
      ) {
        return {
          start: request.offset,
          end: request.offset,
          items: [
            { label: 'option 1' },
            { label: 'option 2' }
          ]
        };
      }
    }

    const plugin: JupyterFrontEndPlugin<void> = {
      id: 'my-completer-extension:provider',
      autoStart: true,
      requires: [ICompletionProviderManager],
      activate: (app: JupyterFrontEnd, manager: ICompletionProviderManager): void => {
        const provider = new MyProvider();
        manager.registerProvider(provider);
      }
    };


A more detailed example is provided in the `extension-examples <https://github.com/jupyterlab/extension-examples/tree/main/completer>`__ repository.

For an example of an extensively customised completion provider, see the
`jupyterlab-lsp <https://github.com/jupyter-lsp/jupyterlab-lsp>`__ extension.

Inline Completer
^^^^^^^^^^^^^^^^

.. versionadded::4.1
    Experimental Inline Completion API was added in JupyterLab 4.1.
    We welcome feedback on making it better for extension authors.

A minimal inline completion provider extension would only implement the
required method `fetch` and define `identifier` and `name` properties,
but a number of additional fields can be used for enhanced functionality,
such as streaming, see the ``IInlineCompletionProvider`` documentation.

.. code:: typescript

    import {
      CompletionHandler,
      ICompletionProviderManager,
      IInlineCompletionContext,
      IInlineCompletionProvider
    } from '@jupyterlab/completer';

    class MyInlineProvider implements IInlineCompletionProvider {
      readonly identifier = 'my-provider';
      readonly name = 'My provider';

      async fetch(
        request: CompletionHandler.IRequest,
        context: IInlineCompletionContext
      ) {
        return {
          items: [
            { insertText: 'suggestion 1' },
            { insertText: 'suggestion 2' }
          ]
        };
      }
    }

    const plugin: JupyterFrontEndPlugin<void> = {
      id: 'my-completer-extension:inline-provider',
      autoStart: true,
      requires: [ICompletionProviderManager],
      activate: (app: JupyterFrontEnd, manager: ICompletionProviderManager): void => {
        const provider = new MyInlineProvider();
        manager.registerInlineProvider(provider);
      }
    };

For an example of an inline completion provider with streaming support, see
`jupyterlab-transformers-completer <https://github.com/krassowski/jupyterlab-transformers-completer>`__.

State Database
--------------

The state database can be accessed by importing ``IStateDB`` from
``@jupyterlab/statedb`` and adding it to the list of ``requires`` for
a plugin:

.. code:: typescript

    const id = 'foo-extension:IFoo';

    const IFoo = new Token<IFoo>(id);

    interface IFoo {}

    class Foo implements IFoo {}

    const plugin: JupyterFrontEndPlugin<IFoo> = {
      id,
      autoStart: true,
      requires: [IStateDB],
      provides: IFoo,
      activate: (app: JupyterFrontEnd, state: IStateDB): IFoo => {
        const foo = new Foo();
        const key = `${id}:some-attribute`;

        // Load the saved plugin state and apply it once the app
        // has finished restoring its former layout.
        Promise.all([state.fetch(key), app.restored])
          .then(([saved]) => { /* Update `foo` with `saved`. */ });

        // Fulfill the plugin contract by returning an `IFoo`.
        return foo;
      }
    };

LSP Features
--------------

JupyterLab provides an infrastructure to communicate with the language servers. If the LSP services are activated and users have language servers installed, JupyterLab will start the language servers for the language of the opened notebook or file. Extension authors can access the virtual documents and the associated LSP connection of opened document by requiring the ``ILSPDocumentConnectionManager`` token from ``@jupyterlab/lsp``.

Here is an example for making requests to the language server.

.. code:: typescript

  const plugin: JupyterFrontEndPlugin<void> = {
    id,
    autoStart: true,
    requires: [ILSPDocumentConnectionManager],
    activate: async (app: JupyterFrontEnd, manager: ILSPDocumentConnectionManager): Promise<void> => {

      // Get the path to the opened notebook of file
      const path = ...

      // Get the widget adapter of opened document
      const adapter = manager.adapters.get(path);
      if (!adapter) {
        return
      }
      // Get the associated virtual document of the opened document
      const virtualDocument = adapter.virtualDocument;

      // Get the LSP connection of the virtual document.
      const connection = manager.connections.get(virtualDocument.uri);
      ...
      // Send completion request to the language server
      const response = await connection.clientRequests['textDocument/completion'].request(params);
      ...
    }
  };

Occasionally, LSP extensions include a CodeMirror extension to modify the code editor. In those cases, you can follow this example:

.. code:: typescript

  const renamePlugin: JupyterFrontEndPlugin<void> = {
    id,
    autoStart: true,
    requires: [ILSPDocumentConnectionManager, ILSPFeatureManager, IWidgetLSPAdapterTracker],
    activate: (app: JupyterFrontEnd, connectionManager: ILSPDocumentConnectionManager, featureManager: ILSPFeatureManager, tracker: IWidgetLSPAdapterTracker) => {
      const FEATURE_ID = "rename_symbol";
      const extensionFactory: EditorAdapter.ILSPEditorExtensionFactory = {
        name: FEATURE_ID,
        factory: (options) =>  {
          const { editor, widgetAdapter } = options;

          // Get the editor
          const ceEditor: CodeEditor.IEditor | null = editor.getEditor();
          if (!ceEditor) {
            return null;
          }

          // Get the associated virtual document of the opened document
          if (!widgetAdapter.virtualDocument) {
            return null;
          }

          // Get the LSP connection of the virtual document.
          const connection = connectionManager.connections.get(widgetAdapter.virtualDocument.uri);
          if (!connection || !connection.provides('renameProvider')) {
            return null;
          }

          // Create a CodeMirror extension that listens for double click, gets the
          // selected code and makes a LSP request to rename it and prints the results.
          const ext = EditorView.domEventHandlers({ dblclick: (e, view) => {
            const range = ceEditor.getSelection();
              const res = connection.clientRequests['textDocument/rename'].request({
                newName: "test",
                position: { line: range.start.line, character: range.start.column },
                textDocument: { uri: widgetAdapter.virtualDocument!.uri }
              });

              res.then(value => {
                console.debug(value);
              }).catch(e => console.error);
          }});

          // Wrap the CodeMirror extension in the extension registry object.
          return EditorExtensionRegistry.createImmutableExtension(ext);
        }
      }

      // Register the extension with the LSP feature
      featureManager.register({
        id: FEATURE_ID,
        extensionFactory
      });
    }
  };
