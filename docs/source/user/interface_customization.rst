.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

.. _interface-customization:

Interface Customization
=======================

Multiple elements in the JupyterLab interface are customizable to display
new elements or hide default ones.

.. _layout-customization:

Layout
------

The JupyterLab layout has two modes: the simple mode (or *single document* mode) and the default
mode (or *multiple documents* mode). In both modes, the widgets are attached in one of the four
area: the ``left`` or ``right`` sidebars, the ``main`` dock panel area or the ``down`` area.

The default positions of widgets can be overridden through the settings based on the
type of widgets. The setting to modify is the *layout* one in section *JupyterLab Shell*.

The available widget types and their default area is listed below

==================  ========  ======
Type                multiple  single
==================  ========  ======
Console             main      main
CSVTable            main      main
TSVTable            main      main
Editor              main      main
HTML Viewer         main      main
Image               main      main
Image (Text)        main      main
JSON                main      main
Markdown Preview    main      main
Notebook            main      main
Cloned Output       main      down
Linked Console      main      down
Inspector           main      down
PDF                 main      main
Terminal            main      main
VDOM                main      main
Vega-Lite4          main      main
Vega5               main      main
Settings            main      main
Advanced Settings   main      main
Licenses            main      main
Debugger            right     right
Debugger Variables  main      main
Debugger Sources    main      main
Property Inspector  right     right
Extension Manager   left      left
File Browser        left      left
Sessions and Tabs   left      left
Table of Contents   left      left
Log Console         down      down
==================  ========  ======

.. code-block:: js

    "layout": {
      "single": {
        "Linked Console": { "area": "down" },
        "Inspector": { "area": "down" },
        "Cloned Output": { "area": "down" },
        // Add new terminals in the down area in simple mode
        "Terminal": { "area": "down" }
      },
      "multiple": {
        // Add new terminals in the right sidebar in default mode
        "Terminal": { "area": "right" }
      }
    }

The above example will result in the following changes:

.. figure:: ../images/default-terminal-position-single.png
    :alt: Default terminal position in simple mode

    Default terminal position in simple mode

.. figure:: ../images/customized-terminal-position-single.png
    :alt: Customized terminal position in simple mode

    Customized terminal position in simple mode

.. _toolbars-customization:

Toolbars
--------

Lots of toolbars are customizable. Here is a mapping of the customizable toolbars
and the associated setting.

- Cell: *Cell Toolbar* -> *toolbar*
- CSV Viewer: *CSV Viewer* -> *toolbar*
- File Browser: *File Browser Widget* -> *toolbar*
- HTML Viewer: *HTML Viewer* -> *toolbar*
- Notebook panel: *Notebook Panel* -> *toolbar*
- Text Editor: *Text Editor* -> *toolbar*
- TSV Viewer: *TSV Viewer* -> *toolbar*

Those settings are accessible through the interactive *Settings Editor*. But you
may find more comfortable to use the *Advanced Settings Editor* (accessible by clicking
on *JSON Settings Editor* button in the top right corner of the *Settings Editor*).

Your ``toolbar`` customization will be merged with the default menu bar definition (this
is a different behavior as the other settings that are overriding the default settings).
So to remove a default item, you will need to disable it. To do that, you will need
to set the toolbar item ``disabled`` attribute to ``true``; an item is uniquely identified
by its ``name`` attribute.

.. code-block:: js

    "toolbar": [
      // Disable the restart and run all button
      {
        "name": "restart-and-run",
        "disabled": true
      },
      // Add a new button to clear all cell outputs
      {
        "name": "clear-all-outputs",
        "command": "notebook:clear-all-cell-outputs"
      }
    ]

The above example for the notebook panel, will results in the following changes:

.. figure:: ../images/default-notebook-toolbar.png
    :alt: Default notebook toolbar

    Default notebook toolbar

.. figure:: ../images/customized-notebook-toolbar.png
    :alt: Customized notebook toolbar

    Customized notebook toolbar

A toolbar is defined by a list of items. Each item must have an unique ``name``. That
name will create a toolbar item if it is associated with a special widget (e.g. the
cell type toolbar selector). Otherwise it will require a ``command`` that will be triggered
when clicking on a toolbar button (see the available :ref:`Commands list<commands-list>`).
The items are sorted by their ``rank``.

