# Notebook


The NotebookWidgetFactory constructs a new NotebookPanel from a model and populates the toolbar with default widgets.

## Model

The NotebookModel contains an observable list of cells (which implements undo functionality). A cell can be a code cell, a markdown cell, or a raw cell. A code cell contains a list of output models. The list of cells and the list of outputs can be observed for changes. 

The notebook model cell list supports undo/redo on cell list operations (such as moving cells or adding/deleting cells). Compound operations are also supported. Right now, undo/redo is not supported on other notebook attributes, such as notebook metadata. Undo/redo for individual cell input content is supported by the codemirror editor undo (which does not cover cell metadata changes).

The notebook model and notebook cells support getting and setting metadata through cursors. You can request a cursor to write to a specific metadata key from a notebook model or a cell model.

## Notebook widget

The widget embedded into the DockPanel is the NotebookPanel. The NotebookPanel contains a NotebookToolbar and a Notebook widget and handles the completion logic. The NotebookToolbar maintains a list of widgets to add to the toolbar. The Notebook widget contains the rendering of the notebook and handles most of the interaction logic with the notebook itself (such as keeping track of selected and active cells and the current edit/command mode).

The notebook model cell list provides ways to do fine-grained changes to the cell list. Higher-level actions are contained in the NotebookActions namespace, which has functions to (given a notebook widget) run a cell and select the next cell, merge or split cells at the cursor, delete selected cells, etc.

A Notebook widget contains a list of cell widgets, corresponding to the cell models in its cell list. Each cell widget contains an InputAreaWidget, which contains a CellEditorWidget, which contains a Codemirror instance. A CodeCellWidget also contains an OutputAreaWidget. An OutputAreaWidget is responsible for rendering the outputs in the ObservableOutputs list in the corresponding code cell model. An OutputAreaWidget uses a notebook-specific RenderMime object to render `display_data` output messages (see the OutputAreaWidget.createOutput function).

A Rendermime plugin provides a pluggable system for rendering output messages. Default renderers are provided for markdown, html, images, text, etc. Extensions can register renderers to be used across the entire application by registering a handler and mimetype in the rendermime registry. When a notebook is created, it copies the global Rendermime singleton so that notebook-specific renderers can be added. The widget manager is an example of an extension that adds a notebook-specific renderer, since rendering a widget depends on notebook-specific widget state.

## Notebook extensions

We'll walk through two notebook extensions.

### Adding a button to the toolbar

### The ipywidgets extension
