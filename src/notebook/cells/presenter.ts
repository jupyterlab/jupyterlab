// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ICellEditorView, IEditorModel, IPosition, IEditorView
} from './view';

import {
  ICellModel
} from './model';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  IChangedArgs
} from '../../common/interfaces';

export * from './view';

/**
 * A cell editor presenter.
 */
export
interface ICellEditorPresenter extends IDisposable {
  /**
   * A cell model associated with thie presenter.
   */
  model:ICellModel

  /**
   * Handles moving a cursor up.
   */
  onPositionUp(editorView:ICellEditorView): void;

  /**
   * Handles moving a cursor down.
   */
  onPositionDown(editorView:ICellEditorView): void;
}

/**
 * A default standalone editor presenter.
 */
export
class CellEditorPresenter implements ICellEditorPresenter {

  /**
   * Tests whether this presenter is disposed.
   */
  isDisposed: boolean;

  /**
   * Constructs a presenter.
   */
  constructor(private _editorView: ICellEditorView) {
    this.editorView.getModel().contentChanged.connect(this.onEditorModelContentChanged, this)
  }

  /**
   * Handles editor model content changed events.
   */
  protected onEditorModelContentChanged(model: IEditorModel) {
    this.updateCellModel(model);
  }

  /**
   * Handles moving a cursor up.
   */
  onPositionUp(editorView:ICellEditorView) {
    if (IEditorView.isAtStartPositoin(editorView)) {
      this.editorView.edgeRequested.emit('top');
    }
  }

  /**
   * Handles moving a cursor down.
   */
  onPositionDown(editorView:ICellEditorView) {
    if (IEditorView.isAtEndPosition(editorView)) {
      this.editorView.edgeRequested.emit('bottom');
    }
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;

    this.editorView.getModel().contentChanged.disconnect(this.onEditorModelContentChanged, this);
    this.editorView.dispose();

    this.disconnect(this.model);

    this._editorView = null;
    this._model = null;
  }

  /**
   * Returns an associated cell editor view.
   */
  get editorView(): ICellEditorView {
    return this._editorView;
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

    this.disconnect(this._model);
    
    this._model = model;
    this.updateEditorModel(model);

    this.connect(model)
  }

  /**
   * Connects this presenter to the given cell model.
   */
  protected connect(model: ICellModel) {
    if (model) {
      model.stateChanged.connect(this.onModelStateChanged, this);
    }
  }
  
  /**
   * Disconnects this presenter from the given cell model.
   */
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

  /**
   * Updates an editor model.
   */
  protected updateEditorModel(model: ICellModel) {
    const newVlaue = model ? model.source : '';
    const editorModel = this.editorView.getModel();
    const oldValue = editorModel.getValue();
    if (oldValue !== newVlaue) {
      editorModel.setValue(newVlaue);
    }
  }

  /**
   * Updates a cell model.
   */
  protected updateCellModel(model: IEditorModel) {
    const newValue = model.getValue();
    const oldValue = this.model.source;
    if (oldValue !== newValue) {
      this.model.source = newValue;
    }
  }

  private _model: ICellModel = null;

}