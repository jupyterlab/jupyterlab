# Design of the help plugin

This document describes the design of the Help plugin. This document illustrates how our research on personas and other solutions translates into the design decisions made to improve the Help plugin.

# Personas
### Jason Shu
Jason Shu is a student majoring in computer programming. He has very basic knowledge of computer science and no knowledge of what Jupyter is.

**Goal:** Learn how to create new notebooks, open a new terminal, and change kernels

# Research of other solutions:
* Improve discoverability of “Help” tab by including it in the main menu
* Include a “Quickstart Guide” for how to use JupyterLab
* Include a “FAQ” page

# User tasks

Users should be able to:

* See a top-level Help menu immediately
* Open the following in the R side panel (menu, command)
    * Things listed in the current notebook help menu
* Open the main About/Tour (Help menu)
* Open a JupyterLab specific FAQ in the R side panel (menu, command)
* See FAQ questions collapsed by default and expand to view answers (mouse)
* Open the About page (menu, command)
* Easily get to the issue page of jupyter/jupyterlab in a new browser tab (menu)
* View the keyboard shortcuts for all commands related to a plugin (command palette)
* Collapse the R side panel to hide all of the help (mouse)

# Visual design
* Help menu should follow design guidelines for all menus.
* Help menu should have different sections for different types of content.
* When a help item is opened, it should appear in the R side panel in an IFRAME.

# Design questions
* Should each help topic open in a single global R side panel help tab (current behavior), or should each open a new help tab that can be closed completely?
