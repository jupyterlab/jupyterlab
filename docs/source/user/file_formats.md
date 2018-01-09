
# File and output formats

## Overview

When working with code and data, you will encounter data and files in a wide
variety of formats. JupyterLab provides a unified architecture for working with
data. This model applies whether the data is in a file, or is provided by a
Kernel as output in a notebook or code console.

For files, the data format is detected by the extension of the file. A single
file extension may have multiple editors or viewers registered. For example a
Markdown file (`.md`) can be edited in the File Editor, or rendered inline.

You can access different editors and viewers for a file, by right-clicking on
the filename in the File Browser and using the "Open With..." submenu:

[screenshot]

To use these different data formats as output in the Notebook or Code Console,
you can use the relevant display API for the kernel you are using. For example,
the IPython kernel provides a `display` function that takes a `dict` of keys
(MIME types) and value (MIME data):

```python
from IPython.display import display
display({'text/html': '<h1>Hello World</h1>'}, raw=True)
```

Running this code will display the HTML in the output of the notebook or code
console:

[screenshot]

Other Jupyter Kernels offer similar APIs.

## Markdown

* File format: `.md`
* MIME type: `text/markdown`

Markdown is a simple and popular markup language used for text cells in the
Jupyter Notebook.

Markdown documents can be edited as text files or rendered inline:

[animation]

The markdown syntax supported in this mode is the same as that in the Jupyter
Notebook (LaTeX equations work). As seen in the animation, edits to the markdown
source are immediately reflected in the rendered version:

## Images

* File format: `.png`, `.jpeg`, `.gif`
* MIME type: `image/png`, `image/jpeg`, `image/gif`

JupyterLab supports image data as files and output in the above formats.

## HTML

* File format: edit as text file
* MIME type: `text/html`

JupyterLab supports rendered HTML in output. HTML files can be edited as text
files in the File Editor.

## SVG

* File format: `.svg`
* MIME type: `image/svg+xml`

JupyterLab will render Scalable Vector Graphics (SVG) in files and output. SVG
files can slso be edited as text files in the File Editor.

## LaTeX

* File format: edit as text file
* MIME type: `text/latex`

JupyterLab will render LaTeX questions in output, and LaTeX files (`.tex`) can
be edited as text files in the File Editor.

## JSON

* File format: `.json`
* MIME type: `application+json`

JavaScript Object Notation (JSON) files are common in data science.

The default viewer for JSON files is a searchable tree view:

[animation]

To edit the JSON as a text file, right-click on the file in the File Browser and
select the “Editor” item in the “Open With…” submenu:

[animation]

## CSV

* File format: `.csv`
* MIME type: None

Files with rows of Comma Separate Values (with a `.csv` extension) are a common
format for tabular data.

The default viewer for CSV files in JupyterLab is a high performance data grid
viewer. To view a CSV file in the interactive Data Grid, double-click on the
file in the File Browser:

[animation]

To edit a CSV file as a text file, right-click on the file in the File Browser
and select the “Editor” item in the “Open With…” submenu:

[animation]

## PDF

* File format: `.pdf`
* MIME type: `application/pdf`

PDF files (`.pdf` extension) are a common and standard file format for
documents. To view a PDF file in JupyterLab, double-click on the file in the
File Browser:

[animation]


## Vega/Vega-Lite

Vega:

* File format: `.vg`, `.vg.json`
* MIME type: `application/vnd.vega.v2+json`

Vega-Lite:

* File format: `.vl`, `.vl.json`
* MIME type: `application/vnd.vegalite.v1+json`

Vega and Vega-Lite are declarative visualization grammars that allow
visualizations to be encoded as JSON data. Fro more information see the
documentation of Vega or Vega-Lite. JupyterLab has built-in rendering support
for Vega 2.x and Vega-Lite 1.x data. This support works for both files and
output in the Notebook and Code Console.

Vega-Lite 1.x files, with a `.vl` or `.vl.json` file extension, can be opened by
double-clicking he file in the File Browser:

[animation]

The files can also be opened in the JSON viewer or File Editor through the “Open
With…” submenu in the File Browser content menu:

[animation]

As with other files in JupyterLab multiple views of a single file remain
synchronized, allowing you to interactively edit and render Vega-Lite/Vega
visualizations:

[animation]

The same workflow also works for Vega 2.x files, with a `.vg` or `.vg.json` file
extension.

Output support for Vega/Vega-Lite in the Notebook or Code Console is provided
through third party libraries such as Altair (Python), the vegalite R package,
or Vegas (Scala/Spark).

[screenshot]

A JupyterLab extension that supports Vega 3.x and Vega-Lite 2.x can be found
[here](https://github.com/jupyterlab/jupyter-renderers).

## Virtual DOM

* File format: `.vdom`, `.json`
* MIME type: `application/vdom.v1+json`

Virtual DOM libraries such as [react.js](https://reactjs.org/) have greatly
improved the experience of rendering interactive content in HTML. The nteract
project, which collaborates closely with Project Jupyter, has created a
[declarative JSON format](https://github.com/nteract/vdom) for virtual DOM data.
JupyterLab can render this data using react.js. This works for both VDOM files
with the `.vdom` extension, or within notebook output.

Here is an example of a `.vdom` files being edited and rendered interactively:

[animation]

The [nteract/vdom](https://github.com/nteract/vdom) library provides a Python
API for creating VDOM output that is rendered in nteract and JupyterLab:

[screenshot or animation]