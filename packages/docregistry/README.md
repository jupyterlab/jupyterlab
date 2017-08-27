# @jupyterlab/docregistry

A JupyterLab package which tracks the different types of documents that the application is able to interact with.
This includes notebooks, text files, and base64 encoded documents.

Extensions may register new document types with the document registry to allow them to be opened with JupyterLab.
An example of this may be found in the [@jupyterlab/notebook](../notebook) package.

The document registry is a singleton on the [application](../application).
