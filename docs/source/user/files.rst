.. _working_with_files:

Working with Files
------------------

Opening Files
~~~~~~~~~~~~~

The file browser and File menu allow you to work with files and
directories on your system. This includes opening, creating, deleting,
renaming, downloading, copying, and sharing files and directories.

The file browser is in the left sidebar Files tab:

[screenshot]

Many actions on files can also be carried out in the File menu:

[screenshot]

To open any file, double-click on its name in the file browser:

[animation]

You can also drag a file into the main area to create a new tab:

[animation]

Many files types have :ref:`multiple viewers/editors <file-and-output-formats>`.
For example, you can open a Markdown file in a text editor or as rendered HTML.
A JupyterLab extension can also add new viewers/editors for files.
To open a file in a non-default viewer/editor, right-click on its name in the
file browser and use the "Open With..." submenu to select the viewer/editor:

[animation]

A single file can be open simultaneously in multiple viewer/editors and
they will remain in sync:

[animation]

The file system can be navigated by double clicking on folders in the
listing or clicking on the folders at the top of the directory listing:

[animation]

Right-click on a file or directory and select "Copy Shareable Link" to
copy a URL that can be used to open JupyterLab with that file or
directory open.

[screenshot]

Creating Files and Activities
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Create new files or activities by clicking the ``+`` button at the top
of the file browser. This will open a new Launcher tab in the main area,
which allows you to pick an activity and kernel:

[animation]

You can also create new documents or activities using the File menu:

[screenshot]

The current working directory of a new activity or document will be the
directory listed in the file browser (except for a terminal, which
always starts in the root directory of the file browser):

[animation]

A new file is created with a default name. Rename a file by
right-clicking on its name in the file browser and selecting “Rename”
from the context menu:

[animation]

Uploading and Downloading
~~~~~~~~~~~~~~~~~~~~~~~~~

Files can be uploaded to the current directory of the file browser by
dragging and dropping files onto the file browser, or by clicking the
"Upload Files" button at the top of the file browser:

[animation]

Any file in JupyterLab can be downloaded by right-clicking its name in
the file browser and selecting “Download” from the context menu:

[animation]
