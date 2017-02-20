# Documents

JupyterLab can be extended in two ways via:

- application plugins (top level): Application plugins extend the
  functionality of JupyterLab itself, and we cover them in the
  [Plugins](plugins.md) tutorial focuses.
- **document widget extensions (lower level):** Document widget extensions extend
  the functionality of document widgets added to the application, and we cover
  them in this section.

For this section, the term, 'document', refers to any visual thing that is
backed by a file stored on disk (i.e. uses Contents API).

The [Document Registry](http://jupyterlab.github.io/jupyterlab/classes/_docregistry_registry_.documentregistry.html)
is where document types and factories are registered.  Plugins can require
a document registry instance and register their content types and providers.

The [Document Manager](http://jupyterlab.github.io/jupyterlab/classes/_docmanager_manager_.documentmanager.html)
uses the Document Registry to create models and widgets for documents.  The
Document Manager is only meant to be accessed by the File Browser itself.


## Document Registry

*Document widget extensions* in the JupyterLab application can register:

- widget factories
- model factories
- widget extension factories
- file types
- file creators

### [Widget Factories](http://jupyterlab.github.io/jupyterlab/classes/_docregistry_registry_.documentregistry.html#addwidgetfactory)

Create a widget for a given file.

*Example*
- The notebook widget factory that creates NotebookPanel widgets.

### [Model Factories](http://jupyterlab.github.io/jupyterlab/classes/_docregistry_registry_.documentregistry.html#addmodelfactory)

Create a model for a given file.

Models are generally differentiated by the contents options used to fetch the model (e.g. text, base64, notebook).

### [Widget Extension Factories](http://jupyterlab.github.io/jupyterlab/classes/_docregistry_registry_.documentregistry.html#addwidgetextension)

Adds additional functionality to a widget type. An extension instance is
created for each widget instance, allowing the extension to add functionality
to each widget or observe the widget and/or its context.

*Examples*
- The ipywidgets extension that is created for NotebookPanel widgets.
- Adding a button to the toolbar of each NotebookPanel widget.

### [File Types](http://jupyterlab.github.io/jupyterlab/classes/_docregistry_registry_.documentregistry.html#addfiletype)

Intended to be used in a "Create New" dialog, providing a list of known file types.

### [File Creators](http://jupyterlab.github.io/jupyterlab/classes/_docregistry_registry_.documentregistry.html#addcreator)

Intended for create quick launch file creators.

The default use will be for the "create new" dropdown in the file browser,
giving list of items that can be created with default options  (e.g. "Python 3 Notebook").

### [Document Models](http://jupyterlab.github.io/jupyterlab/interfaces/_docregistry_registry_.documentregistry.imodel.html)

Created by the model factories and passed to widget factories and widget
extension factories.  Models are the way in which we interact with the data of
a document.  For a simple text file, we typically only use the 
`to/fromString()` methods.  A more complex document like a Notebook
contains more points of interaction like the Notebook metadata.

### [Document Contexts](http://jupyterlab.github.io/jupyterlab/interfaces/_docregistry_registry_.documentregistry.icontext.html)

Created by the Document Manager and passed to widget factories and
widget extensions.  The context contains the model as one of its properties
so that we can pass a single object around.

They are used to provide an abstracted interface
to the session and contents API from `@jupyterlab/services` for the
given model.  They can be shared between widgets.

The reason for a separate context and model is so that it is easy to create
model factories and the heavy lifting of the context is left to the Document
Manager.  Contexts are not meant to be subclassed or re-implemented. Instead, the contexts are intended to be the glue between the document model and the wider application.


## Document Manager

The *Document Manager* handles: 
- document models
- document contexts

The *File Browser* uses the *Document Manager* to open documents and manage them.
