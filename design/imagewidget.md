# Design of the Imagewidget

This document describes the design of the imagewidget. This document illustrates how our research on personas and other
solutions translates into the design decisions made to improve the Imagewidget plugin.

## Personas

### Experienced Data Scientist

The Experienced Data Scientist is familiar with JupyterLab and uses it regularly. He uses the imagewidget to compare MRI scans and write
programs that utilizes the information revealed in the MRI scans.

**Goal:** To be able to manipulate images in JupyterLab to go alongside and support data analysis.

Some things they would do with the imagewidget include:

* Pull images from the file browser and make it larger/smaller
* Images should be centered

### College Student CS Major

Leon is a sophomore cs major student who uses jupyter notebooks to share projects with his peers. He knows that JupyterLab
allows rendering of his images from his files, but is unfamiliar with the imagewidget.

**Goal:** Use the jupyterlab to showcase images alongside code

Some things they would do with the imagewidget include:
* Render images from the file browser
* Manipulate the image in standard ways

## User tasks

**Users should be able to:**

* Resize
* See the entire image

## Other Solutions

Lots of softwares use slightly different ways to resize images. When you insert an image into Illustrator, you can either double click
on the artboard and the image will be inserted at its normal file size, or you can click and drag a square for the image size.

In google slides, you click to insert an image and the image is placed in its actual size onto the slide. A surrounding highlight
around the image indicates that you can resize the image. The mouse changes form as well to indicate to the user that it can be moved
and resized.

Adobe PDF uses simple plus and minus buttons in the bottom right corner to resize the image.

These various ways provide an easy and intuitive interface to manipulate images. However, from our personas research we realized that
users only seem to need to be able to resize the image and have it placed in the center of the window so it's fully visible. Therefore, functions like
cropping or rotating the image may not be necessary. We considered having a top toolbar specifically for the imagewidget, but that would take too much space for only
adding two new buttons. We rationalized that using floating buttons like Adobe PDF could take away from the clean view of looking at the 
image. 

We decided to simply add buttons that could increase and decrease the size of the image in the command palette. We realized that
in most applications users quickly learn a keyboard shortcut to zoom in and out. By having the increase and decrease size shortcuts listed
in the command palette or included in the top menu bar (soon to be made), the user will quickly learn the shortcut and use that for future times, rather than looking for it in the
command palette every time.


## Visual Design

### Layout

* Image starts out centered when opened
* Place "Image Operations" commands under "Notebook Operations"
* Have commands "Zoom in" and "Zoom out" under "Image Operations" in command palette
* Once top menu bar has been created, include "Zoom In" and "Zoom Out"

### Typography

Typeface will stay consistent with the current typeface on command palette (Helvetica Neue sans-serif 13px)

### Colors

Colors will stay consistent with current colors on command palette
