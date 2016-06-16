# Document Registry
The document registry is the default entry point for interacting with
files in JupyterLab.  It is used by the document manager to create
models and widgets for documents.  The file browser uses the document 
manager when creating and opening files.

Extensions in the application can register widget factories, 
model factories, widget extensions, file types, and file creators.

## Widget factories 
Create a widget for a given file. An example is the notebook widget factory that creates NotebookPanel widgets.

## Model factories 
Create a model for a given file.  Models
are generally differentiated by the contents options used to fetch the
model (e.g. text, base64, notebook).

## Widget extensions
A means to add additional functionality to a widget.
An extension instance is created for each widget.  An example is the
ipywidgets extension that is created for notebook widgets.  Another
example would be to add a button to the toolbar of each notebook widget.

## File types 
Intended to be used in a "Create New" dialog, providing a list of known file types.

## File creators 
Intended to be used to create quick launch file creators.
The default use will be for the "create new" dropdown in the file browser,
giving list of items that can be created with default options 
(e.g. "Python 3 Notebook").

## Document Model
Created by the model factories and passed to widget factories and
widget extensions.  They can shared by widgets and their
lifecycle is managed by the Document Manager.

## Document Context
Created by the Document Manager and passed to widget factories and
widget extensions.  They are used to provide an abstracted interface
to the session and contents API from jupyter-js-services for the 
given model.  They are tied to a model can be shared between widgets.

## Document Wrapper
The top level widget added to the application that wraps the widget
returned by the widget factory.  They are used because they can be
created synchronously, while the widgets created using the widget
factory are created asynchronously after potentially loading data
from disk.  Some interfaces (like drag and drop) require a widget to be
returned synchronously.

