
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel, KernelMessage
} from '@jupyterlab/services';

import {
  Token
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
  DocumentWidget
} from '@jupyterlab/docregistry';

import {
  RenderMimeRegistry
} from '@jupyterlab/rendermime';

import {
  INotebookModel
} from './model';

import {
  Notebook
} from './widget';


/**
 * The class name added to notebook panels.
 */
const NOTEBOOK_PANEL_CLASS = 'jp-NotebookPanel';

const NOTEBOOK_PANEL_TOOLBAR_CLASS = 'jp-NotebookPanel-toolbar';

const NOTEBOOK_PANEL_NOTEBOOK_CLASS = 'jp-NotebookPanel-notebook';

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
  constructor(options: DocumentWidget.IOptions<Notebook, INotebookModel>) {
    super(options);

    // Set up CSS classes
    this.addClass(NOTEBOOK_PANEL_CLASS);
    this.toolbar.addClass(NOTEBOOK_PANEL_TOOLBAR_CLASS);
    this.content.addClass(NOTEBOOK_PANEL_NOTEBOOK_CLASS);

    // Set up things related to the context
    this.content.model = this.context.model;
    this.context.session.kernelChanged.connect(this._onKernelChanged, this);

    this.revealed.then(() => {
      // Set the document edit mode on initial open if it looks like a new document.
      if (this.content.widgets.length === 1) {
        let cellModel = this.content.widgets[0].model;
        if (cellModel.type === 'code' && cellModel.value.text === '') {
          this.content.mode = 'edit';
        }
      }
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
    return this.context.session;
  }

  /**
   * The content factory for the notebook.
   *
   * TODO: deprecate this in favor of the .content attribute
   *
   */
  get contentFactory(): Notebook.IContentFactory {
    return this.content.contentFactory;
  }

  /**
   * The rendermime instance for the notebook.
   *
   * TODO: deprecate this in favor of the .content attribute
   *
   */
  get rendermime(): RenderMimeRegistry {
    return this.content.rendermime;
  }

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

  private _activated = new Signal<this, void>(this);
}


/**
 * A namespace for `NotebookPanel` statics.
 */
export namespace NotebookPanel {
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
