// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  IStandalonEditorView, IEditorModel
} from './view';

import {
  IDocumentModel, IDocumentContext
} from '../../docregistry';

import {
  IChangedArgs
} from '../../common/interfaces';

export * from './view';

/**
 * A standalone editor presenter.
 */
export
interface IStandaloneEditorPresenter extends IDisposable {
  /**
   * A document context associated with this presenter. 
   */
  context:IDocumentContext<IDocumentModel>
}

/**
 * A default standalone editor presenter.
 */
export
class StandaloneEditorPresenter implements IStandaloneEditorPresenter {

  /**
   * Tests whether this presenter is disposed.
   */
  isDisposed: boolean;

  /**
   * Constructs a presenter.
   */
  constructor(private _editorView: IStandalonEditorView) {
      this._editorView.getModel().contentChanged.connect(this.onEditorModelContentChanged, this);
  }

  /**
   * Handles editor model content changed events.
   */
  protected onEditorModelContentChanged(model: IEditorModel) {
    this.updateDocumentModel(model);
  }

  /**
   * Dispose this presenter.
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;

    this._editorView.getModel().contentChanged.disconnect(this.onEditorModelContentChanged, this);
    this._editorView = null;
    
    this.disconnect(this._context);
    this._context = null;
  }

  /**
   * Returns an associated standalone editor view.
   */
  get editorView(): IStandalonEditorView {
    return this._editorView;
  }

  /**
   * A document context
   */
  get context(): IDocumentContext<IDocumentModel> {
    return this._context;
  }
  set context(context: IDocumentContext<IDocumentModel>) {
    this.disconnect(this._context);
    
    this._context = context;
    
    if (context) {
      this.updateUri(context.path);
      this.updateEditorModel(context.model)
    } else {
      this.updateUri('');
      this.updateEditorModel(null)
    }

    this.connect(context);
  }

  /**
   * Connects this presenter to the given document context.
   */
  protected connect(context: IDocumentContext<IDocumentModel>) {
      if (context) {
        context.model.contentChanged.connect(this.onModelContentChanged, this);
        context.pathChanged.connect(this.onPathChanged, this);
        context.model.stateChanged.connect(this.onModelStateChanged, this);
      }
  }

  /**
   * Disconnects this presenter from the given document context.
   */
  protected disconnect(context: IDocumentContext<IDocumentModel>) {
      if (context) {
        context.model.contentChanged.disconnect(this.onModelContentChanged, this);
        context.pathChanged.disconnect(this.onPathChanged, this);
        context.model.stateChanged.connect(this.onModelStateChanged, this);
      }
  }

  /**
   * Handles path changed events.
   */
  protected onPathChanged(context: IDocumentContext<IDocumentModel>) {
    this.updateUri(context.path);
  }

  /**
   * Handles model state changed events.
   */
  protected onModelStateChanged(model: IDocumentModel, args: IChangedArgs<any>) {
    if (args.name === 'dirty') {
      this.updateDirty(model);
    }
  }

  /**
   * Handles model content changed events.
   */
  protected onModelContentChanged(model: IDocumentModel) {
    this.updateEditorModel(model);
  }

  /**
   * Updates an editor model.
   */
  protected updateEditorModel(model: IDocumentModel) {
    const oldValue = this._editorView.getModel().getValue();
    const newValue = model ? model.toString() : '';
    if (oldValue !== newValue) {
      this._editorView.getModel().setValue(newValue);
    }
  }

  /**
   * Updates a document model.
   */
  protected updateDocumentModel(model: IEditorModel) {
    const newValue = model.getValue();
    const oldValue = this.context.model.toString();
    if (oldValue !== newValue) {
      this._context.model.fromString(newValue);
    }
  }

  /**
   * Updates an uri.
   */
  protected updateUri(uri: string): void {
    this._editorView.getModel().uri = uri;
  }

  /**
   * Updates dirty state.
   */
  protected updateDirty(model: IDocumentModel): void {
    this._editorView.setDirty(model.dirty)
  }

  private _context: IDocumentContext<IDocumentModel>;

}