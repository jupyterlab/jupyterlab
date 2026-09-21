# @jupyterlab/attachments

A JupyterLab package which provides an implementation of the Jupyter notebook cell attachments.
These attachments can be connected to both markdown and raw [cells](https://github.com/jupyterlab/jupyterlab/tree/main/packages/cells).

Attachments are able to render several different mime types, which are implemented
in the [rendermime](https://github.com/jupyterlab/jupyterlab/tree/main/packages/rendermime) package. This list of mime types may be extended via
the simplified mime-extension interface defined in [@jupyterlab/rendermime-interfaces](https://github.com/jupyterlab/jupyterlab/tree/main/packages/rendermime-interfaces).
