# Design of the Terminal Plugin

This document describes the design of the terminal plugin. This document illustrates how our research on personas and other
solutions translates into the design decisions made to improve the Terminal plugin.

## Personas

### Experienced Data Scientist

* Has a graduate degree in a technical field
* Has been coding for over 5 years in multiple languages
* Have used Jupyter Notebook alongside a text editor

**Goal:** Replace the usage of Mac's Terminal app, in particular when running Jupyter on a remote system

Some things they would do in the terminal include:
* Run command line git
* Run vim
* Run command line IPython

### Student learning the terminal in Software Carpentry

The student is a Junior statistics majorw ho is attending a cnoference which is hosting a software carpentry workshop. He has used
limited MATLAB and R in his statistics classes, and has been introduced to Jupyter Notebooks. He hasn't ever used JupyterLab,
but would like to use it to set up some data visualizations for his senior project.

**Goal:** To use the JupyterLab to showcase his statistical findings with his project team and professor.

## User Tasks

**Users should be able to:**

* Open a new terminal
* Close a terminal
* Close all terminals
* See name of terminal in the dock area tab
* Reconnect all terminals after a network outage
* Increase font size of terminal
* Decrease font size of terminal
* Toggle theme of terminal

## Other Solutions

* Should place "New Terminal" below "File Operations" because placing it on the bottom makes it difficult to find
* Add buttons that close all terminals, reconnect all terminals after a network outage, increase font size, decrease font size,
and toggle between black/white and white/black under "Terminal" heading

##What user should be able to see or do

* Find terminal commands easier because it being at the very bottom right now is hard to find
* More options to adjust the terminal visually

## Visual Design

### Layout

* Place "Terminal" commands under "File Operations" (Replacing the "Help" Section)
* Add buttons in listed order: "Close All Terminals", "Reconnect All Terminals", "Increase Font Size", "Decrease Font Size",
"Toggle Theme"

### Typography

Typeface will stay consistent with current typeface on command palette (Helvetica Neue sans-serif)

### Colors

Colors will stay consistent with current colors on command palette
