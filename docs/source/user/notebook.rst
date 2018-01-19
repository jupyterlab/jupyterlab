.. _notebook:

Notebooks
---------

Jupyter Notebooks are documents that combine live runnable code with
narrative text (Markdown), equations (LaTeX), images, interactive
visualizations and other rich output:

[screenshot]

**Jupyter Notebook (.ipynb files) are fully supported in JupyterLab.**
Furthermore, the `notebook document
format <http://nbformat.readthedocs.io/en/latest/>`__ used in JupyterLab
is the same as in the classic notebook. Your existing notebooks should
open correctly in JupyterLab. If they don’t, please open an issue on our
`GitHub issues <https://github.com/jupyterlab/jupyterlab/issues>`__
page.

Create a notebook by clicking the ``+`` button in the file browser and
then selecting a kernel in the new Launcher tab:

[animation]

A new file is created with a default name. Rename a file by
right-clicking on its name in the file browser and selecting “Rename”
from the context menu:

[animation]

The user interface for Notebooks in JupyterLab closely follows that of
the classic Jupyter Notebook. The keyboard shortcuts of the classic
Notebook continue to work (with command and edit mode). However, a
number of new things are possible with notebooks in JupyterLab.

Drag and drop cells to rearrange your notebook:

[animation]

Drag cells between notebooks to quickly copy content:

[animation]

Create multiple synchronized views of a single notebook:

[animation]

Collapse and expand code and output using the View Menu or the blue
collapser button on left of each cell:

[animation]

Enable scrolling for long outputs by right-clicking on a cell and
selecting “Enable Scrolling for Outputs”:

[animation]

Create a new synchronized view of a cell’s output:

[animation]

Tab completion (activated with the ``Tab`` key) now includes additional
information about the types of the matched items:

[animation]

The tooltip (activated with ``Shift Tab``) contains additional
information about objects:

[animation]

You can connect a :ref:`code console <code_console>` to a notebook kernel to have a log of
computations done in the kernel, in the order in which they were done.
The attached code console also provides a place to interactively inspect
kernel state without changing the notebook. Right-click on a notebook
and select “Create Console for Notebook”:

[animation]
