.. _rtc:

Real Time Collaboration
=======================

From JupyterLab 3.1, file documents and notebooks have collaborative
editing using the `Yjs shared editing framework <https://github.com/yjs/yjs>`_.
Editors are not collaborative by default; to activate it, start JupyterLab
with the ``--collaborative`` flag.

To share a document with other users, you can copy the URL and send it, or you
can install a helpful extension called
`jupyterlab-link-share <https://github.com/jupyterlab-contrib/jupyterlab-link-share>`_
that might help to share the link including the token.

The new collaborative editing feature enables collaboration in real-time
between multiple clients without user roles, when sharing the URL of a
document to other users, they will have access to the same environment you
are working on (they can write and execute the cells).

Moreover, you can see the cursors from other users with an anonymous
username, a username that will disappear in a few seconds to make room
for what is essential, the document's content.

.. image:: images/rtc_shared_cursors.png
   :align: center
   :class: jp-screenshot

Something you need to be aware of is that not all editors in JupyterLab support sync.
Additionally, opening the same underlying document using different editor types may result
in a lack of synchronization.
For example, on JupyterLab, you can open a Notebook using the Notebook
editor or a plain text editor, the so-called Editor. Those editors are
not synchronized because, under the hood, they use a different model to
represent the document's content, what we call ``DocumentModel``. If you
modify a Notebook with both editors simultaneously, JupyterLab will prompt
a warning message indicating that the document's content changed. For more
information, you can read the section of
`Documents <https://jupyterlab.readthedocs.io/en/latest/extension/documents.html#documents>`_.

.. image:: images/rtc_sync_editors.png
   :align: center
   :class: jp-screenshot
