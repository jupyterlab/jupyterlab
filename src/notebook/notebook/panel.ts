// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel
} from 'jupyter-js-services';

import {
  MimeData as IClipboard
} from 'phosphor-dragdrop';

import {
  Panel, PanelLayout
} from 'phosphor-panel';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';

import {
  showDialog
} from '../../dialog';

import {
  IDocumentContext
} from '../../docregistry';

import {
  RenderMime
} from '../../rendermime';

import {
  CellEditorWidget, ITextChange, ICompletionRequest
} from '../cells/editor';

import {
  CompletionWidget, CompletionModel
} from '../completion';

import {
  INotebookModel
} from './model';

import {
  NotebookToolbar
} from './toolbar';

import {
  Notebook
} from './widget';


/**
 * The class name added to notebook panels.
 */
const NB_PANEL = 'jp-Notebook-panel';

/**
 * The class name added to notebook container widgets.
 */
const NB_CONTAINER = 'jp-Notebook-container';

/**
 * The class name added to a dirty widget.
 */
const DIRTY_CLASS = 'jp-mod-dirty';


/**
 * A widget that hosts a notebook toolbar and content area.
 *
 * #### Notes
 * The widget keeps the document metadata in sync with the current
 * kernel on the context.
 */
export
class NotebookPanel extends Widget {
  /**
   * Construct a new notebook panel.
   */
  constructor(options: NotebookPanel.IOptions) {
    super();
    this.addClass(NB_PANEL);
    this._rendermime = options.rendermime;
    this._clipboard = options.clipboard;
    this._renderer = options.renderer || NotebookPanel.defaultRenderer;

    this.layout = new PanelLayout();
    let rendermime = this._rendermime;
    this._content = this._renderer.createContent({ rendermime });
    this._toolbar = this._renderer.createToolbar();

    let container = new Panel();
    container.addClass(NB_CONTAINER);
    container.addChild(this._content);

    let layout = this.layout as PanelLayout;
    layout.addChild(this._toolbar);
    layout.addChild(container);

    // Instantiate tab completion widget.
    this._completion = this._renderer.createCompletion();
    this._completion.reference = this;
    this._completion.attach(document.body);
    this._completion.selected.connect(this.onCompletionSelected, this);

    // Connect signals.
    this._content.stateChanged.connect(this.onContentStateChanged, this);
    let cell = this._content.childAt(this._content.activeCellIndex);
    if (cell) {
      let editor = cell.editor;
      editor.textChanged.connect(this.onTextChanged, this);
      editor.completionRequested.connect(this.onCompletionRequested, this);
    }
  }

  /**
   * A signal emitted when the panel context changes.
   */
  get contextChanged(): ISignal<NotebookPanel, void> {
    return Private.contextChangedSignal.bind(this);
  }

  /**
   * Get the toolbar used by the widget.
   */
  get toolbar(): NotebookToolbar {
    return this._toolbar;
  }

  /**
   * Get the content area used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get content(): Notebook {
    return this._content;
  }

  /**
   * Get the rendermime instance used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get rendermime(): RenderMime<Widget> {
    return this._rendermime;
  }

  /**
   * Get the renderer used by the widget.
   */
  get renderer(): NotebookPanel.IRenderer {
    return this._renderer;
  }

  /**
   * Get the clipboard instance used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get clipboard(): IClipboard {
    return this._clipboard;
  }

  /**
   * Get the model used by the widget.
   *
   * #### Notes
   * This is a read-only property.  Changing the model on the `content`
   * directly would result in undefined behavior.
   */
  get model(): INotebookModel {
    return this._content.model;
  }

  /**
   * The document context for the widget.
   *
   * #### Notes
   * Changing the context also changes the model on the
   * `content`.
   */
  get context(): IDocumentContext {
    return this._context;
  }
  set context(newValue: IDocumentContext) {
    newValue = newValue || null;
    if (newValue === this._context) {
      return;
    }
    let oldValue = this._context;
    this._context = newValue;
    // Trigger private, protected, and public changes.
    this._onContextChanged(oldValue, newValue);
    this.onContextChanged(oldValue, newValue);
    this.contextChanged.emit(void 0);
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._context = null;
    this._rendermime = null;
    this._content = null;
    this._toolbar = null;
    this._clipboard = null;
    this._completion.dispose();
    this._completion = null;
    this._renderer = null;
    super.dispose();
  }

