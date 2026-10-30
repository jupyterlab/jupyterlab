# @jupyterlab/outputarea

A JupyterLab package which provides an implementation of the Jupyter notebook output area.
Execution results from both the [notebook](https://github.com/jupyterlab/jupyterlab/tree/main/packages/notebook) and the [code console](https://github.com/jupyterlab/jupyterlab/tree/main/packages/console)
are placed in the output area.

Output areas are able to render results of several different mime types, which are implemented
in the [rendermime](https://github.com/jupyterlab/jupyterlab/tree/main/packages/rendermime) package. This list of mime types may be extended via
the simplified mime-extension interface defined in [@jupyterlab/rendermime-interfaces](https://github.com/jupyterlab/jupyterlab/tree/main/packages/rendermime-interfaces).
