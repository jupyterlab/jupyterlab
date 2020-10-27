.. _kernel-backed-documents:

Documents and Kernels
=====================

In the Jupyter architecture, kernels are separate processes started by
the server that run your code in different programming languages and
environments. JupyterLab enables you to connect any open text file to a
:ref:`code console and kernel <code-console>`. This means you can easily run code from the
text file in the kernel interactively.

.. _create-console:

Right-click on a document and select “Create Console for Editor”:

.. raw:: html

  <div class="jp-youtube-video">
     <iframe src="https://www.youtube-nocookie.com/embed/JS2mhCD3rwE?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  </div>

.. _send-code:

Once the code console is open, send a single line of code or select a
block of code and send it to the code console by hitting
``Shift Enter``:

.. raw:: html

  <div class="jp-youtube-video">
     <iframe src="https://www.youtube-nocookie.com/embed/ODevllc9PXw?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  </div>

.. _run-markdown:

In a Markdown document, ``Shift Enter`` will automatically detect if the
cursor is within a code block, and run the entire block if there is no
selection:

.. raw:: html

  <div class="jp-youtube-video">
     <iframe src="https://www.youtube-nocookie.com/embed/Kz3e7SgqTnI?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  </div>

*Any* text file (Markdown, Python, R, LaTeX, C++, etc.) in a text file
editor can be connected to a code console and kernel in this manner.
