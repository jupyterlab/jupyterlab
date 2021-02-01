Notebook
========

Background
----------

.. _architecture-walkthrough:

A JupyterLab architecture walkthrough from June 16, 2016, provides an overview of the notebook architecture.

.. raw:: html

  <div class="jp-youtube-video">
     <iframe src="https://www.youtube-nocookie.com/embed/4Qm6oD_Rlw8?rel=0&amp;showinfo=0&amp;start=3326" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  </div>


The most complicated plugin included in the **JupyterLab application**
is the **Notebook plugin**.

The
`NotebookWidgetFactory <../api/classes/notebook.notebookwidgetfactory-1.html>`__
constructs a new
`NotebookPanel <../api/classes/notebook.notebookpanel-1.html>`__
from a model and populates the toolbar with default widgets.

Structure of the Notebook plugin
--------------------------------

The Notebook plugin provides a model and widgets for dealing with
notebook files.

Model
^^^^^

The
`NotebookModel <../api/classes/notebook.notebookmodel-1.html>`__
contains an observable list of cells.

A `cell
model <../api/classes/cells.cellmodel-1.html>`__
can be:

-  a code cell
-  a markdown cell
-  raw cell

A code cell contains a list of **output models**. The list of cells and
the list of outputs can be observed for changes.

Cell operations
"""""""""""""""

The NotebookModel cell list supports single-step operations such as
moving, adding, or deleting cells. Compound cell list operations, such
as undo/redo, are also supported by the NotebookModel. Right now,
undo/redo is only supported on cells and is not supported on notebook
attributes, such as notebook metadata. Currently, undo/redo for
individual cell input content is supported by the CodeMirror editor's
undo feature. (Note: CodeMirror editor's undo does not cover cell
metadata changes.)

Metadata
""""""""

The notebook model and the cell model (i.e. notebook cells) support
getting and setting metadata through an
`IObservableJSON <../api/modules/observables.iobservablejson.html>`__
object. You can use this to get and set notebook/cell metadata,
as well as subscribe to changes to it.

Notebook widget
^^^^^^^^^^^^^^^

After the NotebookModel is created, the NotebookWidgetFactory constructs
a new NotebookPanel from the model. The NotebookPanel widget is added to
the DockPanel. The **NotebookPanel** contains:

-  a
   `Toolbar <../api/classes/apputils.toolbar-1.html>`__
-  a `Notebook
   widget <../api/classes/notebook.notebook-2.html>`__.

The NotebookPanel also adds completion logic.

The **NotebookToolbar** maintains a list of widgets to add to the
toolbar. The **Notebook widget** contains the rendering of the notebook
and handles most of the interaction logic with the notebook itself (such
as keeping track of interactions such as selected and active cells and
also the current edit/command mode).

The NotebookModel cell list provides ways to do fine-grained changes to
the cell list.

Higher level actions using NotebookActions
""""""""""""""""""""""""""""""""""""""""""

Higher-level actions are contained in the
`NotebookActions <../api/classes/notebook.notebookactions-1.html>`__
namespace, which has functions, when given a notebook widget, to run a
cell and select the next cell, merge or split cells at the cursor,
delete selected cells, etc.

Widget hierarchy
""""""""""""""""

A Notebook widget contains a list of `cell
widgets <../api/classes/cells.cell-1.html>`__,
corresponding to the cell models in its cell list.

-  Each cell widget contains an
   `InputArea <../api/classes/cells.inputarea-1.html>`__,

   -  which contains n
      `CodeEditorWrapper <../api/classes/codeeditor.codeeditorwrapper-1.html>`__,

      -  which contains a JavaScript CodeMirror instance.

A
`CodeCell <../api/classes/cells.codecell-1.html>`__
also contains an
`OutputArea <../api/classes/outputarea.outputarea-2.html>`__.
An OutputArea is responsible for rendering the outputs in the
`OutputAreaModel <../api/classes/outputarea.outputareamodel-1.html>`__
list. An OutputArea uses a notebook-specific
`RenderMimeRegistry <../api/classes/rendermime.rendermimeregistry-1.html>`__
object to render ``display_data`` output messages.