.. note::

    If you want to more advanced customization please refer to the :ref:`Toolbar item definition<toolbar-item>`.

.. _menu-bar-customization:

Menu Bar
--------

The top menu bar definition can be customized through the *Advanced Settings Editor*. You can
access it by opening the *Settings Editor* from the *Settings* menu, then click on the
*JSON Settings Editor* in the top right corner.

In the *Advanced Settings Editor*, you will need to select the *Main Menu* section in
the left panel. Your ``menus`` customization will be merged with the default menu bar definition (this
is a different behavior as the other settings that are overriding the default settings).
So to remove a default entry, you will need to disable it. To do that, you will need
to set the menu entry ``disabled`` attribute to ``true``; an entry is uniquely identified
by its ``command`` and ``args`` attributes.

New entries can be added to existing menus or you can create new menus.

.. code-block:: js

    "menus": [
      {
        // Disable the Run menu
        "id": "jp-mainmenu-run",
        "disabled": true
      },
      {
        // Move the Tabs menu to the end by changing its rank
        "id": "jp-mainmenu-tabs",
        "rank": 1100,
        "items": [
            // Add a new entry in the Tabs menu
            {
                "command": "launcher:create",
                "rank": 0
            }
        ]
      },
      {
        // Disable the Open from Path entry in the File menu
        "id": "jp-mainmenu-file",
        "items": [
          {
            "command": "filebrowser:open-path",
            "disabled": true
          }
        ]
      }
    ]

The above example, will results in the following changes:

.. figure:: ../images/default-menu-bar.png
    :alt: Default menu bar

    Default menu bar

.. figure:: ../images/customized-menu-bar.png
    :alt: Customized menu bar

    Customized menu bar

The menu are identified by the following ids:

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

An entry can be any valid command available; see :ref:`Commands list<commands-list>`.
And the entries are sorted by their ranks.

.. note::

    If you want to more advanced customization (e.g. changing the separators or sub-menus),
    please refer to the :ref:`Main Menu settings definition <mainmenu>`.

.. _context-menu-customization:

Context Menu
------------

The context menu definition can be customized through the *Advanced Settings Editor*. You can
access it by opening the *Settings Editor* from the *Settings* menu, then click on the
*JSON Settings Editor* in the top right corner.

In the *Advanced Settings Editor*, you will need to the select the *Application Context Menu* section in
the left panel. Your ``contextMenu`` customization will be merged with the default context menu definition (this
is a different behavior as the other settings that are overriding the default settings).
So to remove a default entry, you will need to disable it. To do that, you will need
to set the menu entry ``disabled`` attribute to ``true``; an entry is uniquely identified
by its ``command``, ``selector`` and ``args`` attributes.

New entries can be added to existing menus.

.. code-block:: js

    "contextMenu": [
      // Disable New notebook entry
      {
        "command": "notebook:create-new",
        "selector": ".jp-DirListing-content",
        "args": {
          "isContextMenu": true
        },
        "disabled": true
      },
      // Add new entry on notebook file to export them as Markdown
      {
        "command": "notebook:export-to-format",
        "selector": ".jp-DirListing-item[data-file-type=\"notebook\"]",
        "rank": 3,
        // Command arguments
        "args": {
          "format": "markdown",
          "label": "Export as Markdown"
        }
      }
    ]

The above example, will results in the following changes:

.. figure:: ../images/default-context-menu.png
    :alt: Default context menu

    Default context menu

.. figure:: ../images/customized-context-menu.png
    :alt: Customized context menu

    Customized context menu

An entry can be any valid command available; see :ref:`Commands list<commands-list>`.
And a CSS selector to define which elements will have that context menu entry.
And the entries are sorted by their ranks.

.. note::

    If you want to more advanced customization (e.g. changing the separators or sub-menus),
    please refer to the :ref:`Context Menu settings definition <context_menu>`.

File Browser
^^^^^^^^^^^^

Users can add a "Open in Simple Mode" context menu option by adding the following to *Settings* -> *Application Context Menu* -> ``contextMenu``

.. code:: json

    {
        "command": "filebrowser:open-browser-tab",
        "args": { "mode": "single-document" },
        "selector": ".jp-DirListing-item[data-isdir=\"false\"]",
        "rank": 1.6
    }
