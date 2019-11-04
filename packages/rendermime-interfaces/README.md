# @jupyterlab/rendermime-interfaces

A package for JupyterLab which provides interfaces for implementing mime renderer extensions.

A general JupyterLab plugin involves a certain amount of boilerplate code
that can be annoying for authors of relatively extensions.
The interfaces in this package are meant to give an easier way for extension authors
to provide a plugin that renders mime bundles and documents of a specific mime type.

When using these interfaces, extensions only need to provide some metadata about
wht kind of mime bundle they are able to render, and a `Widget` with
a `renderModel` method that renders the mime bundle.

Examples can be found in [@jupyterlab/vega5-extension](../vega5-extension) and [@jupyterlab/pdf-extension](../pdf-extension).
