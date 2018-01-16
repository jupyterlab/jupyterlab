.. _file-and-output-formats:

File and output formats
-----------------------

JupyterLab provides a unified architecture for viewing and editing data
in a wide variety of formats. This model applies whether the data is in
a file or is provided by a kernel as rich cell output in a notebook or
code console.

For files, the data format is detected by the extension of the file (or
the whole filename if there is no extension). A single file extension
may have multiple editors or viewers registered. For example, a Markdown
file (``.md``) can be edited in the file editor or rendered and
displayed as HTML. You can open different editors and viewers for a file
by right-clicking on the filename in the file browser and using the
“Open With” submenu:

[screenshot]

To use these different data formats as output in a notebook or code
console, you can use the relevant display API for the kernel you are
using. For example, the IPython kernel provides a variety of convenience
classes for displaying rich output:

.. code:: python

    from IPython.display import display, HTML
    display(HTML('<h1>Hello World</h1>'))

Running this code will display the HTML in the output of a notebook or
code console cell:

[screenshot]

The IPython display function can also construct a raw rich output
message from a dictionary of keys (MIME types) and values (MIME data):

.. code:: python

    from IPython.display import display
    display({'text/html': '<h1>Hello World</h1>', 'text/plain': 'Hello World'}, raw=True)

Other Jupyter kernels offer similar APIs.

The rest of this section highlights some of the common data formats that
JupyterLab supports.

Markdown
~~~~~~~~

-  File extension: ``.md``
-  MIME type: ``text/markdown``

Markdown is a simple and popular markup language used for text cells in
the Jupyter Notebook.

Markdown documents can be edited as text files or rendered inline:

[animation showing opening a markdown document editor and renderer
side-by-side, and changes in the editor being reflected in the renderer]

The Markdown syntax supported in this mode is the same syntax used in
the Jupyter Notebook (for example, LaTeX equations work). As seen in the
animation, edits to the Markdown source are immediately reflected in the
rendered version.

Images
~~~~~~

-  File extensions: ``.bmp``, ``.gif``, ``.jpeg``, ``.jpg``, ``.png``,
   ``.svg``
-  MIME types: ``image/bmp``, ``image/gif``, ``image/jpeg``,
   ``image/png``, ``image/svg+xml``

JupyterLab supports image data in cell output and as files in the above
formats. In the image file viewer, you can use keyboard shortcuts such
as ``+`` and ``-`` to zoom the image and ``0`` to reset the zoom level.
To edit an SVG image as a text file, right-click on the SVG filename in
the file browser and select the “Editor” item in the “Open With”
submenu:

[animation]

CSV
~~~

-  File extension: ``.csv``
-  MIME type: None

Files with rows of comma-separated values (CSV files) are a common
format for tabular data. The default viewer for CSV files in JupyterLab
is a high-performance data grid viewer (which can also handle tab- and
semicolon-separated values):

[animation]

To edit a CSV file as a text file, right-click on the file in the file
browser and select the “Editor” item in the “Open With” submenu:

[animation]

JSON
~~~~

-  File extension: ``.json``
-  MIME type: ``application/json``

JavaScript Object Notation (JSON) files are common in data science.
JupyterLab supports displaying JSON data in cell output or viewing a
JSON file using a searchable tree view:

[animation showing both rendering JSON as cell output and viewing a JSON
file]

To edit the JSON as a text file, right-click on the filename in the file
browser and select the “Editor” item in the “Open With” submenu:

[animation]

HTML
~~~~

-  File extension: ``.html``
-  MIME type: ``text/html``

JupyterLab supports rendering HTML in cell output and editing HTML files
as text in the file editor.

LaTeX
~~~~~

-  File extension: ``.tex``
-  MIME type: ``text/latex``

JupyterLab supports rendering LaTeX equations in cell output and editing
LaTeX files as text in the file editor.

PDF
~~~

-  File extension: ``.pdf``
-  MIME type: ``application/pdf``

PDF is a common standard file format for documents. To view a PDF file
in JupyterLab, double-click on the file in the file browser:

[animation]

Vega/Vega-Lite
~~~~~~~~~~~~~~

Vega:

-  File extensions: ``.vg``, ``.vg.json``
-  MIME type: ``application/vnd.vega.v2+json``

Vega-Lite:

-  File extensions: ``.vl``, ``.vl.json``
-  MIME type: ``application/vnd.vegalite.v1+json``

Vega and Vega-Lite are declarative visualization grammars that allow
visualizations to be encoded as JSON data. For more information, see the
documentation of Vega or Vega-Lite. JupyterLab supports rendering Vega
2.x and Vega-Lite 1.x data in files and cell output.

Vega-Lite 1.x files, with a ``.vl`` or ``.vl.json`` file extension, can
be opened by double-clicking the file in the File Browser:

[animation]

The files can also be opened in the JSON viewer or file editor through
the “Open With…” submenu in the file browser content menu:

[animation]

As with other files in JupyterLab, multiple views of a single file
remain synchronized, allowing you to interactively edit and render
Vega-Lite/Vega visualizations:

[animation]

The same workflow also works for Vega 2.x files, with a ``.vg`` or
``.vg.json`` file extension.

Output support for Vega/Vega-Lite in a notebook or code console is
provided through third-party libraries such as Altair (Python), the
vegalite R package, or Vegas (Scala/Spark).

[screenshot]

A JupyterLab extension that supports Vega 3.x and Vega-Lite 2.x can be
found `here <https://github.com/jupyterlab/jupyter-renderers>`__.

Virtual DOM
~~~~~~~~~~~

-  File extensions: ``.vdom``, ``.json``
-  MIME type: ``application/vdom.v1+json``

Virtual DOM libraries such as `react.js <https://reactjs.org/>`__ have
greatly improved the experience of rendering interactive content in
HTML. The nteract project, which collaborates closely with Project
Jupyter, has created a `declarative JSON
format <https://github.com/nteract/vdom>`__ for virtual DOM data.
JupyterLab can render this data using react.js. This works for both VDOM
files with the ``.vdom`` extension, or within notebook output.

Here is an example of a ``.vdom`` file being edited and rendered
interactively:

[animation]

The `nteract/vdom <https://github.com/nteract/vdom>`__ library provides
a Python API for creating VDOM output that is rendered in nteract and
JupyterLab:

[screenshot or animation]