  /**
   * Restart the kernel on the panel.
   */
  restart(): Promise<boolean> {
    if (!this.context) {
      return;
    }
    let kernel = this.context.kernel;
    if (!kernel) {
      return Promise.resolve(false);
    }
    return showDialog({
      title: 'Restart Kernel?',
      body: 'Do you want to restart the current kernel? All variables will be lost.',
      host: this.node
    }).then(result => {
      if (result.text === 'OK') {
        return kernel.restart().then(() => { return true; });
      } else {
        return false;
      }
    });
  }


  /**
   * Handle a change to the document context.
   *
   * #### Notes
   * The default implementation is a no-op.
   */
  protected onContextChanged(oldValue: IDocumentContext, newValue: IDocumentContext): void { }

  /**
   * Handle a change in the kernel by updating the document metadata.
   */
  protected onKernelChanged(context: IDocumentContext, kernel: IKernel): void {
    if (!this.model) {
      return;
    }
    kernel.kernelInfo().then(info => {
      let infoCursor = this.model.getMetadata('language_info');
      infoCursor.setValue(info.language_info);
    });
    kernel.getKernelSpec().then(spec => {
      let specCursor = this.model.getMetadata('kernelspec');
      specCursor.setValue({
        name: kernel.name,
        display_name: spec.display_name,
        language: spec.language
      });
    });
  }

  /**
   * Handle a change in the model state.
   */
  protected onModelStateChanged(sender: INotebookModel, args: IChangedArgs<any>): void {
    if (args.name === 'dirty') {
      if (args.newValue) {
        this.title.className += ` ${DIRTY_CLASS}`;
      } else {
        this.title.className = this.title.className.replace(DIRTY_CLASS, '');
      }
    }
  }

  /**
   * Handle a change to the document path.
   */
  protected onPathChanged(sender: IDocumentContext, path: string): void {
    this.title.text = path.split('/').pop();
  }

  /**
   * Handle a state change in the content area.
   */
  protected onContentStateChanged(sender: Notebook, args: IChangedArgs<any>): void {
    switch (args.name) {
    case 'activeCellIndex':
      let cell = this._content.childAt(args.oldValue);
      let editor = cell.editor;
      editor.textChanged.disconnect(this.onTextChanged, this);
      editor.completionRequested.disconnect(this.onCompletionRequested, this);

      cell = this._content.childAt(args.newValue);
      editor = cell.editor;
      editor.textChanged.connect(this.onTextChanged, this);
      editor.completionRequested.connect(this.onCompletionRequested, this);
      break;
    default:
      break;
    }
  }

  /**
   * Handle a text changed signal from an editor.
   */
  protected onTextChanged(editor: CellEditorWidget, change: ITextChange): void {
    if (!this.model) {
      return;
    }
    let line = change.newValue.split('\n')[change.line];
    let model = this._completion.model;
    // If last character entered is not whitespace, update completion.
    if (line[change.ch - 1] && line[change.ch - 1].match(/\S/)) {
      // If there is currently a completion
      if (model.original) {
        model.current = change;
      }
    } else {
      // If final character is whitespace, reset completion.
      model.options = null;
      model.original = null;
      model.cursor = null;
      return;
    }
  }

