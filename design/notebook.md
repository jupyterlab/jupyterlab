# Design of the notebook plugin
This document describes the design of the notebook plugin. This document illustrates how our research on personas and other solutions translates into the design decisions made to improve the notebook plugin.

# Personas
### Jane Gomez
Jane Gomez has never used the Jupyter Notebook before. She has some basic understanding of python, but only knows how to write simple functions. She’s using the notebook for the first time in JupyterLab and wants to quickly learn how to use it.

**Goal:** Jane can quickly learn how to use the notebook through an intuitive menu bar and/or a tour.

### Shane Alborou
Shane Alborou has used Jupyter Notebook in a classroom setting in the past. He wants to use the multiscreen JupyterLab to write his code and submit it to his professor. 

**Goal:** The student can use all of the same functions that the Jupyter notebook has to turn in his code to his professor.

# User tasks
Users should be able to:

* See the name of the notebook on the top menu bar
* Change the name of the notebook (file browser menu, top menu)
* Get a user interface tour (top menu)
* Use notebook cell operations
   * Clear output(s) (command palette)
   * Convert to code (command palette, shortcut, toolbar)
   * Convert to markdown (command palette, shortcut, toolbar)
   * Convert to raw (command palette, shortcut, toolbar)
   * Copy Cells(s) (command palette, shortcut, toolbar)
   * Cut Cells(s) (command palette, shortcut, toolbar)
   * Delete Cell(s) (command palette, shortcut, toolbar)
   * Extend selection above (command palette, shortcut)
   * Extend selection below (command palette, shortcut)
   * Insert Cell Above (command palette, shortcut)
   * Insert Cell Below (command palette, shortcut)
   * Merge Selected Cell(s) (command palette, shortcut)
   * Paste Cell(s) (command palette, shortcut, toolbar)
   * Redo Cell Operation (command palette, shortcut)
   * Run Cell(s) (command palette, shortcut)
   * Run Cell(s) and Advance (command palette, toolbar, shortcut)
   * Run Cell(s) and Insert (command palette, shortcut)
   * Select Cell Above (command palette, shortcut)
   * Select Cell Below (command palette, shortcut)
   *  Split Cell (command palette, shortcut)
   * Toggle Line Numbers (command palette, shortcut)
   * Undo Cell Operation (command palette, shortcut)
   * Redo Cell Operation (command palette)
   * Select multiple cells at once (mouse, shortcut)
   * Move cell(s) up and down (mouse)
* Use notebook operations
   * Clear All Outputs (command palette)
   * Interrupt Kernel (command palette, shortcut, toolbar)
   * Restart Kernel & Clear Outputs (command palette)
   * Restart Kernel & Run All (command palette)
   * Run All Cells (command palette)
   * Switch Kernel (command palette, toolbar)
   * To Command Mode (command palette, shortcut, mouse)
   * To Edit Mode (command palette, shortcut, mouse)
   * Toggle All Line Numbers (command palette)
* See when the code is running in top right corner circle (toolbar)
* See when the file has most recently been saved (toolbar)
* See a reaction when an icon has been click (toolbar)
* Include a top menu above the toolbar 
* Make a Copy (top menu)
* Print Preview (top menu)
* Download file as (top menu)
* Find and Replace (top menu)
* Be able to open a keyboard shortcut specific for the notebook (command palette)

# Visual design
* Add sections to the icon tools
* Replace icons with google’s material icons
* Make the top right kernel label a dropdown
* Include an indicator that the file is being saved on the toolbar
* Additional commands will follow the style guidelines of the current command palette
* When the mouse hovers versus clicks on an icon, there are separate indicators (colors) for each

# Design questions
* Should there be a keyboard shortcut specific for the notebook, continue using the command palette as the lists of shortcuts, or redesign the command palette functionality? 
