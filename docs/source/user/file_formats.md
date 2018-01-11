
# File and output formats

## Overview

When working with code and data, you will encounter data and files in a wide
variety of formats. JupyterLab provides a unified architecture for viewing and editing
data. This model applies whether the data is in a file or is provided by a
kernel as rich output in a notebook or code console.

For files, the data format is detected by the extension of the file. A single
file extension may have multiple editors or viewers registered. For example a
Markdown file (`.md`) can be edited in the file editor or rendered and displayed
as HTML.

You can open different editors and viewers for a file by right-clicking on
the filename in the file browser and using the "Open With..." submenu:

[screenshot]

To use these different data formats as output in a notebook or code console,
you can use the relevant display API for the kernel you are using. For example,
the IPython kernel provides a `display` function that takes a `dict` of keys
(MIME types) and values (MIME data):

```python
from IPython.display import display
display({'text/html': '<h1>Hello World</h1>'}, raw=True)
```

Running this code will display the HTML in the output of the notebook or code
console:

[screenshot]

Other Jupyter kernels offer similar APIs.

## Markdown

* File format: `.md`
* MIME type: `text/markdown`

Markdown is a simple and popular markup language used for text cells in the
Jupyter Notebook.

Markdown documents can be edited as text files or rendered inline:

[animation]

The markdown syntax supported in this mode is the same as that in the Jupyter
Notebook (LaTeX equations work). As seen in the animation, edits to the Markdown
source are immediately reflected in the rendered version.

## Images

* File format: `.png`, `.jpeg`, `.gif`
* MIME type: `image/png`, `image/jpeg`, `image/gif`

JupyterLab supports image data as files and output in the above formats. In the image file viewer, you can use keyboard shortcuts such as `+` and `-` to zoom the image and `0` to reset the zoom level.

## HTML

* File format: `.html`
* MIME type: `text/html`

JupyterLab supports rendered HTML in output. HTML files can be edited as text
files in the file editor.

## SVG

* File format: `.svg`
* MIME type: `image/svg+xml`

JupyterLab will render Scalable Vector Graphics (SVG) in files and output. SVG
files can slso be edited as text files in the file editor.

## LaTeX

* File format: `.tex`
* MIME type: `text/latex`

JupyterLab will render LaTeX questions in output, and LaTeX files (`.tex`) can
be edited as text files in the file editor.

## JSON

* File format: `.json`
* MIME type: `application/binary+json`

JavaScript Object Notation (JSON) files are common in data science.

The default viewer for JSON files is a searchable tree view:

[animation]

To edit the JSON as a text file, right-click on the file in the file browser and
select the “Editor” item in the “Open With…” submenu:

[animation]

## CSV

* File format: `.csv`
* MIME type: None

Files with rows of Comma-Separated Values (with a `.csv` extension) are a common
format for tabular data.

The default viewer for CSV files in JupyterLab is a high performance data grid
viewer:

[animation]

To edit a CSV file as a text file, right-click on the file in the file browser
and select the “Editor” item in the “Open With…” submenu:

[animation]

## PDF

* File format: `.pdf`
* MIME type: `application/pdf`

PDF files are a common standard file format for
documents. To view a PDF file in JupyterLab, double-click on the file in the
file browser:

[animation]


## Vega/Vega-Lite

Vega:

* File format: `.vg`, `.vg.json`
* MIME type: `application/vnd.vega.v2+json`

Vega-Lite:

* File format: `.vl`, `.vl.json`
* MIME type: `application/vnd.vegalite.v1+json`

Vega and Vega-Lite are declarative visualization grammars that allow
visualizations to be encoded as JSON data. For more information, see the
documentation of Vega or Vega-Lite. JupyterLab has built-in rendering support
for Vega 2.x and Vega-Lite 1.x data. This support works for both files and
output in the Notebook and Code Console.

Vega-Lite 1.x files, with a `.vl` or `.vl.json` file extension, can be opened by
double-clicking the file in the File Browser:

[animation]

The files can also be opened in the JSON viewer or file editor through the “Open
With…” submenu in the file browser content menu:

[animation]

As with other files in JupyterLab, multiple views of a single file remain
synchronized, allowing you to interactively edit and render Vega-Lite/Vega
visualizations:

[animation]

The same workflow also works for Vega 2.x files, with a `.vg` or `.vg.json` file
extension.

Output support for Vega/Vega-Lite in a notebook or code console is provided
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
