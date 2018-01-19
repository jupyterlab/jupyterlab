.. _kernel-backed-documents:

Documents and kernels
~~~~~~~~~~~~~~~~~~~~~

In the Jupyter architecture, kernels are separate processes started by
the server that run your code in different programming languages and
environments. JupyterLab allows you to connect any open text file to a
:ref:`code console and kernel <code_console>`. This means you can easily run code from the
text file in the kernel interactively.

Right-click on a document and select “Create Console for Editor”:

[animation]

Once the code console is open, send a single line of code or select a
block of code and send it to the code console by hitting
``Shift Enter``:

[animation]

In a Markdown document, ``Shift Enter`` will automatically detect if the
cursor is within a code block, and run the entire block if there is no
selection:

[animation]

*Any* text file (Markdown, Python, R, LaTeX, C++, etc.) in a text file
editor can be connected to a code console and kernel in this manner.
