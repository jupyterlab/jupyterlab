## General
* [What is JupyterLab?](#What-is-JupyterLab?)
* [What new features does JupyterLab offer?](#What-new-features-does-JupyterLab-offer?)
* [How stable is JupyterLab?](#How-stable-is-JupyterLab?)
* [What will happen to the classic Jupyter Notebook?](#What-will-happen-to-the-classic-Jupyter-Notebook?)
* [Where is the documentation for JupyterLab?](#Where-is-the-documentation-for-JupyterLab?)

## Development

* [How do I report a bug or provide feedback?](#How-do-I-report-a-bug-or-provide-feedback?)
* [How can I contribute?](#How-can-I-contribute?)
* [How can I extend or customize JupyterLab?](#How-can-I-extend-or-customize-JupyterLab?)

## General

### What is JupyterLab?

JupyterLab is a new user interface for the Jupyter Notebook, allowing
users to arrange multiple Jupyter notebooks, text editors, terminals,
output areas, etc. on a single page with multiple panels and tabs in
one integrated application. The codebase and user-interface of JupyterLab
is based on a flexible extension system that makes it easy to extend with new
functionality.

### What new features does JupyterLab offer?

JupyterLab offers a number of features beyond the classic Jupyter
Notebook. Here are a few of them you may want to try out:

* Arrange multiple notebooks, terminals, text files, etc. in the
  application using drag and drop.
* Run code interactively outside of a notebook in the Code Console,
  and connect one  to a text file.
* Right click on a markdown file and "Open with..." a live markdown
  viewer.
* Double click on CSV files to view them as a nicely formatted table.
* Drag and drop notebook cells within a notebook or between notebooks.

### How stable is JupyterLab?

We are currently making a series of alpha releases of JupyterLab.
These releases are mostly usable, but you may
experience bugs and other rough edges as the code base is still
changing rapidly.

In June 2017, we will be releasing a beta version. This beta
version will be characterized by:

* Stable and featureful enough for daily usage by most Jupyter users.
* Most of the commonly used features in the classic notebook are
  implemented.
* Developer APIs that are approaching stability but stil undergoing
  significant changes.

Later in 2017, we will release the 1.0 version of JupyterLab that will
provide additional UI/UX improvements, features, and API stability. At
that point, JupyterLab should be a full featured replacement for the
classic notebook - and go far beyond its capabilities.

### What will happen to the classic Jupyter Notebook?

JupyterLab is intended to be a full replacement for the classic Jupyter
Notebook. Because of this, our plan is to gradually retire the classic
Jupyter Notebook. However, we will support the classic notebook for a
signifciant period of time to help users and extension authors through
this transition. It is important to note that the notebook server
and the notebook document format is unchanged during this transition.

### Where is the documentation for JupyterLab?

The documentation for JupyterLab can be found on ReadTheDocs [here](http://jupyterlab.readthedocs.io/en/latest/).

## Development

### How do I report a bug or provide feedback?

If you find a bug or want to provide feedback, please open an issue
on our [GitHub Issues page](https://github.com/jupyterlab/jupyterlab/issues).

### How can I contribute?

We welcome other developers and designers to contribute to JupyterLab.
Development of JupyterLab takes place on our [GitHub Repository](https://github.com/jupyterlab/jupyterlab).
To get started with development, please have a look at our
[Contributing Guide](https://github.com/jupyterlab/jupyterlab/blob/master/CONTRIBUTING.md)
or chat with us on our [Gitter Channel](https://gitter.im/jupyterlab/jupyterlab).

JupyterLab is a
part of Project Jupyter and follows the [Jupyter Code of Conduct](https://github.com/jupyter/governance/blob/master/conduct/code_of_conduct.md).

### How can I extend or customize JupyterLab?

JupyterLab consists entirely of *JupyterLab Extensions*, which are simply
[NPM](https://www.npmjs.com/) packages that utilize the public JupyterLab
APIs. You can develop your own custom extensions that use these APIs to
extend the functionality of JupyterLab. Examples of possible extensions include:

* Custom renderers/viewers/editors for specific file types.
* Renderers for custom output types in the notebook.
* Entirely new user interfaces for working with data that utilize
  JupyterLab's layout, command palette and integrate in various ways
  with our core extensions (notebooks, code consoles, etc.).

To start developing your own JupyterLab extension, please have a look
at:

* [JupyterLab Documentation](http://jupyterlab.readthedocs.io/en/latest/)
* JupyterLab Extension Template for [TypeScript](https://github.com/jupyterlab/extension-cookiecutter-ts)
* JupyterLab Extension Template for [JavaScript](https://github.com/jupyterlab/extension-cookiecutter-js)
