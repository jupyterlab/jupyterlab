
# File Formats

## JSON

JavaScript Object Notation (JSON) files are common in data science. The default viewer for JSON files is a searchable tree view:

[animation]

To edit the JSON as a text file, right-click on the file in the File Browser and select the “Editor” item in the “Open With…” submenu:

[animation]

## CSV

Files with rows of Comma Separate Values (with a `.csv` extension) are a common format for tabular data. The default viewer for CSV files in JupyterLab is a high performance Data Grid viewer.

To view a CSV file in the interactive Data Grid, double-click on the file in the File Browser:

[animation]

To edit a CSV file as a text file, right-click on the file in the File Browser and select the “Editor” item in the “Open With…” submenu:

[animation]

## PDF

PDF files (`.pdf` extension) are a common and standard file format for documents. To view a PDF file in JupyterLab, double-click on the file in the File Browser:

[animation]


## Vega/Vega-Lite

Vega and Vega-Lite are declarative visualization grammars that allow visualizations to be encoded as JSON data. Fro more information see the documentation of Vega or Vega-Lite. JupyterLab has built-in rendering support for Vega 2.x and Vega-Lite 1.x data. This support works for both files and output in the Notebook and Code Console.

Vega-Lite 1.x files, with a `.vl` or `.vl.json` file extension, can be opened by double-clicking he file in the File Browser:

[animation]

The files can also be opened in the JSON viewer or File Editor through the “Open With…” submenu in the File Browser content menu:

[animation]

As with other files in JupyterLab multiple views of a single file remain synchronized, allowing you to interactively edit and render Vega-Lite/Vega visualizations:

[animation]

The same workflow also works for Vega 2.x files, with a `.vg` or `.vg.json` file extension.

Output support for Vega/Vega-Lite in the Notebook or Code Console is provided through third party libraries such as Altair (Python), the vegalite R package, or Vegas (Scala/Spark).

[screenshot]

## Virtual DOM

Virtual DOM libraries such as react.js have greatly improved the experience of rendering interactive content in HTML. The nteract project, which collaborates closely with Project Jupyter, has created a declarative JSON format for virtual DOM data. JupyterLab can render this data using react.js. This works for both VDOM files with the `.vdom` extension, or within notebook output.

Here is an example of a `.vdom` files being edited and rendered interactively:

[animation]

The nteract/vdom library provides a Python API for creating VDOM output that is rendered in nteract and JupyterLab:

[screenshot or animation]