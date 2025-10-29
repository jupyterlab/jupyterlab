% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

(commands)=

# Commands

Commands are the entry points for triggering actions for the user interface. They are
linked to menu entries, keyboard shortcuts, the launcher and the command palette.

A command has an unique id that is used for referencing it or executing it. It could
also require input arguments. Those arguments are maybe different in the command palette
and the keyboard shortcuts for example. That can explain varying behavior depending on the
source of a command trigger.

# Commands in Markdown Files

JupyterLab supports using commands in Markdown files with the following syntax:

```markdown
`<button data-commandLinker-command="help:about" href="#">TEST</button>`
```

The value of `data-commandLinker-command` must be a valid command identifier (see list below).

This allows you to embed buttons or other elements with custom commands in your Markdown documents.

## Command Palette

All user actions in JupyterLab are processed through a centralized command
system. These commands are shared and used throughout JupyterLab (menu bar,
context menus, keyboard shortcuts, etc.). The command palette provides a
keyboard-driven way to search for and run JupyterLab commands:

```{image} ../images/command-palette.png
:align: center
:class: jp-screenshot
```

(access-palette)=

The command palette can be accessed from the View menu or using the keyboard shortcut
`Command/Ctrl Shift C`.

The command palette can be displayed in the sidebar by adding `'modal': false` to the Settings.

(commands-list)=

## Commands List

The table below display the list of commands and the associated keyboard shortcuts. The
unique identifier is useful if you want to customize the menus, the toolbars or the keyboard shortcuts.

:::{note}
On Mac OS, the `Ctrl` key should be replaced by `Cmd`.
:::

```{eval-rst}
.. include:: commands_list.md
   :parser: myst_parser.sphinx_
```
