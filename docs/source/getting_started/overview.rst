.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

.. _overview:

Get Started
===========

`JupyterLab <https://jupyterlab.readthedocs.io/en/latest/>`_ is a next-generation web-based user interface for
`Project Jupyter <https://docs.jupyter.org/en/latest/>`_.

.. image:: ../images/interface-jupyterlab.png
   :align: center
   :class: jp-screenshot
   :alt: JupyterLab showing the file browser, notebook, and several other open files.

JupyterLab enables you to work with documents and activities such as
:ref:`Jupyter notebooks <notebook>`, text editors, terminals, and custom
components in a flexible, integrated, and extensible manner. For a demonstration
of JupyterLab and its features, you can view this video:

.. raw:: html

  <div class="jp-youtube-video">
    <iframe src="https://www.youtube-nocookie.com/embed/A5YyoCKxEOU?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  </div>

You can :ref:`arrange <interface>` multiple documents and activities side by side in the
work area using tabs and splitters. Documents and activities integrate with each
other, enabling new workflows for interactive computing, for example:

-  :ref:`code-console` provide transient scratchpads for running code
   interactively, with full support for rich output. A code console can be
   linked to a notebook kernel as a computation log from the notebook, for
   example.
-  :ref:`Kernel-backed documents <kernel-backed-documents>` enable code in any
   text file (Markdown, Python, R, LaTeX, etc.) to be run interactively in any
   Jupyter kernel.
-  Notebook cell outputs can be :ref:`mirrored into their own tab <cell-output-mirror>`,
   side by side with the notebook, enabling simple dashboards with interactive controls
   backed by a kernel.
-  Multiple views of documents with different editors or viewers enable live
   editing of documents reflected in other viewers. For example, it is easy to
   have live preview of :ref:`markdown`, :ref:`csv`, or :ref:`vega-lite` documents.

JupyterLab also offers a unified model for viewing and handling data formats.
JupyterLab understands many file formats (images, CSV, JSON, Markdown, PDF,
Vega, Vega-Lite, etc.) and can also display rich kernel output in these formats.
See :ref:`file-and-output-formats` for more information.

To navigate the user interface, JupyterLab offers :ref:`customizable keyboard
shortcuts <shortcuts>`.

JupyterLab :ref:`extensions <user_extensions>` can customize or enhance any part
of JupyterLab, including new themes, file editors, and custom components.

JupyterLab uses the same `notebook document format <https://nbformat.readthedocs.io/en/latest/>`__
as the classic Jupyter Notebook.

.. _classic:

What will happen to the Classic Notebook?
-----------------------------------------

As JupyterLab 4 development continues, and Notebook 7 development follows,
Notebook 7 will eventually replace the classic Jupyter Notebook.
Throughout this transition, the same notebook document format will
be supported by both the classic Notebook, Notebook 7 and JupyterLab.
As of JupyterLab 4, the Notebook web application, will no longer
be installed alongside JupyterLab as it is no longer a JupyterLab
dependency. To find out more about the future of the classic
Jupyter Notebook in the ecosystem, visit the
`Jupyter Notebook 7 documentation <https://jupyter-notebook.readthedocs.io/en/latest/migrate_to_notebook7.html>`__.


.. toctree::
   :maxdepth: 2

   installation
   starting
   issue
   faq
   changelog
   accessibility
   lifecycle
