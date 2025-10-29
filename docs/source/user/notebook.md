---
myst:
  substitutions:
    not_trusted: |-
      ```{image} ../images/notebook-not-trusted.png
      ```
    trusted: |-
      ```{image} ../images/notebook-trusted.png
      ```
---

% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

(user-notebook)=

# Notebooks

Jupyter notebooks are documents that combine live runnable code with
narrative text (Markdown), equations (LaTeX), images, interactive
visualizations and other rich output:

```{image} ../images/notebook-ui.png
:align: center
:alt: JupyterLab with notebook titled Data.ipynb open. This notebook has text, code,
:  an imported CSV, and an interactive map all in one.
:class: jp-screenshot
```

**Jupyter notebooks (.ipynb files) are fully supported in JupyterLab.** The
[notebook document format](https://nbformat.readthedocs.io/en/latest/) used in
JupyterLab is the same as in the classic Jupyter Notebook. Your existing notebooks
should open correctly in JupyterLab. If they don’t, please open an issue on our
[GitHub issues](https://github.com/jupyterlab/jupyterlab/issues) page.

(create-notebook)=

Create a notebook by clicking the `+` button in the file browser and
then selecting a kernel in the new Launcher tab:

```{raw} html
<div class="jp-youtube-video">
   <iframe src="https://www.youtube-nocookie.com/embed/QL0IxDAOEc0?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
</div>
```

(rename-file)=

A new file is created with a default name. Rename a file by
right-clicking on its name in the file browser and selecting “Rename”
from the context menu:

```{raw} html
<div class="jp-youtube-video">
   <iframe src="https://www.youtube-nocookie.com/embed/y3xzXelypjs?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
</div>
```

The user interface for notebooks in JupyterLab closely follows that of
the classic Jupyter Notebook. The keyboard shortcuts of the classic
Notebook continue to work (with command and edit mode). However, a
number of new things are possible with notebooks in JupyterLab.

(drag-drop)=

Drag and drop cells to rearrange your notebook:

```{raw} html
<div class="jp-youtube-video">
   <iframe src="https://www.youtube-nocookie.com/embed/J9xoTGdqWIo?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
</div>
```

(drag-copy)=

Drag cells between notebooks to quickly copy content:

```{raw} html
<div class="jp-youtube-video">
   <iframe src="https://www.youtube-nocookie.com/embed/YTNZ5TS2LfU?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
</div>
```

(multiple-views)=

Create multiple synchronized views of a single notebook:

```{raw} html
<div class="jp-youtube-video">
   <iframe src="https://www.youtube-nocookie.com/embed/SQn9aRc050w?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
</div>
```

(collapse-code)=

Collapse and expand code and output using the View menu or the blue
collapser button on left of each cell:

```{raw} html
<div class="jp-youtube-video">
   <iframe src="https://www.youtube-nocookie.com/embed/WgiX3ZRaTiY?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
</div>
```

(enable-scrolling)=

Enable scrolling for long outputs by right-clicking on a cell and
selecting “Enable Scrolling for Outputs”:

```{raw} html
<div class="jp-youtube-video">
   <iframe src="https://www.youtube-nocookie.com/embed/U4usAUZCv_c?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
</div>
```

(cell-output-mirror)=

Create a new synchronized view of a cell’s output:

```{raw} html
<div class="jp-youtube-video">
   <iframe src="https://www.youtube-nocookie.com/embed/Asa_ML45HP8?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
</div>
```

(tab-completion)=

Tab completion (activated with the `Tab` key) can now include additional
information about the types of the matched items:

```{raw} html
<div class="jp-youtube-video">
   <iframe src="https://www.youtube-nocookie.com/embed/MuNr0i8LgpM?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
</div>
```

Note: IPython 6.3.1 has temporarily disabled type annotations.
To re-enable them, add `c.Completer.use_jedi = True` to an
[ipython_config.py](https://ipython.readthedocs.io/en/stable/development/config.html) file.

(user-tooltip)=

The tooltip (activated with `Shift Tab`) contains additional
information about objects:

```{raw} html
<div class="jp-youtube-video">
   <iframe src="https://www.youtube-nocookie.com/embed/TgqMK1SG7XI?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
</div>
```

(create-console)=

You can connect a {ref}`code console <code-console>` to a notebook kernel to have a log of
computations done in the kernel, in the order in which they were done.
The attached code console also provides a place to interactively inspect
kernel state without changing the notebook. Right-click on a notebook
and select “New Console for Notebook”:

```{raw} html
<div class="jp-youtube-video">
   <iframe src="https://www.youtube-nocookie.com/embed/eq1l7DBngQQ?rel=0&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
</div>
```

(kernel-history)=

You can iterate through the kernel history in a document cell using `Alt Up-Arrow` and `Alt Down-Arrow`. To use this feature, enable kernel history access in the notebook settings.

(cell-toolbar)=

## Cell Toolbar

In each cell, there is a toolbar that provides quick access to
commonly-used functions, if there is enough room to display it on the first line.

If you would like to disable the cell toolbar, open the Settings Editor, choose the
Cell Toolbar in the left panel, and uncheck "Show cell toolbar".

Administrators can turn off the cell toolbar by disabling its extension, by running:

```bash
jupyter labextension disable @jupyterlab/cell-toolbar-extension
```

on the command line. Administrators can turn it back on by running:

```bash
jupyter labextension enable @jupyterlab/cell-toolbar-extension
```

(notebook-trust)=

## Trust

JavaScript and HTML in notebooks created on other machines are not trusted,
which results in sanitization of HTML and interactive outputs not being
displayed until the notebook is explicitly trusted.

The trust status of the active notebook is indicated by a shield icon in the
status bar; a checkmark ({{ trusted }}) in the shield indicates a trusted notebook while a
cross ({{ not_trusted }}) indicates an untrusted notebook.
To trust a notebook (and render any blocked outputs) use the `Trust Notebook`
command available in the {ref}`command palette <commands>`.

JupyterLab follows the Jupyter Notebook's
[Security Model](https://jupyter-server.readthedocs.io/en/stable/operators/security.html#our-security-model)
where any output generated by the current user is trusted, with following
implementation details of relevance to advanced users:

1. manually re-running a non-trusted cell will mark it as trusted,
2. if any of the code cells is not trusted, the entire notebook is considered
   not trusted and none of the outputs will be trusted upon reopening it (while
   it is unusual to see a notebook with a single untrusted cell, this can occur
   when copy-pasting cells from an untrusted notebook),
3. only code cells can be trusted; the Markdown cells are always sanitised.
