
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
  IClientSession
} from '@jupyterlab/apputils';

import {
  IEditorMimeTypeService
} from '@jupyterlab/codeeditor';

import {
  IChangedArgs
} from '@jupyterlab/coreutils';

import {
  DocumentWidget
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
class NotebookPanel extends DocumentWidget<Notebook, INotebookModel> {
  /**
   * Construct a new notebook panel.
   */
  constructor(options: NotebookPanel.IOptions) {
    // Set default options
    const notebookReady = new PromiseDelegate<void>();
    options.ready = Promise.all([options.ready, notebookReady.promise]).then(() => { return; });

    // Notebook
    if (!options.content) {
      let contentFactory = options.contentFactory = (
        options.contentFactory || NotebookPanel.defaultContentFactory
      );
      let nbOptions: Notebook.IOptions = {
        rendermime: options.rendermime,
        languagePreference: options.languagePreference,
        contentFactory: contentFactory,
        mimeTypeService: options.mimeTypeService,
        editorConfig: options.editorConfig,
      };
      options.content = contentFactory.createNotebook(nbOptions);
    }

    super(options);
    this._activated = new Signal<this, void>(this);

    this.addClass(NOTEBOOK_PANEL_CLASS);
    this.rendermime = options.rendermime;

    // Toolbar
    this.toolbar.addClass(NOTEBOOK_PANEL_TOOLBAR_CLASS);

    // Notebook
    this.content.addClass(NOTEBOOK_PANEL_NOTEBOOK_CLASS);

    // Set up things related to the context
    this.content.model = this.context.model;
    this._handleDirtyState();
    this.context.model.stateChanged.connect(this.onModelStateChanged, this);
    this.context.session.kernelChanged.connect(this._onKernelChanged, this);

    this.context.ready.then(() => {
      if (this.isDisposed) {
        return;
      }
      let model = this.context.model;

      // TODO: this logic is being called too soon - the cells aren't available yet, and the widgets aren't created.
      // Clear the undo state of the cells.
      if (model) {
        model.cells.clearUndo();
        each(this.content.widgets, widget => {
          widget.editor.clearHistory();
        });
      }

      // If we have just a single empty code cell, change the notebook mode to
      // edit mode. This happens for example when we have a new notebook.
      if (this.content.widgets.length === 1) {
        let cellModel = this.content.widgets[0].model;
        if (cellModel.type === 'code' && cellModel.value.text === '') {
          this.content.mode = 'edit';
        }
      }

      // The notebook widget is now ready to be shown.
      notebookReady.resolve(undefined);
    });

  }

  /**
   * A signal emitted when the panel has been activated.
   */
  get activated(): ISignal<this, void> {
    return this._activated;
  }

  /**
   * The client session used by the panel.
   */
  get session(): IClientSession {
    return this.context ? this.context.session : null;
  }

  /**
   * A convenience method to access the notebook.
   *
   * TODO: deprecate this in favor of the .content attribute
   */
  get notebook(): Notebook {
    return this.content;
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
  readonly content: Notebook;

  /**
   * The model for the widget.
   */
  get model(): INotebookModel {
    return this.content ? this.content.model : null;
  }


  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    this.content.dispose();
    super.dispose();
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    super.onActivateRequest(msg);

    // TODO: do we still need to emit this signal? Who is using it?
    this._activated.emit(void 0);
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

  private _activated: Signal<this, void>;
}


/**
 * A namespace for `NotebookPanel` statics.
 */
export namespace NotebookPanel {
  /**
   * An options interface for NotebookPanels.
   */
  export
  interface IOptions extends DocumentWidget.IOptions<Notebook, INotebookModel> {
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
