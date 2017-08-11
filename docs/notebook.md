# Notebook

## Background

[JupyterLab Walkthrough June 16, 2016 YouTube video](https://www.youtube.com/watch?v=4Qm6oD_Rlw8&feature=youtu.be&t=55m19s)

The most complicated plugin included in the **JupyterLab application** is the
**Notebook plugin**.

The [NotebookWidgetFactory](http://jupyterlab.github.io/jupyterlab/classes/_notebook_src_widgetfactory_.notebookwidgetfactory.html) constructs a new [NotebookPanel](http://jupyterlab.github.io/jupyterlab/classes/_notebook_src_panel_.notebookpanel.html) from a model and populates the toolbar with default widgets.

## Structure of the Notebook plugin

The Notebook plugin provides a model and widgets for dealing with notebook
files.

### Model

The **[NotebookModel](http://jupyterlab.github.io/jupyterlab/classes/_notebook_src_model_.notebookmodel.html)**
contains an observable list of cells.

A **[cell model](http://jupyterlab.github.io/jupyterlab/modules/_cells_src_model_.html)**
can be:

- a code cell
- a markdown cell
- raw cell

A code cell contains a list of **output models**. The list of cells and the
list of outputs can be observed for changes.

#### Cell operations

The NotebookModel cell list supports single-step operations such as moving, adding, or
deleting cells. Compound cell list operations, such as undo/redo, are also
supported by the NotebookModel. Right now, undo/redo is only supported on cells
and is not supported on notebook attributes, such as notebook metadata. Currently,
undo/redo for individual cell input content is supported by the CodeMirror editor's undo
feature. (Note: CodeMirror editor's undo does not cover cell metadata changes.)

#### Cursors and metadata

The notebook model and the cell model (i.e. notebook cells) support getting
and setting metadata through cursors. You may request a cursor to write to a
specific metadata key from a notebook model or a cell model.

### Notebook widget

After the NotebookModel is created, the NotebookWidgetFactory constructs a
new NotebookPanel from the model. The NotebookPanel widget is added to
the DockPanel. The **NotebookPanel** contains:

- a [Toolbar](http://jupyterlab.github.io/jupyterlab/modules/_apputils_src_toolbar_.html)
- a [Notebook widget](http://jupyterlab.github.io/jupyterlab/classes/_notebook_src_widget_.notebook.html).

The NotebookPanel also adds completion logic.

The **NotebookToolbar** maintains a list of widgets to add to the toolbar. The
**Notebook widget** contains the rendering of the notebook and handles most of
the interaction logic with the notebook itself (such as keeping track of
interactions such as selected and active cells and also the
current edit/command mode).

The NotebookModel cell list provides ways to do fine-grained changes to the
cell list.

#### Higher level actions using NotebookActions

Higher-level actions are contained in the
[NotebookActions](http://jupyterlab.github.io/jupyterlab/modules/_notebook_src_actions_.notebookactions.html) namespace,
which has functions, when given a notebook widget, to run a cell and select
the next cell, merge or split cells at the cursor, delete selected cells, etc.

#### Widget hierarchy

A Notebook widget contains a list of [cell widgets](http://jupyterlab.github.io/jupyterlab/modules/_cells_src_widget_.html),
corresponding to the cell models in its cell list.

- Each cell widget contains an [InputArea](http://jupyterlab.github.io/jupyterlab/classes/_cells_src_inputarea_.inputarea.html),

    + which contains n [CodeEditorWrapper](http://jupyterlab.github.io/jupyterlab/classes/_codeeditor_src_widget_.codeeditorwrapper.html),

        - which contains a JavaScript CodeMirror instance.

A [CodeCell](http://jupyterlab.github.io/jupyterlab/classes/_cells_src_widget_.codecell.html)
also contains an [OutputArea](http://jupyterlab.github.io/jupyterlab/classes/_outputarea_src_widget_.outputarea.html).
An OutputArea is responsible for rendering the outputs in the
[OutputAreaModel](http://jupyterlab.github.io/jupyterlab/classes/_outputarea_src_model_.outputareamodel.html)
list. An OutputArea uses a
notebook-specific [RenderMime](http://jupyterlab.github.io/jupyterlab/classes/_rendermime_src_rendermime_.rendermime.html)
object to render `display_data` output messages.

#### Rendering output messages

A **Rendermime plugin** provides a pluggable system for rendering output
messages. Default renderers are provided for markdown, html, images, text, etc.
Extensions can register renderers to be used across the entire application by
registering a handler and mimetype in the rendermime registry. When a notebook
is created, it copies the global Rendermime singleton so that notebook-specific
renderers can be added. The ipywidgets widget manager is an example of an
extension that adds a notebook-specific renderer, since rendering a widget
depends on notebook-specific widget state.

## How to extend the Notebook plugin

We'll walk through two notebook extensions:

- adding a button to the toolbar
- adding an ipywidgets extension

### Adding a button to the toolbar

Start from the cookie cutter extension template.

```
pip install cookiecutter
cookiecutter https://github.com/jupyterlab/extension-cookiecutter-ts
cd my-cookie-cutter-name
```

Install the dependencies.  Note that extensions are built against the released
npm packages, not the development versions.

```
npm install --save @jupyterlab/notebook @jupyterlab/application @jupyterlab/apputils @jupyterlab/docregistry @phosphor/disposable
```

Copy the following to `src/index.ts`:


```typescript
import {
  IDisposable, DisposableDelegate
} from '@phosphor/disposable';

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ToolbarButton
} from '@jupyterlab/apputils';

import {
  DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  NotebookActions, NotebookPanel, INotebookModel
} from '@jupyterlab/notebook';


/**
 * The plugin registration information.
 */
const plugin: JupyterLabPlugin<void> = {
  activate,
  id: 'jupyter.extensions.new-button',
  autoStart: true
};


/**
 * A notebook widget extension that adds a button to the toolbar.
 */
export
class ButtonExtension implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> {
  /**
   * Create a new extension object.
   */
  createNew(panel: NotebookPanel, context: DocumentRegistry.IContext<INotebookModel>): IDisposable {
    let callback = () => {
      NotebookActions.runAll(panel.notebook, context.session);
    };
    let button = new ToolbarButton({
      className: 'myButton',
      onClick: callback,
      tooltip: 'Run All'
    });

    let i = document.createElement('i');
    i.classList.add('fa', 'fa-fast-forward');
    button.node.appendChild(i);

    panel.toolbar.insertItem(0, 'runAll', button);
    return new DisposableDelegate(() => {
      button.dispose();
    });
  }
}

/**
 * Activate the extension.
 */
function activate(app: JupyterLab) {
  app.docRegistry.addWidgetExtension('Notebook', new ButtonExtension());
};


/**
 * Export the plugin as default.
 */
export default plugin;
```

Run the following commands:

```
npm run build
jupyter labextension link .
jupyter lab
```

Open a notebook and observe the new "Run All" button.


### The *ipywidgets* third party extension

This discussion will be a bit confusing since we've been using the term **widget**
to refer to **phosphor widgets**. In the discussion below, *ipython widgets*
will be referred to as *ipywidgets*. There is no intrinsic relation between
**phosphor widgets** and *ipython widgets*.

The *ipywidgets* extension registers a factory for a notebook **widget** extension
using the [Document Registry](http://jupyterlab.github.io/jupyterlab/classes/_docregistry_src_registry_.documentregistry.html).
The `createNew()` function is called with a NotebookPanel and [DocumentContext]
(http://jupyterlab.github.io/jupyterlab/interfaces/_docregistry_src_registry_.documentregistry.icontext.html).
The plugin then creates a ipywidget manager (which uses the context to
interact the kernel and kernel's comm manager). The plugin then registers an
ipywidget renderer with the notebook instance's rendermime (which is specific
to that particular notebook).

When an ipywidget model is created in the kernel, a comm message is sent to
the browser and handled by the ipywidget manager to create a browser-side
ipywidget model. When the model is displayed in the kernel, a `display_data`
output is sent to the browser with the ipywidget model id. The renderer
registered in that notebook's rendermime is asked to render the output. The
renderer asks the ipywidget manager instance to render the corresponding
model, which returns a JavaScript promise. The renderer creates a container
**phosphor widget** which it hands back synchronously to the
OutputArea, and then fills the container with the rendered *ipywidget*
when the promise resolves.

Note: The ipywidgets third party extension has not yet been released.
