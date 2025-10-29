% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

(interface-customization)=

# Interface Customization

Multiple elements in the JupyterLab interface are customizable to display
new elements or hide default ones.

(layout-customization)=

## Layout

The JupyterLab layout has two modes: the simple mode (or _single document_ mode) and the default
mode (or _multiple documents_ mode). In both modes, the widgets are attached in one of the four
area: the `left` or `right` sidebars, the `main` dock panel area or the `down` area.

The default positions of widgets can be overridden through the settings based on the
type of widgets. The setting to modify is the _layout_ one in section _JupyterLab Shell_.

The available widget types and their default area is listed below

| Type               | multiple | single |
| ------------------ | -------- | ------ |
| Console            | main     | main   |
| CSVTable           | main     | main   |
| TSVTable           | main     | main   |
| Editor             | main     | main   |
| HTML Viewer        | main     | main   |
| Image              | main     | main   |
| Image (Text)       | main     | main   |
| JSON               | main     | main   |
| Markdown Preview   | main     | main   |
| Notebook           | main     | main   |
| Cloned Output      | main     | down   |
| Linked Console     | main     | down   |
| Inspector          | main     | down   |
| PDF                | main     | main   |
| Terminal           | main     | main   |
| VDOM               | main     | main   |
| Vega-Lite4         | main     | main   |
| Vega5              | main     | main   |
| Settings           | main     | main   |
| Advanced Settings  | main     | main   |
| Licenses           | main     | main   |
| Debugger           | right    | right  |
| Debugger Variables | main     | main   |
| Debugger Sources   | main     | main   |
| Property Inspector | right    | right  |
| Extension Manager  | left     | left   |
| File Browser       | left     | left   |
| Sessions and Tabs  | left     | left   |
| Table of Contents  | left     | left   |
| Log Console        | down     | down   |

```js
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
```

The above example will result in the following changes:

:::{figure} ../images/default-terminal-position-single.png
:alt: (Before Change) Default terminal position in "multiple" (default) mode

(Before Change) Default terminal position in "multiple" (default) mode
:::

:::{figure} ../images/customized-terminal-position-single.png
:alt: (After Change) Customized terminal position in "multiple" (default) mode

(After Change) Customized terminal position in "multiple" (default) mode
:::

(toolbars-customization)=

## Toolbars

Lots of toolbars are customizable. Here is a mapping of the customizable toolbars
and the associated setting.

- Cell: _Cell Toolbar_ -> _toolbar_
- CSV Viewer: _CSV Viewer_ -> _toolbar_
- File Browser: _File Browser Widget_ -> _toolbar_
- HTML Viewer: _HTML Viewer_ -> _toolbar_
- Notebook panel: _Notebook Panel_ -> _toolbar_
- Text Editor: _Text Editor_ -> _toolbar_
- TSV Viewer: _TSV Viewer_ -> _toolbar_

Those settings are accessible through the interactive _Settings Editor_. But you
may find more comfortable to use the _Advanced Settings Editor_ (accessible by clicking
on _JSON Settings Editor_ button in the top right corner of the _Settings Editor_).

Your `toolbar` customization will be merged with the default menu bar definition (this
is a different behavior as the other settings that are overriding the default settings).
So to remove a default item, you will need to disable it. To do that, you will need
to set the toolbar item `disabled` attribute to `true`; an item is uniquely identified
by its `name` attribute.

```js
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
```

The above example for the notebook panel, will results in the following changes:

:::{figure} ../images/default-notebook-toolbar.png
:alt: Default notebook toolbar

Default notebook toolbar
:::

:::{figure} ../images/customized-notebook-toolbar.png
:alt: Customized notebook toolbar

Customized notebook toolbar
:::

A toolbar is defined by a list of items. Each item must have an unique `name`. That
name will create a toolbar item if it is associated with a special widget (e.g. the
cell type toolbar selector). Otherwise it will require a `command` that will be triggered
when clicking on a toolbar button (see the available {ref}`Commands list<commands-list>`).
The items are sorted by their `rank`.

:::{note}
If you want to more advanced customization please refer to the {ref}`Toolbar item definition<toolbar-item>`.
:::

(menu-bar-customization)=

## Menu Bar

The top menu bar definition can be customized through the _Advanced Settings Editor_. You can
access it by opening the _Settings Editor_ from the _Settings_ menu, then click on the
_JSON Settings Editor_ in the top right corner.

