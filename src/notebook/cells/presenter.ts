// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ICellEditorView
} from './view'

import {
  ICellModel
} from './model';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  IChangedArgs
} from '../../common/interfaces';

export
interface ICellEditorPresenter extends IDisposable {
  model:ICellModel
}

export
class CellEditorPresenter implements ICellEditorPresenter {

  isDisposed: boolean;

  constructor(view: ICellEditorView) {
    this._view = view;
    this._view.contentChanged.connect(this.onEditorContentChanged, this)
  }

  protected onEditorContentChanged(editor: ICellEditorView) {
    this.updateDocumentModel();
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    this._view.contentChanged.disconnect(this.onEditorContentChanged, this);
    this._view = null;
    this._model = null;
  }

  /**
   * The cell model used by the editor.
   */
  get model(): ICellModel {
    return this._model;
  }

  set model(model: ICellModel) {
    if (!model && !this._model || model === this._model) {
      return;
    }

    this.disconnect(model);
    
    this._model = model;
    this.updateEditorModel(model);

    this.connect(model)
  }

  protected connect(model: ICellModel) {
    if (model) {
      model.stateChanged.connect(this.onModelStateChanged, this);
    }
  }

  protected disconnect(model: ICellModel) {
    if (model) {
      model.stateChanged.disconnect(this.onModelStateChanged, this);
    }
  }

  /**
   * Handle changes in the model state.
   */
  protected onModelStateChanged(model: ICellModel, args: IChangedArgs<any>): void {
    if (args.name === 'source') {
      this.updateEditorModel(model);
    }
  }

  protected updateEditorModel(model: ICellModel) {
    const newVlaue = model ? model.source : '';
    const oldValue = this._view.getValue();
    if (oldValue !== newVlaue) {
      this._view.setValue(newVlaue);
    }
  }

  protected updateDocumentModel() {
    const newValue = this._view.getValue();
    const oldValue = this._model.source;
    if (oldValue !== newValue) {
      this._model.source = newValue;
    }
  }

  private _model: ICellModel = null;
  private _view: ICellEditorView = null;

}