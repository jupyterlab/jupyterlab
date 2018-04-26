
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel, KernelMessage
} from '@jupyterlab/services';

import {
  each
} from '@phosphor/algorithm';

import {
  PromiseDelegate, Token
} from '@phosphor/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  BoxLayout, Widget
} from '@phosphor/widgets';

import {
  IClientSession, Toolbar
} from '@jupyterlab/apputils';

import {
  IEditorMimeTypeService
} from '@jupyterlab/codeeditor';

import {
  IChangedArgs, PathExt
} from '@jupyterlab/coreutils';

import {
  DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  RenderMimeRegistry
} from '@jupyterlab/rendermime';

import {
  INotebookModel
} from './model';

import {
  Notebook, StaticNotebook
} from './widget';


/**
 * The class name added to notebook panels.
 */
const NOTEBOOK_PANEL_CLASS = 'jp-NotebookPanel';

const NOTEBOOK_PANEL_TOOLBAR_CLASS = 'jp-NotebookPanel-toolbar';

const NOTEBOOK_PANEL_NOTEBOOK_CLASS = 'jp-NotebookPanel-notebook';

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
class NotebookPanel extends Widget implements DocumentRegistry.IReadyWidget {
  /**
   * Construct a new notebook panel.
   */
  constructor(options: NotebookPanel.IOptions) {
    super();
    this.addClass(NOTEBOOK_PANEL_CLASS);
    this.rendermime = options.rendermime;
    let contentFactory = this.contentFactory = (
      options.contentFactory || NotebookPanel.defaultContentFactory
    );

    let layout = this.layout = new BoxLayout();

    // Toolbar
    let toolbar = new Toolbar();
    toolbar.addClass(NOTEBOOK_PANEL_TOOLBAR_CLASS);

    // Notebook
    let nbOptions: Notebook.IOptions = {
      rendermime: this.rendermime,
      languagePreference: options.languagePreference,
      contentFactory: contentFactory,
      mimeTypeService: options.mimeTypeService,
      editorConfig: options.editorConfig,
    };
    let notebook = this.notebook = contentFactory.createNotebook(nbOptions);
    notebook.addClass(NOTEBOOK_PANEL_NOTEBOOK_CLASS);

    layout.addWidget(toolbar);
    layout.addWidget(this.notebook);

    BoxLayout.setStretch(toolbar, 0);
    BoxLayout.setStretch(this.notebook, 1);
  }

  /**
   * A signal emitted when the panel has been activated.
   */
  get activated(): ISignal<this, void> {
    return this._activated;
  }

  /**
   * A signal emitted when the panel context changes.
   */
  get contextChanged(): ISignal<this, void> {
    return this._contextChanged;
  }

  /**
   * The client session used by the panel.
   */
  get session(): IClientSession {
    return this._context ? this._context.session : null;
  }

  /**
   * A promise that resolves when the notebook panel is ready.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * The factory used by the widget.
   */
  readonly contentFactory: NotebookPanel.IContentFactory;

  /**
   * The Rendermime instance used by the widget.
   */
  readonly rendermime: RenderMimeRegistry;

  /**
   * The notebook used by the widget.
   */
  readonly notebook: Notebook;

  /**
   * Get the toolbar used by the widget.
   */
  get toolbar(): Toolbar<Widget> {
    return (this.layout as BoxLayout).widgets[0] as Toolbar<Widget>;
  }

  /**
   * The model for the widget.
   */
  get model(): INotebookModel {
    return this.notebook ? this.notebook.model : null;
  }

