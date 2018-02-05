.. _overview:

Overview
--------

JupyterLab is the next-generation web-based user interface for Project Jupyter.
JupyterLab will eventually replace the classic Jupyter Notebook.

JupyterLab enables you to work with documents and activities such as notebooks,
text editors, terminals, and custom components in a flexible, integrated, and
extensible manner. You can arrange multiple documents and activities in the work
area using tabs, adjustable splitters, and collapsible sidebars, and then save
layouts as custom named workspaces. Documents and activites integrate with each
other (for example, you can send a code chunk from a text editor to a console to
execute with a keystroke, you can open a live preview of a Markdown, CSV, or
Vega document you are editing, and you can drag cells between notebooks).
JupyterLab extensions can customize or enhance any part of the JupyterLab,
including extending existing components or providing new activities, themes, and
file viewers and editors.

:ref:`JupyterLab has full support for Jupyter Notebook documents. <notebook>`
JupyterLab also enables other models of interactive computing:

-  :ref:`code_console` provide transient scratchpads for running code
   interactively, with full support for rich output. A code console can be
   linked to a notebook kernel as a computation log from the notebook, for
   example.
-  :ref:`Kernel-backed documents <kernel-backed-documents>` enable code in any
   text file (Markdown, Python, R, LaTeX, etc.) to be run interactively in any
   Jupyter kernel.
-  Notebook cell outputs can be pulled into their own tab, side-by-side with
   the notebook, enabling simple dashboards with interactive controls backed by
   a kernel.
-  Multiple views of documents with different editors or viewers enable live
   editing of documents reflected in other viewers. For example, it is easy to
   have live preview of Markdown documents, or edit GeoJSON files with live
   updates of an adjoining map.

JupyterLab also offers a unified model for viewing and handling data formats.
JupyterLab understands many file formats (images, CSV, JSON, Markdown, PDF,
Vega, Vega-Lite, etc.) and can also display rich kernel output in these formats.
See :ref:`file-and-output-formats` for more information.

To navigate the user interface, JupyterLab offers :ref:`customizable keyboard shortcuts <shortcuts>`
and the ability to use key maps from vim, emacs, and Sublime Text.

JupyterLab is served from the same
`server <https://jupyter-notebook.readthedocs.io/en/stable/>`__ and uses
the same `notebook document
format <http://nbformat.readthedocs.io/en/latest/>`__ as the classic
Jupyter Notebook.
