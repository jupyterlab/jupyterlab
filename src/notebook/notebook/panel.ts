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
  IDocumentContext
} from '../../docregistry';

import {
  RenderMime
} from '../../rendermime';

import {
  CompletionWidget, CompletionModel, CellCompletionHandler
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
    let toolbar = this._renderer.createToolbar();

    let container = new Panel();
    container.addClass(NB_CONTAINER);
    container.addChild(this._content);

    let layout = this.layout as PanelLayout;
    layout.addChild(toolbar);
    layout.addChild(container);

    this._completion = this._renderer.createCompletion();
    // The completion widget's anchor node is the node whose scrollTop is
    // pegged to the completion widget's position.
    this._completion.anchor = container.node;
    this._completion.attach(document.body);

    this._completionHandler = new CellCompletionHandler(this._completion);
    this._completionHandler.activeCell = this._content.activeCell;
    this._content.activeCellChanged.connect((s, cell) => {
      this._completionHandler.activeCell = cell;
    });
  }

  /**
   * A signal emitted when the panel context changes.
   */
  get contextChanged(): ISignal<NotebookPanel, void> {
    return Private.contextChangedSignal.bind(this);
  }

  /**
   * A signal emitted when the kernel used by the panel changes.
   */
  get kernelChanged(): ISignal<NotebookPanel, IKernel> {
    return Private.kernelChangedSignal.bind(this);
  }

  /**
   * Get the toolbar used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get toolbar(): NotebookToolbar {
    return (this.layout as PanelLayout).childAt(0) as NotebookToolbar;
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
   * Get the current kernel used by the panel.
   *
   * #### Notes
   * This is a a read-only property.
   */
  get kernel(): IKernel {
    return this._context ? this._context.kernel : null;
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
   * The model for the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get model(): INotebookModel {
    return this._content ? this._content.model : null;
  }

  /**
   * The document context for the widget.
   *
   * #### Notes
   * Changing the context also changes the model on the
   * `content`.
   */
  get context(): IDocumentContext<INotebookModel> {
    return this._context;
  }
  set context(newValue: IDocumentContext<INotebookModel>) {
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
    this._content = null;
    this._rendermime = null;
    this._clipboard = null;
    this._completionHandler.dispose();
    this._completionHandler = null;
    this._completion.dispose();
    this._completion = null;
    this._renderer = null;
    super.dispose();
  }

  /**
   * Handle a change to the document context.
   *
   * #### Notes
   * The default implementation is a no-op.
   */
  protected onContextChanged(oldValue: IDocumentContext<INotebookModel>, newValue: IDocumentContext<INotebookModel>): void { }


  /**
   * Handle a change in the model state.
   */
  protected onModelStateChanged(sender: INotebookModel, args: IChangedArgs<any>): void {
    if (args.name === 'dirty') {
      this._handleDirtyState();
    }
  }

  /**
   * Handle a change to the document path.
   */
  protected onPathChanged(sender: IDocumentContext<INotebookModel>, path: string): void {
    this.title.text = path.split('/').pop();
  }

  /**
   * Handle a context population.
   */
  protected onPopulated(sender: IDocumentContext<INotebookModel>, args: void): void {
    // Clear the undo state of the cells.
    if (sender.model) {
      sender.model.cells.clearUndo();
    }
  }

  /**
   * Handle a change in the context.
   */
  private _onContextChanged(oldValue: IDocumentContext<INotebookModel>, newValue: IDocumentContext<INotebookModel>): void {
    if (oldValue) {
      oldValue.kernelChanged.disconnect(this._onKernelChanged, this);
      oldValue.pathChanged.disconnect(this.onPathChanged, this);
      oldValue.populated.disconnect(this.onPopulated, this);
      if (oldValue.model) {
        oldValue.model.stateChanged.disconnect(this.onModelStateChanged, this);
      }
    }
    let context = newValue;
    context.kernelChanged.connect(this._onKernelChanged, this);
    let oldKernel = oldValue ? oldValue.kernel : null;
    if (context.kernel !== oldKernel) {
      this._onKernelChanged(this._context, this._context.kernel);
    }
    this._content.model = newValue.model;
    this._handleDirtyState();
    newValue.model.stateChanged.connect(this.onModelStateChanged, this);
    if (newValue.isPopulated) {
      this.onPopulated(newValue, void 0);
    } else {
      newValue.populated.connect(this.onPopulated, this);
    }
    // Handle the document title.
    this.onPathChanged(context, context.path);
    context.pathChanged.connect(this.onPathChanged, this);
  }

  /**
   * Handle a change in the kernel by updating the document metadata.
   */
  private _onKernelChanged(context: IDocumentContext<INotebookModel>, kernel: IKernel): void {
    if (!this.model || !kernel) {
      return;
    }
    kernel.kernelInfo().then(msg => {
      let infoCursor = this.model.getMetadata('language_info');
      infoCursor.setValue(msg.content.language_info);
    });
    kernel.getKernelSpec().then(spec => {
      let specCursor = this.model.getMetadata('kernelspec');
      specCursor.setValue({
        name: kernel.name,
        display_name: spec.display_name,
        language: spec.language
      });
    });
    this._completionHandler.kernel = kernel;
    this.kernelChanged.emit(kernel);
  }

  /**
   * Handle the dirty state of the model.
   */
  private _handleDirtyState(): void {
    if (!this.model) {
      return;
    }
    if (this.model.dirty) {
      this.title.className += ` ${DIRTY_CLASS}`;
    } else {
      this.title.className = this.title.className.replace(DIRTY_CLASS, '');
    }
  }

  private _rendermime: RenderMime<Widget> = null;
  private _context: IDocumentContext<INotebookModel> = null;
  private _clipboard: IClipboard = null;
  private _content: Notebook = null;
  private _renderer: NotebookPanel.IRenderer = null;
  private _completion: CompletionWidget = null;
  private _completionHandler: CellCompletionHandler = null;
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
  class Renderer implements IRenderer {
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
      return new CompletionWidget({ model });
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

  /**
   * A signal emitted when the kernel used by the panel changes.
   */
  export
  const kernelChangedSignal = new Signal<NotebookPanel, IKernel>();
}