In the _Advanced Settings Editor_, you will need to select the _Main Menu_ section in
the left panel. Your `menus` customization will be merged with the default menu bar definition (this
is a different behavior as the other settings that are overriding the default settings).
So to remove a default entry, you will need to disable it. To do that, you will need
to set the menu entry `disabled` attribute to `true`; an entry is uniquely identified
by its `command` and `args` attributes.

New entries can be added to existing menus or you can create new menus.

```js
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
```

The above example, will results in the following changes:

:::{figure} ../images/default-menu-bar.png
:alt: Default menu bar

Default menu bar
:::

:::{figure} ../images/customized-menu-bar.png
:alt: Customized menu bar

Customized menu bar
:::

The menu are identified by the following ids:

- File menu: `jp-mainmenu-file`

  - New file submenu: `jp-mainmenu-file-new`

- Edit menu: `jp-mainmenu-edit`

- View menu: `jp-mainmenu-view`

  - Appearance submenu: `jp-mainmenu-view-appearance`

- Run menu: `jp-mainmenu-run`

- Kernel menu: `jp-mainmenu-kernel`

- Tabs menu: `jp-mainmenu-tabs`

- Settings menu: `jp-mainmenu-settings`

- Help menu: `jp-mainmenu-help`

An entry can be any valid command available; see {ref}`Commands list<commands-list>`.
And the entries are sorted by their ranks.

:::{note}
If you want to more advanced customization (e.g. changing the separators or sub-menus),
please refer to the {ref}`Main Menu settings definition <mainmenu>`.
:::

(context-menu-customization)=

## Context Menu

The context menu definition can be customized through the _Advanced Settings Editor_. You can
access it by opening the _Settings Editor_ from the _Settings_ menu, then click on the
_JSON Settings Editor_ in the top right corner.

In the _Advanced Settings Editor_, you will need to the select the _Application Context Menu_ section in
the left panel. Your `contextMenu` customization will be merged with the default context menu definition (this
is a different behavior as the other settings that are overriding the default settings).
So to remove a default entry, you will need to disable it. To do that, you will need
to set the menu entry `disabled` attribute to `true`; an entry is uniquely identified
by its `command`, `selector` and `args` attributes.

New entries can be added to existing menus.

```js
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
```

The above example, will results in the following changes:

:::{figure} ../images/default-context-menu.png
:alt: Default context menu

Default context menu
:::

:::{figure} ../images/customized-context-menu.png
:alt: Customized context menu

Customized context menu
:::

An entry can be any valid command available; see {ref}`Commands list<commands-list>`.
And a CSS selector to define which elements will have that context menu entry.
And the entries are sorted by their ranks.

:::{note}
If you want to more advanced customization (e.g. changing the separators or sub-menus),
please refer to the {ref}`Context Menu settings definition <context-menu>`.
:::

### File Browser

Users can add a "Open in Simple Mode" context menu option by adding the following to _Settings_ -> _Application Context Menu_ -> `contextMenu`

```json
{
  "command": "filebrowser:open-browser-tab",
  "args": { "mode": "single-document" },
  "selector": ".jp-DirListing-item[data-isdir=\"false\"]",
  "rank": 1.6
}
```

(custom-css)=

```{include} custom_css.md

```

(settings-editor-filtering)=

# Settings Editor Plugin Filtering

The Settings Editor supports configurable filtering of plugins to hide specific plugins from the settings interface. This allows administrators and power users to hide complex or sensitive plugins while keeping them fully functional.
The hidden plugins will remain accessible in the JSON Settings Editor.

## Configuration Options

### Via Settings UI

1. Open JupyterLab Settings Editor (_Settings > Settings Editor_)
2. Search for "Settings Editor Form UI"
3. Find the "Additional plugins to skip in settings editor" field
4. Add plugin IDs in the format `package:plugin`
5. Save the settings

### Via overrides.json

Add the following to your `overrides.json` file:

```json
{
  "@jupyterlab/settingeditor-extension:form-ui": {
    "toSkip": ["my-extension:plugin-to-hide", "another-extension:config-plugin"]
  }
}
```

## Always Hidden Plugins

The following plugins are hidden by default from the settings editor:

- `@jupyterlab/application-extension:context-menu`
- `@jupyterlab/mainmenu-extension:plugin`

## Plugin ID Format

Plugin IDs usually follow the format: `package-name:plugin-name`

For a complete list of core plugin IDs, see the {ref}`Core Plugins <core-tokens>` documentation.

## Alternatives

If you need to completely disable plugin functionality, consider:

- Disabling extensions entirely via the Extension Manager
- Using `page_config.json` to disable specific plugins
- Using the command line: `jupyter labextension disable package-name:plugin-name`
