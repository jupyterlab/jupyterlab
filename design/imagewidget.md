# Design of the imageviewer plugin

This document describes the design of the imageviewer plugin. This document illustrates how our research on personas and other solutions translates into the design decisions made to improve the imageviewer plugin.

# Personas

### Jackie Lair

Jackie Lair is an experienced data scientist who is familiar with JupyterLab and uses it regularly. She uses the imageviewer to compare MRI scans alongside her code and write programs that outputs the information found in the MRI scans.

**Goal:** To be able to manipulate images in JupyterLab to view alongside other tabs and support data analysis.

# Users tasks

Users should be able to:

- Open an image from the file browser (file browser)
- Drag and drop an image file into JupyterLab (mouse)
- Resize an image (command palette, toolbar, context menu)
- Image fits to width in tab
- Reset the size of the image to original (command palette, toolbar, context menu)

# Visual design

- Imagewidget menu should follow design guidelines for all menus.
