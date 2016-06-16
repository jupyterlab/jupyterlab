# Notebook

The [NotebookWidgetFactory](http://jupyter.org/jupyterlab/classes/_notebook_notebook_widgetfactory_.notebookwidgetfactory.html) constructs a new [NotebookPanel](http://jupyter.org/jupyterlab/classes/_notebook_notebook_panel_.notebookpanel.html) from a model and populates the toolbar with default widgets.

## Model

The [NotebookModel](http://jupyter.org/jupyterlab/classes/_notebook_notebook_model_.notebookmodel.html) contains an observable list of cells (which implements undo functionality). A [cell model](http://jupyter.org/jupyterlab/modules/_notebook_cells_model_.html) can be a code cell, a markdown cell, or a raw cell. A code cell contains a list of output models. The list of cells and the list of outputs can be observed for changes. 

The notebook model cell list supports undo/redo on cell list operations (such as moving cells or adding/deleting cells). Compound operations are also supported. Right now, undo/redo is not supported on other notebook attributes, such as notebook metadata. Undo/redo for individual cell input content is supported by the CodeMirror editor undo (which does not cover cell metadata changes).

The notebook model and notebook cells support getting and setting metadata through cursors. One can request a cursor to write to a specific metadata key from a notebook model or a cell model.

## Notebook widget

The widget embedded into the DockPanel is the NotebookPanel. The NotebookPanel contains a [NotebookToolbar](http://jupyter.org/jupyterlab/classes/_notebook_notebook_toolbar_.notebooktoolbar.html) and a [Notebook widget](http://jupyter.org/jupyterlab/classes/_notebook_notebook_widget_.notebook.html) and adds completion logic. The NotebookToolbar maintains a list of widgets to add to the toolbar. The Notebook widget contains the rendering of the notebook and handles most of the interaction logic with the notebook itself (such as keeping track of selected and active cells and the current edit/command mode).

The notebook model cell list provides ways to do fine-grained changes to the cell list. Higher-level actions are contained in the [NotebookActions](http://jupyter.org/jupyterlab/modules/_notebook_notebook_actions_.notebookactions.html) namespace, which has functions to (given a notebook widget) run a cell and select the next cell, merge or split cells at the cursor, delete selected cells, etc.

A Notebook widget contains a list of [cell widgets](http://jupyter.org/jupyterlab/modules/_notebook_cells_widget_.html), corresponding to the cell models in its cell list. Each cell widget contains an [InputAreaWidget](http://jupyter.org/jupyterlab/classes/_notebook_cells_widget_.inputareawidget.html), which contains a [CellEditorWidget](http://jupyter.org/jupyterlab/classes/_notebook_cells_editor_.celleditorwidget.html), which contains a CodeMirror instance. A [CodeCellWidget](http://jupyter.org/jupyterlab/classes/_notebook_cells_widget_.codecellwidget.html) also contains an [OutputAreaWidget](http://jupyter.org/jupyterlab/classes/_notebook_output_area_widget_.outputareawidget.html). An OutputAreaWidget is responsible for rendering the outputs in the [ObservableOutputs](http://jupyter.org/jupyterlab/classes/_notebook_output_area_model_.observableoutputs.html) list in the corresponding code cell model. An OutputAreaWidget uses a notebook-specific [RenderMime](http://jupyter.org/jupyterlab/classes/_rendermime_index_.rendermime.html) object to render `display_data` output messages.

A Rendermime plugin provides a pluggable system for rendering output messages. Default renderers are provided for markdown, html, images, text, etc. Extensions can register renderers to be used across the entire application by registering a handler and mimetype in the rendermime registry. When a notebook is created, it copies the global Rendermime singleton so that notebook-specific renderers can be added. The ipywidgets widget manager is an example of an extension that adds a notebook-specific renderer, since rendering a widget depends on notebook-specific widget state.

## Notebook extensions

We'll walk through two notebook extensions.

### Adding a button to the toolbar

Create a `src/mybutton/plugin.ts` file with the following contents.

```typescript
import {
  IWidgetExtension, IDocumentContext, IDocumentModel, DocumentRegistry
} from '../docregistry';

import {
  IDisposable, DisposableDelegate
} from 'phosphor-disposable';

import {
  NotebookPanel
} from '../notebook/notebook/panel';

import {
  Application
} from 'phosphide/lib/core/application';

import {
  ToolbarButton
} from '../notebook/notebook/toolbar';

import {
  NotebookActions
} from '../notebook/notebook/actions';
/**
 * The plugin registration information.
 */
export
const widgetExtension = {
  id: 'jupyter.extensions.newButton',
  requires: [DocumentRegistry],
  activate: activateExtension
};

export
class ButtonExtension implements IWidgetExtension<NotebookPanel>{
  /**
   * Create a new extension object.
   */
  createNew(nb: NotebookPanel, model: IDocumentModel,
            context: IDocumentContext): IDisposable {
    let button = new ToolbarButton('myButton', () => {
      NotebookActions.runAll(nb.content, context.kernel);
    }, 'Tooltip');

    let i = document.createElement('i');
    i.classList.add('fa', 'fa-fast-forward')
    button.node.appendChild(i);

    nb.toolbar.add('mybutton', button, 'cellType')
    return new DisposableDelegate(() => {
      button.dispose();
    })
  }
}

/**
 * Activate the extension.
 */
function activateExtension(app: Application, registry: DocumentRegistry) {
  registry.registerExtension('Notebook', new ButtonExtension());
}

```

Then add this extension to the JupyterLab extension list and relaunch JupyterLab:

```typescript
    require('jupyterlab/lib/mybutton/plugin').widgetExtension,
```


### The ipywidgets extension

This discussion will be a bit confusing since we've been using "widget" to refer to phosphor widgets. In the discussion below, ipython widgets will be referred to as "ipywidgets". There is no intrinsic relation between phosphor widgets and ipython widgets.

The ipywidgets plugin registers a factory for a notebook widget extension 
using the [Document Registry](http://jupyter.org/jupyterlab/classes/_docregistry_registry_.documentregistry.html#registermodelfactory). The `createNew()` function is called with a NotebookPanel and [DocumentContext](http://jupyter.org/jupyterlab/interfaces/_docregistry_interfaces_.idocumentcontext.html). The plugin then creates a ipywidget manager (which uses the context to interact the kernel and kernel's comm manager). The plugin then registers an ipywidget renderer with the notebook instance's rendermime (which is specific to that particular notebook).

When an ipywidget model is created in the kernel, a comm message is sent to the browser and handled by the ipywidget manager to create a browser-side ipywidget model. When the model is displayed in the kernel, a `display_data` output is sent to the browser with the ipywidget model id. The renderer registered in that notebook's rendermime is asked to render the output. The renderer asks the ipywidget manager instance to render the corresponding model, which returns a javascript promise. The renderer creates a container *phosphor* widget which it hands back synchronously to the OutputAreaWidget, and then fills the container with the rendered ipywidget when the promise resolves.
