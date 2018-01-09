
## Kernel backed documents

In the Jupyter architecture, Kernels are separate processes started by the
server that run your code in different programming languages. JupyterLab allows
you to connect any open text file to a code console/kernel. With this, you can
run code from the text file in the kernel interactively.

Right-click on the document and select “Create Console for Editor”: 

[animation]

Once the code console is open, send a single line of code or a seletion of code
to the code console by hitting `Shift Enter`:

[animation]

In a markdown document, `Shift Enter` will automatically detect if the cursor is
within a code block, and run the entire block:

[animation]

It is important to emphasize that any text file (markdown, python, R, LaTeX,
C++, etc.) can be connected to a code console/kernel in this manner.
