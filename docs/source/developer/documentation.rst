Writing documentation
---------------------

This section provide information about writing documentation for
JupyterLab.

Writing style
~~~~~~~~~~~~~

-  The documentation should be written in the second person, referring
   to the reader as "you" and not using the first person plural "we."
   The author of the documentation is not sitting next to the user, so
   using "we" can lead to frustration when things don't work as
   expected.
-  Avoid words that trivialize using JupyterLab such as "simply" or
   "just." Tasks that developers find simple or easy may not be for
   users.
-  Write in the active tense, so "drag the notebook cells..." rather
   than "notebook cells can be dragged..."
-  The beginning of each section should begin with a short (1-2
   sentence) high-level description of the topic, feature or component.

Proper nouns
~~~~~~~~~~~~

The main parts of JupyterLab should be treated as proper nouns and
capitalized:

-  Main Menu
-  Left Panel
-  Dock Panel
-  File Browser
-  Command Palette
-  Running List
-  Tabs List
-  Notebook
-  Code Console
-  Terminal

Keyboard shortcuts
~~~~~~~~~~~~~~~~~~

Typeset keyboard shortcuts as follows:

-  Monospace typeface, with no spaces between individual keys:
   ``Shift Enter``.
-  For modifiers, use the platform independent word describing key:
   ``Shift``.
-  For the ``Accel`` key use the phrase: ``Command/Ctrl``.
-  Don’t use platform specific icons for modifier keys, as they are
   difficult to display in a platform specific way on Sphinx/RTD.

Screenshots and animations
~~~~~~~~~~~~~~~~~~~~~~~~~~

Our documentation should contain screenshots and animations that
illustrate and demonstrate the software. Here are some guidelines for
preparing them:

-  Take screenshots and animations at the standard browser font sizes,
   100% browser zoom.

-  It is often helpful to have a colored background to highlight the
   content of an animation or screenshot. If a colored background is
   needed, use Material Design Grey 500 (``#9e9e9e``).

-  Screenshots and animations should be styled in the documentation with
   a ``max-width: 100%`` property. Never stretch them wider than the
   original.

-  Screenshots and animations taken on high resolution screens (retina)
   may need to be saved at half resolution to be consistent.

-  Screenshots or animations should be proceeded by a sentence
   describing the content, such as "To open a file, double-click on its
   name in the File Browser:".

-  Ideally each screenshot or animation should have a drop shadow, but
   it is unclear if we should do that beforehand or in CSS (the xkcd
   extension tutorial has images with shadowns already - let's think
   through this.)

   To help us organize them, let's name the files like this:

   ::

       sourcefile.md
       sourcefile_filebrowser.png
       sourcefile_editmenu.png

   This will help us track the images next to the content they are used
   in.
