.. _developer-extension-points:

Common Extension Points
-----------------------

Most of the component parts of JupyterLab are designed to be extensible,
and they provide public APIs via that can be requested in extensions via tokens.
A list of tokens that extension authors can request is documented in :ref:`tokens`.

This is not an exhaustive list of extension points for the application components,
it is instead intended to be a guide for some of the most common extension points.


Commands
~~~~~~~~

Perhaps the most common way to add functionality to JupyterLab is via commands.
These are lightweight objects that include a function to execute combined with
additional such as how they are labeled and when they are enabled.
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
        console.log(`Activated ${commandID}`);
        toggled = !toggled;
    });

This example adds a new command, which, when triggered, calls the ``execute`` function.
``isEnabled`` indicates whether the command is enabled, and is determined whether
renderings of it are greyed out.
``isToggled`` indicates whether to render a checkmark next to the command.
``isVisible`` indicates whether to render the command at all.
``iconClass`` specifies a CSS class which can be used to display an icon next to renderings of the command.

Each of ``isEnabled``, ``isToggled``, and ``isVisible`` can be either
a boolean value or a function that returns a boolean value, in case you want
to do some logic in order to determine those conditions.

Likewise, each of ``label`` and ``iconClass`` can be either 
a string value or a function that returns a string value.

There are several more options which can be passed into the command registry when
adding new commands. These are documented 
`here <http://phosphorjs.github.io/phosphor/api/commands/interfaces/commandregistry.icommandoptions.html>`__.

Once a command has been added to the application, it can then be added
to various places in the application user interface.

Command Palette
~~~~~~~~~~~~~~~

In order to add a command to the command palette, you need to request the
``ICommandPalette`` token in your extension.
Here is an example showing how to add a command to the command palette (given by ``palette``):

.. code:: typescript

    palette.addItem({
      command: commandID,
      category: 'my-category'
      args: {}
    });

The command ID is the same ID as you used when registering the command.
You must also provide a ``category``, which determines the subcategory of
the command palette in which to render the command.
It can be a preexisting category (e.g., ``'notebook'``), or a new one of your own choosing.

The ``args`` are a JSON object that will be passed into your command's functions at render/execute time.
You can use these to customize the behavior of your command depending on how it is invoked.
For instance, you can pass in ``args: { isPalette: true }``.
Your command ``label`` function can then check the ``args`` it is provided for ``isPalette``,
and return a different label in that case.
This can be useful to make a single command flexible enough to work in multiple contexts.

Main Menu
~~~~~~~~~

There are three main ways to extend JupyterLab's main menu.

1. You can add your own menu to the menu bar.
2. You can add new commands to the existing menus.
3. You can register your extension with one of the existing menu metacommands.

Adding a New Menu
^^^^^^^^^^^^^^^^^

Adding a New Command to an Existing Menu
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Registering a Metacommand Handler
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^



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
`here <http://phosphorjs.github.io/phosphor/api/commands/interfaces/commandregistry.ikeybindingoptions.html>`__.

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

Shortuts added to the settings system will be editable by users.


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

Status Bar
~~~~~~~~~~

Widget Trackers
~~~~~~~~~~~~~~~

``RenderMimeRegistry`` and Documents
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