  /**
   * Handle a completion requested signal from an editor.
   */
  protected onCompletionRequested(editor: CellEditorWidget, change: ICompletionRequest): void {
    if (!this.model || !this.context) {
      return;
    }
    let kernel = this.context.kernel;
    if (!kernel) {
      return;
    }
    let contents = {
      // Only send the current line of code for completion.
      code: change.currentValue.split('\n')[change.line],
      cursor_pos: change.ch
    };
    let pendingComplete = ++this._pendingComplete;
    let model = this._completion.model;
    kernel.complete(contents).then(value => {
      // If model has been disposed, bail.
      if (model.isDisposed) {
        return;
      }
      // If a newer completion requesy has created a pending request, bail.
      if (pendingComplete !== this._pendingComplete) {
        return;
      }
      // Completion request failures or negative results fail silently.
      if (value.status !== 'ok') {
        return;
      }
      // Update the model.
      model.options = value.matches;
      model.cursor = { start: value.cursor_start, end: value.cursor_end };
    }).then(() => {
      model.original = change;
    });
  }

  /**
   * Handle a completion selected signal from the completion widget.
   */
  protected onCompletionSelected(widget: CompletionWidget, value: string): void {
    if (!this.model) {
      return;
    }
    let patch = this._completion.model.createPatch(value);
    let cell = this._content.childAt(this._content.activeCellIndex);
    let editor = cell.editor.editor;
    let doc = editor.getDoc();
    doc.setValue(patch.text);
    doc.setCursor(doc.posFromIndex(patch.position));
  }

  /**
   * Handle a change in the context.
   */
  private _onContextChanged(oldValue: IDocumentContext, newValue: IDocumentContext): void {
    if (oldValue) {
      oldValue.kernelChanged.disconnect(this.onKernelChanged, this);
      oldValue.pathChanged.disconnect(this.onPathChanged, this);
      if (oldValue.model) {
        oldValue.model.stateChanged.disconnect(this.onModelStateChanged, this);
      }
    }
    let context = newValue;
    context.kernelChanged.connect(this.onKernelChanged, this);
    if (context.kernel) {
      this.onKernelChanged(this._context, this._context.kernel);
    }
    this._content.model = newValue.model as INotebookModel;

    // Handle the document title.
    this.title.text = context.path.split('/').pop();
    context.pathChanged.connect(this.onPathChanged, this);

    // Handle changes to dirty state.
    context.model.stateChanged.connect(this.onModelStateChanged, this);
  }

  private _rendermime: RenderMime<Widget> = null;
  private _context: IDocumentContext = null;
  private _content: Notebook = null;
  private _toolbar: NotebookToolbar = null;
  private _clipboard: IClipboard = null;
  private _completion: CompletionWidget = null;
  private _pendingComplete = 0;
  private _renderer: NotebookPanel.IRenderer = null;
}


/**
 * A namespace for `NotebookPanel` statics.
 */
export namespace NotebookPanel {
  /**
   * An options interface for NotebookPanels.
   */
  export
  interface IOptions {
    /**
     * The rendermime instance used by the panel.
     */
    rendermime: RenderMime<Widget>;

    /**
     * The application clipboard.
     */
    clipboard: IClipboard;

    /**
     * The content renderer for the panel.
     *
     * The default is a shared `IRenderer` instance.
     */
    renderer?: IRenderer;
  }

  /**
   * A renderer interface for NotebookPanels.
   */
  export
  interface IRenderer {
    /**
     * Create a new content area for the panel.
     */
    createContent(options: Notebook.IOptions): Notebook;

    /**
     * Create a new toolbar for the panel.
     */
    createToolbar(): NotebookToolbar;

    /**
     * Create a new completion widget for the panel.
     */
    createCompletion(): CompletionWidget;
  }

  /**
   * The default implementation of an `IRenderer`.
   */
  export
  class Renderer {
    /**
     * Create a new content area for the panel.
     */
    createContent(options: Notebook.IOptions): Notebook {
      return new Notebook(options);
    }

    /**
     * Create a new toolbar for the panel.
     */
    createToolbar(): NotebookToolbar {
      return new NotebookToolbar();
    }

    /**
     * Create a new completion widget.
     */
    createCompletion(): CompletionWidget {
      let model = new CompletionModel();
      return new CompletionWidget(model);
    }
  }

  /**
   * The shared default instance of a `Renderer`.
   */
   export
   const defaultRenderer = new Renderer();
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * A signal emitted when the panel context changes.
   */
  export
  const contextChangedSignal = new Signal<NotebookPanel, void>();
}
