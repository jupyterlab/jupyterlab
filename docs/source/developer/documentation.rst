Writing Documentation
---------------------

This section provides information about writing documentation for JupyterLab.
See  our  `Contributor
Guide <https://github.com/jupyterlab/jupyterlab/blob/master/CONTRIBUTING.md>`_ for
details on installation and testing.

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
-  Use "enable" rather than "allow" to indicate what JupyterLab makes
   possible for users. Using "allow" connotes that we are giving them
   permission, whereas "enable" connotes empowerment.

User Interface Naming Conventions
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Documents, Files, and Activities
''''''''''''''''''''''''''''''''

Files are referrred to as either files or documents, depending on the context.

Documents are more human centered. If human viewing, interpretation, interaction
is an important part of the experience, it is a document in that context. For
example, notebooks and markdown files will often be referring to as documents
unless referring to the file-ness aspect of it (e.g., the notebook filename).

Files are used in a less human-focused context. For example, we refer to files
in relation to a file system or file name.

Activities can be either a document or another UI panel that is not file backed,
such as terminals, consoles or the inspector. An open document or file is an
activity in that it is represented by a panel that you can interact with.


Element Names
'''''''''''''

- The generic content area of a tabbed UI is a panel, but prefer to refer to the
  more specific name, such as “File browser.” Tab bars have tabs which toggle
  panels.
- The menu bar contains menu items, which have their own submenus.
- The main work area can be referred to as the work area when the name is unambiguous.
- When describing elements in the UI, colloquial names are preferred
  (e.g., “File browser” instead of “Files panel”).
  
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
- code console

The following sections of the user interface should be in title case, directly
quoting a word in the UI:

- File menu
- Files tab
- Running panel
- Tabs panel
- Single-Document Mode

The capitalized words match the label of the UI element the user is clicking on
because there does not exist a good colloquial name for the tool, such as “file
browser” or “command palette”.

See :ref:`interface` for descriptions of elements in the UI.

Keyboard Shortcuts
~~~~~~~~~~~~~~~~~~

Typeset keyboard shortcuts as follows:

-  Monospace typeface, with spaces between individual keys:
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

-  Set screen resolution to non-hidpi (non-retina)

-  Set browser viewport to 1280x720 px.
   The Firefox Web Developer extension and Chrome Developer Tools offer
   device specific rendering that enables you to set this viewport resolution.

-  Capture the viewport, **not the full browser window**,
   using the capture software of your choice. **Do not include any of the
   desktop background**.

-  For PNGs, reduce their size using pngquant.
   For movies, upload them to the IPython/Juptyter YouTube channel
   and embed them in the docs with an iframe. The pngs can live in the main repository.
   The movies should be added to the ``jupyterlab-media`` repository.

-  Use `www.youtube-nocookie.com` website, which can be found by
   clicking on the 'privacy-enhanced' embedding option in the Share dialog on YouTube.
   Add the following parameters the end of the URL ``?rel=0&amp;showinfo=0``.
   This disables the video title and related video suggestions.

-  Screenshots or animations should be proceeded by a sentence
   describing the content, such as "To open a file, double-click on its
   name in the File Browser:".

-  We have custom CSS that will add box shadows, and proper sizing of screenshots and
   embedded YouTube videos. See examples in the documentation for how to embed these
   assets.

To help us organize screenshots and animations, please name the files with a prefix
that matches the names of the source file in which they are used:

   ::

       sourcefile.rst
       sourcefile_filebrowser.png
       sourcefile_editmenu.png

This will help us to keep track of the images as documentation content evolves.


