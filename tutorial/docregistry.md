# Document Registry
The document registry is the default entry point for interacting with
files in JupyterLab.  It is used by the document manager to create
models and widgets for documents.  The file browser uses the document 
manager when creating and opening files.

Extensions in the application can register widget factories, 
model factories, widget extensions, file types, and file creators.

## Widget factories 
Create a widget for a given file. An example is the notebook widget factory that creates NotebookPanel
widgets.

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
Intended to be used in a "Create New" dialog, as a
list of known file types.

## File creators 
Intended used to create quick launch file creators.
The default use will be for the create new dropdown in the file browser,
to give a list of items that can be created with default options 
(e.g. Python 3 Notebook).
