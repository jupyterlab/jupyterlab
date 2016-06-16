# Documents
The Document Registry is the default mechanism for interacting with
files in JupyterLab.  The Document Manager uses it to create models and 
widgets for documents.  The File Browser uses the Document Manager when 
creating and opening files.

The Document Manager handles models, contexts, and widgets for documents 
and manages their life cycle.

Extensions in the JupyterLab application can register widget factories, 
model factories, widget extensions, file types, and file creators.

## Widget Factories 
Create a widget for a given file. An example is the notebook widget 
factory that creates NotebookPanel widgets.

## Model Factories 
Create a model for a given file.  Models are generally differentiated by 
the contents options used to fetch the model (e.g. text, base64, notebook).

## Widget Extensions
Add additional functionality to a widget. An extension instance is created 
for each widget.  An example is the ipywidgets extension that is created 
for NotebookPanel widgets.  Another example would be to add a button to the 
toolbar of each NotebookPanel widget.

## File Types 
Intended to be used in a "Create New" dialog, providing a list of known 
file types.

## File Creators 
Intended for create quick launch file creators. The default use will be for 
the "create new" dropdown in the file browser, giving list of items that can 
be created with default options  (e.g. "Python 3 Notebook").

## Document Model
Created by the model factories and passed to widget factories and widget 
extensions.

## Document Context
Created by the Document Manager and passed to widget factories and
widget extensions.  They are used to provide an abstracted interface
to the session and contents API from jupyter-js-services for the 
given model.  They are tied to a model and can be shared between widgets.
The reason for a separate context and model is so that it is easy to create
model factories and the heavy lifting of the context is left to the Document
Manager.

## Document Wrapper
The top level widget created by the Document Manager that wraps the widget 
returned by the widget factory.  They are used because they can be
created synchronously, while the widgets created using the widget
factory are created asynchronously after potentially loading data
from disk.  Some interfaces (like drag and drop) require a widget to be
returned synchronously.

