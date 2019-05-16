# Design of focus navigation using the keyboard

This document describes the design of the focus navigation in JupyterLab. The main navigation method described is through the keyboard only, without mouse control. It is broken down into general guidelines, then goes into more detail with application-level navigation, then finally into plugin specific navigation. It excludes the notebook navigation; there are some design decisions pending about cell reading and editing modes.

The following were used as reference:

- Discussion with Sina Bahram.
- Accessibility: Keyboard Access in Chromium: https://www.chromium.org/user-experience/keyboard-access
- Focus navigation for keyboard and accessibility tools, Microsoft Windows: https://docs.microsoft.com/en-us/windows/uwp/design/input/focus-navigation

# Personas

### Leti James

Leti James has never used the JupyterLab before. She uses a Windows laptop and is familiar with the keyboard navigation in Windows. She wants to quickly learn how to use JupyterLab.

**Goal:** Leti can quickly learn how to use JupyterLab through an intuitive menu bar and area/panel layout, and keyboard navigation.

### Charlie Meyer

Charlie Meyer has used JupyterLab before in a classroom setting. He has a medical condition preventing him from using a mouse and therefore uses only the keyboard to navigate within the application. He uses JupyterLab because of it's an accessible application adhering to the WCAG.

**Goal:** Charlie can navigate JupyterLab with just the keyboard.

# General Guidelines

- Follow the guidelines from Windows, Mac, and Linux desktop platforms to leverage users' existing navigation knowledge.
- Follow the guidelines from WAI/WCAG
  - Ensure that interactive elements are easy to identify
  - Provide clear and consistent navigation options
- Only those UI elements that require user interaction should support focus navigation
- Use F6/Shift+F6 to change focus between areas/panels.
- Use Tab/Shift+Tab, Left/Up/Right/Down arrows to change focus within an area/panel.

# Application Navigation

- The logical order of the areas is as follows: Menu Bar, Sidebar, Sidebar areas (File Browser, List of Kernels and Terminals, Command Palette, etc), Main Work Area (documents and activities).
- Pressing F6 changes the focus to the first item in the next area in the order.
- Pressing Shift+F6 changes the focus to the first item in the previous area in the order.
- Pressing Tab changes the focus to the next item in the same area.
- Pressing Shift-Tab changes the focus to the previous item in the same area.

# Area/Panel Navigation

## Menu Bar

- The focused item is also the selected item.
- Tab moves focus to next top level menu item.
- Shift+Tab moves focus to the previous top level menu item.
- The arrows are already implemented well.

## Left Sidebar

- The focus items in left sidebar area are in following order: File Browser tab, List of Kernels and Terminas tab, Command Palette tab, Notebook Tools tab, and Open Tabs tab.
- Tab and Down arrow cycle forward to the next Sidebar tab.
- Shift-Tab and Up arrow cycle backward to the previous Sidebar tab.
- Left arrow is no-op.
- Right arrow moves focus to the first item in Sidebar area. This is an exception case.

### File Browser

- Focusable items are the File Browser icons, breadcrumbs, column headers, and list items.
- Tab/Shift+Tab should cycle through the focusable items.
- Arrows should cycle through the list items when list is selected.

### List of Running Kernels and Terminals

- TODO

### Command Palette

- The Command Palette items should be selectable, similar to the top level menu.
- The focusable items are the search edit box, search button, and command list.
- Arrows cycle through the command items in list when list is selected.
- Tab/Shift-Tab cycles through focusable items.

### Notebook Tools

- TODO

### Open Tabs List

- The only focusable item is the tab list.
- Up/Down arrows cycle through the items.
- Right/Left arrow cycle between the tab name and delete button.

## Main Work Area

- This is excluded from this design. Special cases revolve around editing modes and cells for notebooks.

# Design questions

- In what cases should the focus wrap around vs stop at the end?
