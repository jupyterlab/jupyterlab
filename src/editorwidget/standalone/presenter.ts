// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  IStandaloneEditorView, IEditorModel
} from './view';

import {
  IDocumentModel, IDocumentContext
} from '../../docregistry';

import {
  IChangedArgs
} from '../../common/interfaces';

import {
  PropertyObserver
} from '../utils/utils';

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
  constructor(editorView:IStandaloneEditorView) {
    this._contextObserver.connect = (context) => this.connectToDocumentContext(context);
    this._contextObserver.onChanged = (context) => this.onDocumentContextChanged(context);
    this._contextObserver.disconnect = (context) => this.disconnectFromDocumentContext(context);

    this._editorViewObserver.connect = (editorView) => this.connectToEditorView(editorView);
    this._editorViewObserver.disconnect = (editorView) => this.disconnectFromEditorView(editorView);
    this._editorViewObserver.property = editorView;
  }

  /**
   * Dispose this presenter.
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;

    this._editorViewObserver.dispose();
    this._editorViewObserver = null;
    
    this._contextObserver.dispose();
    this._contextObserver = null;
  }

  /**
   * Returns an associated standalone editor view.
   */
  get editorView(): IStandaloneEditorView {
    return this._editorViewObserver.property;
  }

  /**
   * Connects this presenter to the given editor view.
   */
  protected connectToEditorView(editorView: IStandaloneEditorView) {
      editorView.getModel().contentChanged.connect(this.onEditorModelContentChanged, this);
  }

  /**
   * Disconnect this presenter from the given editor view.
   */
  protected disconnectFromEditorView(editorView: IStandaloneEditorView) {
      editorView.getModel().contentChanged.disconnect(this.onEditorModelContentChanged, this);
  }

  /**
   * Handles editor model content changed events.
   */
  protected onEditorModelContentChanged(model: IEditorModel) {
    this.updateDocumentModel(model);
  }

  /**
   * A document context
   */
  get context(): IDocumentContext<IDocumentModel> {
    return this._contextObserver.property;
  }

  set context(context: IDocumentContext<IDocumentModel>) {
    this._contextObserver.property = context;
  }

  /**
   * Connects this presenter to the given document context.
   */
  protected connectToDocumentContext(context: IDocumentContext<IDocumentModel>) {
      if (context) {
        context.model.contentChanged.connect(this.onModelContentChanged, this);
        context.pathChanged.connect(this.onPathChanged, this);
        context.model.stateChanged.connect(this.onModelStateChanged, this);
      }
  }

  /** 
   * Handles changes of a document context. 
   */
  protected onDocumentContextChanged(context: IDocumentContext<IDocumentModel>) {
    if (context) {
      this.updateUri(context.path);
      this.updateEditorModel(context.model)
    } else {
      this.updateUri('');
      this.updateEditorModel(null)
    }
  }

  /**
   * Disconnects this presenter from the given document context.
   */
  protected disconnectFromDocumentContext(context: IDocumentContext<IDocumentModel>) {
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
    const oldValue = this.editorView.getModel().getValue();
    const newValue = model ? model.toString() : '';
    if (oldValue !== newValue) {
      this.editorView.getModel().setValue(newValue);
    }
  }

  /**
   * Updates a document model.
   */
  protected updateDocumentModel(model: IEditorModel) {
    const newValue = model.getValue();
    const oldValue = this.context.model.toString();
    if (oldValue !== newValue) {
      this.context.model.fromString(newValue);
    }
  }

  /**
   * Updates an uri.
   */
  protected updateUri(uri: string): void {
    this.editorView.getModel().uri = uri;
  }

  /**
   * Updates dirty state.
   */
  protected updateDirty(model: IDocumentModel): void {
    this.editorView.setDirty(model.dirty)
  }

  private _editorViewObserver = new PropertyObserver<IStandaloneEditorView>();
  private _contextObserver = new PropertyObserver<IDocumentContext<IDocumentModel>>();

}