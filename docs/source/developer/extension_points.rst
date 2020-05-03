.. _developer-extension-points:

Common Extension Points
-----------------------

Most of the component parts of JupyterLab are designed to be extensible,
and they provide public APIs that can be requested in extensions via tokens.
A list of tokens that extension authors can request is documented in :ref:`tokens`.

This is intended to be a guide for some of JupyterLab's most commonly-used extension points.
However, it is not an exhaustive account of how to extend the application components,
and more detailed descriptions of their public APIs may be found in the
`JupyterLab <http://jupyterlab.github.io/jupyterlab/index.html>`__ and
`Lumino <http://jupyterlab.github.io/lumino/index.html>`__ API documentation.

.. contents:: Table of contents
    :local:
    :depth: 1


Commands
~~~~~~~~

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
    const toggled = false;

    app.commands.addCommand(commandID, {
      label: 'My Cool Command',
      isEnabled: true,
      isVisible: true,
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
`here <http://jupyterlab.github.io/lumino/commands/interfaces/commandregistry.icommandoptions.html>`__.

After a command has been added to the application command registry
you can add them to various places in the application user interface,
where they will be rendered using the metadata you provided.

For example, you can add a button the Notebook toolbar to run the command with the ``CommandToolbarButtonComponent``.

Add a Command to the Command Palette
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

In order to add an existing, registered command to the command palette, you need to request the
``ICommandPalette`` token in your extension.
Here is an example showing how to add a command to the command palette (given by ``palette``):

.. code:: typescript

    palette.addItem({
      command: commandID,
      category: 'my-category'
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


Context Menu
~~~~~~~~~~~~

The application context menu is shown when the user right-clicks,
and is populated with menu items that are most relevant to the thing that the user clicked.

The context menu system determines which items to show based on
`CSS selectors <https://developer.mozilla.org/en-US/docs/Learn/CSS/Introduction_to_CSS/Selectors>`__.
It propagates up the DOM tree and tests whether a given HTML element
matches the CSS selector provided by a given command.

Here is an example showing how to add a command to the application context menu:

.. code:: typescript

    app.contextMenu.addItem({
      command: commandID,
      selector: '.jp-Notebook'
    })

In this example, the command indicated by ``commandID`` is shown whenever the user
right-clicks on a DOM element matching ``.jp-Notebook`` (that is to say, a notebook).
The selector can be any valid CSS selector, and may target your own UI elements, or existing ones.
A list of CSS selectors currently used by context menu commands is given in :ref:`css-selectors`.

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

.. _copy_shareable_link:

Copy Shareable Link
~~~~~~~~~~~~~~~~~~~

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
         toArray(tracker.currentWidget.selectedItems()).length === 1,
       iconClass: 'jp-MaterialIcon jp-LinkIcon',
       label: 'Copy Shareable Link'
     });
   }

Note that before enabling this plugin in the usual way, you must *disable* the
default plugin provided by the built-in file browser.

.. code:: bash

   jupyter labextension disable @jupyterlab/filebrowser-extension:share-file


Icons
~~~~~

See :ref:`ui_components`


Keyboard Shortcuts
~~~~~~~~~~~~~~~~~~

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
`here <http://jupyterlab.github.io/lumino/commands/interfaces/commandregistry.ikeybindingoptions.html>`__.

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


Launcher
~~~~~~~~

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

Left/Right Areas
~~~~~~~~~~~~~~~~

The left and right areas of JupyterLab are intended to host more persistent user interface
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


Main Menu
~~~~~~~~~

There are three main ways to extend JupyterLab's main menu.

1. You can add your own menu to the menu bar.
2. You can add new commands to the existing menus.
3. You can register your extension with one of the existing semantic menu items.

In all three cases, you should request the ``IMainMenu`` token for your extension.

Adding a New Menu
^^^^^^^^^^^^^^^^^

To add a new menu to the menu bar, you need to create a new
`Lumino menu <https://jupyterlab.github.io/lumino/widgets/classes/menu.html>`__.

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
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

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
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

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
      tracker,
      action: 'Shutdown',
      name: 'My Activity',
      closeAndCleanup: current => {
        current.close();
        return current.shutdown();
      }
    });

In this example, ``tracker`` is a :ref:`widget-tracker`, which allows the menu
item to determine whether to delegate the menu command to your activity,
``name`` is a name given to your activity in the menu label,
``action`` is a verb given to the cleanup operation in the menu label,
and ``closeAndCleanup`` is the actual function that performs the cleanup operation.
So if the current application activity is held in the ``tracker``,
then the menu item will show ``Shutdown My Activity``, and delegate to the
``closeAndCleanup`` function that was provided.

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
~~~~~~~~~~

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

.. _widget-tracker:

Widget Tracker
~~~~~~~~~~~~~~

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
