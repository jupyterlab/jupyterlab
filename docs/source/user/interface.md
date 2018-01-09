
# The Interface

The JupyterLab provides the flexible building blocks for interactive,
exploratory computing. While JupyterLab has many features found in traditional
IDEs (Integrated Development Environments), it remains focused on interactive,
exploratory computing.

The JupyterLab Interface consists of a Menu Bar at the top, with a Left Panel
and Dock Panel below. The Left Panel contains the File Browser, the Running
List, the Command Palette, the Cell Tools Inspector and the Tabs List. The main
work area for documents in JupyterLab is called the Dock Panel.

[screenshot]

## Menu Bar

The Menu Bar at the top of JupyterLab has top-level menus that expose all of the
actions available in JupyterLab, along with showing their keyboard shortcuts.
The default menus are:


- File: actions related to files and directories
- Edit: actions related to editing documents and other activities
- View: actions that reversibly alter the appearance of JupyterLab
- Run: actions for running code in different activities such as Notebooks and
  Code Consoles
- Kernel: actions for managing Kernels, which are separately processes which run
  code
- Tabs: a list of the open documents and activities in the Dock Panel
- Settings: common settings and an advanced Settings Editor
- Help: a list of JupyterLab and Kernel related help links

JupyterLab extensions can also create new top-level menus in the Menu Bar.

## Left Panel

The Left Panel contains a number of commonly used panels, such as the File
Browser, Running List, Command Palette and Tabs List:

[screenshot]

The Left Panel can be collapsed or expanded by clicking on the active tab:

[animation]

JupyterLab extensions can add additional panels to the Left Panel.

## Dock Panel

The Dock Panel is the main work area in JupyterLab and allows you to arrange
documents (notebooks, text files, etc.) and other activities (terminals, code
consoles, etc.) into panels and tabs that can be resized or subdivided:

[animation]

The Dock Panel has a single active document or activity that receives keyboard
focus and whose tab is marked with a colored top border (blue by default):

[screenshot]

## Tabs and single-document view

The Tabs List gives you access to the open documents and activities in the Dock
Panel:

[screenshot]

The same information is also available in the Tab Menu:

[screenshot]

It is often useful to focus your work on a single document, while not closing
other documents. Single Document Mode toggles the view of the Dock Panel to show
only a single document at a time:

[animation]

When you leave Single Document Mode, the original layout of the Dock Panel is
restored:

[animation]


## Context Menus

Many parts of JupyterLab, such as notebooks, text files, code consoles, Dock
Panel tabs, etc. have context menus that can be accessed by right-clicking on
the element:

[animation]

The browser’s native context menu can be accessed by holding down `Shift` and
right-clicking:

[animation]
