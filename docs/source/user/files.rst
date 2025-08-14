.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

.. _working-with-files:

Working with Files
==================

Opening Files
-------------

The file browser and File menu enable you to work with files and
folders on your system. This includes opening, creating, deleting,
renaming, downloading, copying, and sharing files and folders.

The file browser is in the left sidebar Files tab:

.. image:: ../images/files-menu-left.png
   :align: center
   :class: jp-screenshot
   :alt: Arrow pointing to the file browser in the upper left sidebar.

Many actions on files can also be carried out in the File menu:

.. image:: ../images/files-menu-top.png
   :align: center
   :class: jp-screenshot
   :alt: The File menu open including options like "New", "Save All."

.. _open-file:

To open any file, double-click on its name in the file browser:

.. raw:: html

  <div class="jp-youtube-video">
     <iframe src="https://www.youtube-nocookie.com/embed/Rh-vwjTwBTI?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  </div>

.. _newtab:

You can also drag a file into the main work area to create a new tab:

.. raw:: html

  <div class="jp-youtube-video">
     <iframe src="https://www.youtube-nocookie.com/embed/uwMmHeDmRxk?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  </div>

.. _multiple-viewers:

Many files types have :ref:`multiple viewers/editors <file-and-output-formats>`.
For example, you can open a Markdown file in a :ref:`text editor <file-editor>` or as rendered HTML.
A JupyterLab extension can also add new viewers/editors for files.
To open a file in a non-default viewer/editor, right-click on its name in the
file browser and use the "Open With..." submenu to select the viewer/editor:

.. raw:: html

  <div class="jp-youtube-video">
     <iframe src="https://www.youtube-nocookie.com/embed/1kEgUqAeYo0?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  </div>

.. _single-doc-sync:

A single file can be open simultaneously in multiple viewer/editors and
they will remain in sync:

.. raw:: html

  <div class="jp-youtube-video">
     <iframe src="https://www.youtube-nocookie.com/embed/87ALbxm1Y3I?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  </div>

.. _file-navigation:

The file system can be navigated by double-clicking on folders in the
listing or clicking on the folders at the top of the folder listing:

.. raw:: html

  <div class="jp-youtube-video">
     <iframe src="https://www.youtube-nocookie.com/embed/2OHwJzjG-l4?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  </div>

.. _file-share:

Right-click on a file or folder and select "Copy Shareable Link" to
copy a URL that can be used to open JupyterLab with that file or
folder open.

.. image:: ../images/files-shareable-link.png
   :align: center
   :class: jp-screenshot
   :alt: The Copy Shareable Link option in the context menu of a file. Copy Shareable Link is the last entry on the list.

.. _file-copy-path:

Right-click on a file or folder and select "Copy Path" to copy the
filesystem relative path. This can be used for passing arguments to open
files in functions called in various kernels.
If you want to copy the filesystem absolute path, you must add the jupyterlab server config `LabServerApp.copy_absolute_path=True` and `ServerApp.root_dir = 'xxx'`.

Creating Files and Activities
-----------------------------

.. _file-create-plus:

Create new files or activities by clicking the ``+`` button at the top
of the file browser. This will open a new Launcher tab in the main work area,
which enables you to pick an activity and kernel:

.. raw:: html

  <div class="jp-youtube-video">
     <iframe src="https://www.youtube-nocookie.com/embed/QL0IxDAOEc0?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  </div>

.. _file-create-menu:

You can also create new documents or activities using the File menu:

.. image:: ../images/files-create-text-file.png
   :align: center
   :class: jp-screenshot
   :alt: The context menu entry for creating a new file.

.. _current-directory:

The current working folder of a new activity or document will be the
folder listed in the file browser (except for a terminal, which
always starts in the root directory of the file browser):

.. raw:: html

  <div class="jp-youtube-video">
     <iframe src="https://www.youtube-nocookie.com/embed/OfISSOTiGTY?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  </div>

.. _file-rename:

A new file is created with a default name. Rename a file by
right-clicking on its name in the file browser and selecting “Rename”
from the context menu:

.. raw:: html

  <div class="jp-youtube-video">
     <iframe src="https://www.youtube-nocookie.com/embed/y3xzXelypjs?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  </div>

Uploading and Downloading
-------------------------

.. _file-upload:

Files can be uploaded to the current folder of the file browser by
dragging and dropping files onto the file browser, or by clicking the
"Upload Files" button at the top of the file browser:

.. raw:: html

  <div class="jp-youtube-video">
     <iframe src="https://www.youtube-nocookie.com/embed/1bd2QHqQSH4?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  </div>

.. _file-download:

Any file in JupyterLab can be downloaded by right-clicking its name in
the file browser and selecting “Download” from the context menu:

.. raw:: html

  <div class="jp-youtube-video">
     <iframe src="https://www.youtube-nocookie.com/embed/Wl7Ozl6rMcc?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  </div>

Displaying Hidden files
-----------------------

Hidden files and folders can be displayed in JupyterLab by combining two parameters:

1. First the server should be allowed to serve hidden files by setting ``ContentsManager.allow_hidden = True``; see `server documentation <https://jupyter-server.readthedocs.io/en/latest/users/configuration.html>`_.
2. Then you will be able to display or hide the hidden files through the menu ``View`` -> ``Show Hidden Files``.

Single-Click Navigation
-----------------------

Single-click navigation for files and folders can be enabled via the settings editor under the `File Browser` option: `Navigate files and directories with single click`
