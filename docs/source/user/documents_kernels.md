
## Kernel backed documents

In the Jupyter architecture, Kernels are separate processes started by the
server that run your code in different programming languages. JupyterLab
allows you to connect an open text file to a Code Console/Kernel. With
this, you can run code from the text file in the Kernel interactively.

Right-click on the document and select “Create Console for Editor”: 

[animation]

Once the Code Console is open, send a single line of code or a seletion
of code to the Code Console by hitting `Shift Enter`:

[animation]

In a markdown document, `Shift Enter` will automatically detect if the cursor
is within a code block, and run the entire block:

[animation]

It is important to emphasize that any text file (markdown, python, R, LaTeX,
C++, etc.) can be connected to a Code Console/Kernel in this manner.