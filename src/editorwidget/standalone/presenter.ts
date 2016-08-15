// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  IStandalonEditorView
} from './view';

import {
  IDocumentModel, IDocumentContext
} from '../../docregistry';

import {
  IChangedArgs
} from '../../common/interfaces';

export
interface IStandaloneEditorPresenter extends IDisposable {
  context:IDocumentContext<IDocumentModel>
}

export
class StandaloneEditorPresenter implements IStandaloneEditorPresenter {

  isDisposed: boolean;

  private _view: IStandalonEditorView;
  private _context: IDocumentContext<IDocumentModel>;

  constructor(view: IStandalonEditorView) {
    this._view = view;
    this._view.contentChanged.connect(this.onEditorContentChanged, this);
  }

  protected onEditorContentChanged(editor: IStandalonEditorView) {
    this.updateDocumentModel();
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;

    this._view.contentChanged.disconnect(this.onEditorContentChanged, this);
    this._view.dispose();
    this._view = null;
    
    this.disconnect(this._context);
    this._context = null;
  }

  get view(): IStandalonEditorView {
    return this._view;
  }

  get context(): IDocumentContext<IDocumentModel> {
    return this._context;
  }

  set context(context: IDocumentContext<IDocumentModel>) {
    this.disconnect(this._context);
    
    this._context = context;
    
    if (context) {
      this.updatePath(context.path);
      this.updateEditorModel(context.model)
    } else {
      this.updatePath('');
      this.updateEditorModel(null)
    }

    this.connect(context);
  }

  protected connect(context: IDocumentContext<IDocumentModel>) {
      if (context) {
        context.model.contentChanged.connect(this.onModelContentChanged, this);
        context.pathChanged.connect(this.onPathChanged, this);
        context.model.stateChanged.connect(this.onModelStateChanged, this);
      }
  }

  protected disconnect(context: IDocumentContext<IDocumentModel>) {
      if (context) {
        context.model.contentChanged.disconnect(this.onModelContentChanged, this);
        context.pathChanged.disconnect(this.onPathChanged, this);
        context.model.stateChanged.connect(this.onModelStateChanged, this);
      }
  }

  protected onPathChanged(context: IDocumentContext<IDocumentModel>) {
    this.updatePath(context.path);
  }

  protected onModelStateChanged(model: IDocumentModel, args: IChangedArgs<any>) {
    if (args.name === 'dirty') {
      this.updateDirty(model);
    }
  }

  protected onModelContentChanged(model: IDocumentModel) {
    this.updateEditorModel(model);
  }

  protected updateEditorModel(model: IDocumentModel) {
    const oldValue = this._view.getValue();
    const newValue = model ? model.toString() : '';
    if (oldValue !== newValue) {
      this._view.setValue(newValue);
    }
  }

  protected updateDocumentModel() {
    const newValue = this._view.getValue();
    const oldValue = this.context.model.toString();
    if (oldValue !== newValue) {
      this._context.model.fromString(newValue);
    }
  }

  protected updatePath(path: string): void {
    this._view.setPath(path);
  }

  protected updateDirty(model: IDocumentModel): void {
    this._view.setDirty(model.dirty)
  }

}