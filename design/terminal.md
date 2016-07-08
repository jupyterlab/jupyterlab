# Design of the terminal plugin
This document describes the design of the terminal plugin. Any significant change to the terminal plugin should also involve changes here.

# Personas
### Janet Tobin 
An experienced data scientist with a graduate degree in a technical field and has been coding for more than 5 years in multiple languages. She is 35 years old, has a solid income, and lives in an urban setting. In the past she has used the Jupyter Notebook alongside a text editor (Sublime Text) and the Terminal app on a Mac. She loves to code and feels at home in a terminal.

**Goal:** Replace the usage of Mac's Terminal app, in particular when running Jupyter on a remote system.

Some things they would do in the terminal include
* Run command line git.
* Small amounts of general software engineering to support their data science, such as running test suites, moving files around at the command line.
* Run vim.
* Run command line IPython.


# User tasks
Users should be able to:

* Open a new terminal (command palette, top menu)
* Close a terminal (UI)
* Change the font size (bigger/smaller) (command palette, top menu)
* Close all terminals (command palette, top menu)
* See the name of the terminal in the dock area tab (UI)
* Copy text from the terminal (UI+keyboard)
* Paste text into the terminal (UI+keyboard)
* Reconnect all terminals after a network outage (command palette)
* Toggle between black/white and white/black (command palette, menu)
* Copy and paste commands into the terminal (shortcut, mouse)
* Go to different directories (commands inside terminal)
* Access or use IPython from the terminal (commands inside terminal)

# Visual Design
* Terminal menu should follow design guidelines for all menus.
* Terminal theme can change from black/white to white/black


Team IO: @faricacarroll @spoorthyv @charnpreetsingh185 @katiewhite360