  /**
   * The document context for the widget.
   *
   * #### Notes
   * Changing the context also changes the model on the
   * `content`.
   */
  get context(): DocumentRegistry.IContext<INotebookModel> {
    return this._context;
  }
  set context(newValue: DocumentRegistry.IContext<INotebookModel>) {
    newValue = newValue || null;
    if (newValue === this._context) {
      return;
    }
    let oldValue = this._context;
    this._context = newValue;
    // Trigger private, protected, and public changes.
    this._onContextChanged(oldValue, newValue);
    this.onContextChanged(oldValue, newValue);
    this._contextChanged.emit(void 0);

    if (!oldValue) {
      newValue.ready.then(() => {
        if (this.notebook.widgets.length === 1) {
          let model = this.notebook.widgets[0].model;
          if (model.type === 'code' && model.value.text === '') {
            this.notebook.mode = 'edit';
          }
        }
        this._ready.resolve(undefined);
      });
    }
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    this._context = null;
    this.notebook.dispose();
    super.dispose();
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the notebook's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
    case 'mouseup':
    case 'mouseout':
      let target = event.target as HTMLElement;
      if (this.toolbar.node.contains(document.activeElement) &&
          target.tagName !== 'SELECT') {
        this.notebook.node.focus();
      }
      break;
    default:
      break;
    }
  }

  /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    this.toolbar.node.addEventListener('mouseup', this);
    this.toolbar.node.addEventListener('mouseout', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.toolbar.node.removeEventListener('mouseup', this);
    this.toolbar.node.removeEventListener('mouseout', this);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.notebook.activate();
    this._activated.emit(void 0);
  }

  /**
   * Handle a change to the document context.
   *
   * #### Notes
   * The default implementation is a no-op.
   */
  protected onContextChanged(oldValue: DocumentRegistry.IContext<INotebookModel>, newValue: DocumentRegistry.IContext<INotebookModel>): void {
    // This is a no-op.
  }


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
  protected onPathChanged(sender: DocumentRegistry.IContext<INotebookModel>, path: string): void {
    this.title.label = PathExt.basename(sender.localPath);
  }

  /**
   * Handle a change in the context.
   */
  private _onContextChanged(oldValue: DocumentRegistry.IContext<INotebookModel>, newValue: DocumentRegistry.IContext<INotebookModel>): void {
    if (oldValue) {
      oldValue.pathChanged.disconnect(this.onPathChanged, this);
      oldValue.session.kernelChanged.disconnect(this._onKernelChanged, this);
      if (oldValue.model) {
        oldValue.model.stateChanged.disconnect(this.onModelStateChanged, this);
      }
    }
    if (!newValue) {
      this._onKernelChanged(null, null);
      return;
    }
    let context = newValue;
    this.notebook.model = newValue.model;
    this._handleDirtyState();
    newValue.model.stateChanged.connect(this.onModelStateChanged, this);
    context.session.kernelChanged.connect(this._onKernelChanged, this);

    // Clear the cells when the context is initially populated.
    if (!newValue.isReady) {
      newValue.ready.then(() => {
        if (this.isDisposed) {
          return;
        }
        let model = newValue.model;
        // Clear the undo state of the cells.
        if (model) {
          model.cells.clearUndo();
          each(this.notebook.widgets, widget => {
            widget.editor.clearHistory();
          });
        }
      });
    }

    // Handle the document title.
    this.onPathChanged(context, context.path);
    context.pathChanged.connect(this.onPathChanged, this);
  }

  /**
   * Handle a change in the kernel by updating the document metadata.
   */
  private _onKernelChanged(sender: any, kernel: Kernel.IKernelConnection): void {
    if (!this.model || !kernel) {
      return;
    }
    kernel.ready.then(() => {
      if (this.model) {
        this._updateLanguage(kernel.info.language_info);
      }
    });
    this._updateSpec(kernel);
  }

  /**
   * Update the kernel language.
   */
  private _updateLanguage(language: KernelMessage.ILanguageInfo): void {
    this.model.metadata.set('language_info', language);
  }

  /**
   * Update the kernel spec.
   */
  private _updateSpec(kernel: Kernel.IKernelConnection): void {
    kernel.getSpec().then(spec => {
      if (this.isDisposed) {
        return;
      }
      this.model.metadata.set('kernelspec', {
        name: kernel.name,
        display_name: spec.display_name,
        language: spec.language
      });
    });
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

  private _context: DocumentRegistry.IContext<INotebookModel> = null;
  private _activated = new Signal<this, void>(this);
  private _contextChanged = new Signal<this, void>(this);
  private _ready = new PromiseDelegate<void>();
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
    rendermime: RenderMimeRegistry;

    /**
     * The language preference for the model.
     */
    languagePreference?: string;

    /**
     * The content factory for the panel.
     */
    contentFactory?: IContentFactory;

    /**
     * The mimeType service.
     */
    mimeTypeService: IEditorMimeTypeService;

    /**
     * The notebook cell editor configuration.
     */
    editorConfig?: StaticNotebook.IEditorConfig;
  }

  /**
   * A content factory interface for NotebookPanel.
   */
  export
  interface IContentFactory extends Notebook.IContentFactory {
    /**
     * Create a new content area for the panel.
     */
    createNotebook(options: Notebook.IOptions): Notebook;

  }

  /**
   * The default implementation of an `IContentFactory`.
   */
  export
  class ContentFactory extends Notebook.ContentFactory implements IContentFactory {
    /**
     * Create a new content area for the panel.
     */
    createNotebook(options: Notebook.IOptions): Notebook {
      return new Notebook(options);
    }
  }

  /**
   * Default content factory for the notebook panel.
   */
  export
  const defaultContentFactory: ContentFactory = new ContentFactory();

  /* tslint:disable */
  /**
   * The notebook renderer token.
   */
  export
  const IContentFactory = new Token<IContentFactory>('@jupyterlab/notebook:IContentFactory');
  /* tslint:enable */
}