Rendering output messages
"""""""""""""""""""""""""

A **Rendermime plugin** provides a pluggable system for rendering output
messages. Default renderers are provided for markdown, html, images,
text, etc. Extensions can register renderers to be used across the
entire application by registering a handler and mimetype in the
rendermime registry. When a notebook is created, it copies the global
Rendermime singleton so that notebook-specific renderers can be added.
The ipywidgets widget manager is an example of an extension that adds a
notebook-specific renderer, since rendering a widget depends on
notebook-specific widget state.

.. _extend-notebook-plugin:

How to extend the Notebook plugin
---------------------------------

We'll walk through two notebook extensions:

-  adding a button to the toolbar
-  adding an ipywidgets extension

Adding a button to the toolbar
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Start from the cookie cutter extension template.

::

    pip install cookiecutter
    cookiecutter https://github.com/jupyterlab/extension-cookiecutter-ts
    cd my_cookie_cutter_name

Install the dependencies. Note that extensions are built against the
released npm packages, not the development versions.

::

    npm install --save @jupyterlab/notebook @jupyterlab/application @jupyterlab/apputils @jupyterlab/docregistry @lumino/disposable --legacy-peer-deps

Copy the following to ``src/index.ts``:

.. code:: typescript

    import {
      IDisposable, DisposableDelegate
    } from '@lumino/disposable';

    import {
      JupyterFrontEnd, JupyterFrontEndPlugin
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
    const plugin: JupyterFrontEndPlugin<void> = {
      activate,
      id: 'my-extension-name:buttonPlugin',
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
          NotebookActions.runAll(panel.content, context.sessionContext);
        };
        let button = new ToolbarButton({
          className: 'myButton',
          iconClass: 'fa fa-fast-forward',
          onClick: callback,
          tooltip: 'Run All'
        });

        panel.toolbar.insertItem(0, 'runAll', button);
        return new DisposableDelegate(() => {
          button.dispose();
        });
      }
    }

    /**
     * Activate the extension.
     */
    function activate(app: JupyterFrontEnd) {
      app.docRegistry.addWidgetExtension('Notebook', new ButtonExtension());
    };


    /**
     * Export the plugin as default.
     */
    export default plugin;


And the following to ``style/base.css``:

.. code:: css

  .myButton.jp-Button.minimal .jp-Icon {
      color: black;
  }


Run the following commands:

::

    pip install -e .
    pip install jupyter_packaging
    jupyter labextension develop . --overwrite
    jupyter lab

Open a notebook and observe the new "Run All" button.

The *ipywidgets* third party extension
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

This discussion will be a bit confusing since we've been using the term
*widget* to refer to *lumino widgets*. In the discussion below,
*ipython widgets* will be referred to as *ipywidgets*. There is no
intrinsic relation between *lumino widgets* and *ipython widgets*.

The *ipywidgets* extension registers a factory for a notebook *widget*
extension using the `Document
Registry <../api/classes/docregistry.documentregistry-1.html>`__.
The ``createNew()`` function is called with a NotebookPanel and
`DocumentContext <../api/interfaces/docregistry.documentregistry.icontext.html>`__.
The plugin then creates a ipywidget manager (which uses the context to
interact the kernel and kernel's comm manager). The plugin then
registers an ipywidget renderer with the notebook instance's rendermime
(which is specific to that particular notebook).

When an ipywidget model is created in the kernel, a comm message is sent
to the browser and handled by the ipywidget manager to create a
browser-side ipywidget model. When the model is displayed in the kernel,
a ``display_data`` output is sent to the browser with the ipywidget
model id. The renderer registered in that notebook's rendermime is asked
to render the output. The renderer asks the ipywidget manager instance
to render the corresponding model, which returns a JavaScript promise.
The renderer creates a container *lumino widget* which it hands back
synchronously to the OutputArea, and then fills the container with the
rendered *ipywidget* when the promise resolves.
