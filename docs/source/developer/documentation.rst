Writing Documentation
---------------------

This section provide information about writing documentation for
JupyterLab.

Writing Style
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

User Interface Naming Conventions
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Documents, Files, and Activities
''''''''''''''''''''''''''''''''

Files are referrred to as either files or documents, depending on the context.

Documents are more human centered.
If human viewing, interpretation, interaction is an important part of the experience, it is a document in that context.
For example, notebooks and markdown files will often be referring to as documents unless referring to the file-ness aspect of it (e.g., the notebook filename).

Files are used in a less human-focused context.
For example, we refer to files in relation to a file system or file name.

Activities can be either a document or another UI panel that is not file backed, such as terminals, consoles or the inspector.
An open document or file is an activity in that it is represented by a panel that you can interact with.


Element Names
'''''''''''''

- The generic content area of a tabbed UI is a panel, but prefer to refer to the more specific name, such as “File browser.” Tab bars have tabs which toggle panels.
- The menu bar contains menu items, which have their own submenus.
- The main work area can be referred to as work area when the name is unambiguous.
- When describing elements in the UI, colloquial names are preferred (e.g., “File browser” instead of “Files panel”).

The majority of names are written in lower case.  These names include:

- tab
- panel
- menu bar
- sidebar
- file
- document
- activity
- tab bar
- main work area
- file browser
- command palette
- cell inspector


The following sections of the user interface should be in title case, directly quoting a word in the UI:

- File menu
- Files tab
- Running panel
- Tabs panel

The capitalized words match the label of the UI element the user is clicking on
because there does not exist a good colloquial name for the tool,
such as “file browser” or “command palette”.

See :ref:`interface` for descriptions of elements in the UI.

Keyboard Shortcuts
~~~~~~~~~~~~~~~~~~

Typeset keyboard shortcuts as follows:

-  Monospace typeface, with no spaces between individual keys:
   ``Shift Enter``.
-  For modifiers, use the platform independent word describing key:
   ``Shift``.
-  For the ``Accel`` key use the phrase: ``Command/Ctrl``.
-  Don’t use platform specific icons for modifier keys, as they are
   difficult to display in a platform specific way on Sphinx/RTD.

Screenshots and Animations
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
