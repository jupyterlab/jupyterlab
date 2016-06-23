# Documents

JupyterLab can be extended in two ways via:

- application plugins (top level): Application plugins extend the
  functionality of JupyterLab itself, and we cover them in the
  "Extensions" tutorial focuses.
- **document widget extensions (lower level):** Document widget extensions extend
  the functionality of document widgets added to the application, and we cover
  them in this section.

For this section, the term, 'document', refers to any visual thing that is
backed by a file stored on disk (i.e. uses Contents API).

The [Document Manager](http://jupyter.org/jupyterlab/classes/_docmanager_manager_.documentmanager.html)
uses the Document Registry to create models and widgets for documents.

The [File Browser](http://jupyter.org/jupyterlab/classes/_filebrowser_browser_.filebrowserwidget.html)
uses the Document Manager when creating and opening files.

The [Document Registry](http://jupyter.org/jupyterlab/classes/_docregistry_registry_.documentregistry.html)
is the default mechanism for interacting with files in JupyterLab.

## Document Registry

*Document widget extensions* in the JupyterLab application can register:

- widget factories
- model factories
- widget extensions
- file types
- file creators

### [Widget Factories](http://jupyter.org/jupyterlab/classes/_docregistry_registry_.documentregistry.html#addwidgetfactory)

Create a widget for a given file.

*Example*
- The notebook widget factory that creates NotebookPanel widgets.

### [Model Factories](http://jupyter.org/jupyterlab/classes/_docregistry_registry_.documentregistry.html#addmodelfactory)

Create a model for a given file.

Models are generally differentiated by the contents options used to fetch the model (e.g. text, base64, notebook).

### [Widget Extensions](http://jupyter.org/jupyterlab/classes/_docregistry_registry_.documentregistry.html#addwidgetextension)

Add additional functionality to a widget type. An extension instance is
created for each widget instance.

*Examples*
- The ipywidgets extension that is created for NotebookPanel widgets.
- Adding a button to the toolbar of each NotebookPanel widget.

### [File Types](http://jupyter.org/jupyterlab/classes/_docregistry_registry_.documentregistry.html#addfiletype)

Intended to be used in a "Create New" dialog, providing a list of known file types.

### [File Creators](http://jupyter.org/jupyterlab/classes/_docregistry_registry_.documentregistry.html#addcreator)

Intended for create quick launch file creators.

The default use will be for the "create new" dropdown in the file browser,
giving list of items that can be created with default options  (e.g. "Python 3 Notebook").

## Document Manager

The *Document Manager* handles:

- models
- contexts
- widgets

for documents and manages their life cycle.

### [Document Models](http://jupyter.org/jupyterlab/interfaces/_docregistry_interfaces_.idocumentmodel.html)

Created by the model factories and passed to widget factories and widget
extensions.

### [Document Contexts](http://jupyter.org/jupyterlab/interfaces/_docregistry_interfaces_.idocumentcontext.html)

Created by the Document Manager and passed to widget factories and
widget extensions.

They are used to provide an abstracted interface
to the session and contents API from jupyter-js-services for the
given model.  They are tied to a model and can be shared between widgets.

The reason for a separate context and model is so that it is easy to create
model factories and the heavy lifting of the context is left to the Document
Manager.

### [Document Wrappers](http://jupyter.org/jupyterlab/classes/_docmanager_manager_.documentwrapper.html)

The top level widget created by the Document Manager that wraps the widget
returned by the widget factory.

Document wrappers are used because they are created synchronously; while,
the widgets created using the widget factory are created asynchronously after
potentially loading data from disk. Some interfaces (like drag and drop)
require a widget to be returned synchronously.
