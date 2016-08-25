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

import {
  PropertyObserver
} from '../../editorwidget/utils/utils';

export * from './view';

/**
 * A cell editor presenter.
 */
export
interface ICellEditorPresenter extends IDisposable {
  /**
   * A cell model associated with thie presenter.
   */
  model: ICellModel

  /**
   * Handles moving a cursor up.
   */
  onPositionUp(editorView: ICellEditorView): void;

  /**
   * Handles moving a cursor down.
   */
  onPositionDown(editorView: ICellEditorView): void;
}

/**
 * A default standalone editor presenter.
 */
export
class CellEditorPresenter implements ICellEditorPresenter {

  /**
   * Tests whether this presenter is disposed.
   */
  isDisposed: boolean = false;

  /**
   * Constructs a presenter.
   */
  constructor(editorView: ICellEditorView) {
    this._modelObserver.connect = (model) => this.connectToCellModel(model);
    this._modelObserver.onChanged = (model) => this.onCellModelChanged(model);
    this._modelObserver.disconnect = (model) => this.disconnectFromCellModel(model);

    this._editorViewObserver.connect = (editorView) => this.connectToEditorView(editorView);
    this._editorViewObserver.disconnect = (editorView) => this.disconnectFromEditorView(editorView);
    this._editorViewObserver.property = editorView;
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;

    this._editorViewObserver.dispose();
    this._editorViewObserver = null;

    this._modelObserver.dispose();
    this._modelObserver = null;
  }

  /**
   * Connects this presenter to the given editor view.
   */
  protected connectToEditorView(editorView: ICellEditorView) {
    editorView.getModel().contentChanged.connect(this.onEditorModelContentChanged, this);
  }

  /**
   * Disconnect this presenter from the given editor view.
   */
  protected disconnectFromEditorView(editorView: ICellEditorView) {
    editorView.getModel().contentChanged.disconnect(this.onEditorModelContentChanged, this);
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
  onPositionUp(editorView: ICellEditorView) {
    if (IEditorView.isAtStartPositoin(editorView)) {
      editorView.edgeRequested.emit('top');
    }
  }

  /**
   * Handles moving a cursor down.
   */
  onPositionDown(editorView: ICellEditorView) {
    if (IEditorView.isAtEndPosition(editorView)) {
      editorView.edgeRequested.emit('bottom');
    }
  }

  /**
   * Returns an associated cell editor view.
   */
  get editorView(): ICellEditorView {
    return this._editorViewObserver.property;
  }

  /**
   * The cell model used by the editor.
   */
  get model(): ICellModel {
    return this._modelObserver.property;
  }

  set model(model: ICellModel) {
    this._modelObserver.property = model;
  }

  /**
   * Connects this presenter to the given cell model.
   */
  protected connectToCellModel(model: ICellModel) {
    model.stateChanged.connect(this.onModelStateChanged, this);
  }

  /** 
   * Handles changes of a cell model. 
   */
  protected onCellModelChanged(model: ICellModel) {
    this.updateEditorModel(model);
  }

  /**
   * Disconnects this presenter from the given cell model.
   */
  protected disconnectFromCellModel(model: ICellModel) {
    model.stateChanged.disconnect(this.onModelStateChanged, this);
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
    const oldValue = this.editorView.getModel().getValue();
    if (oldValue !== newVlaue) {
      this.performEditorModelUpdate(newVlaue);
    }
  }

  /**
   * Performs editor model update.
   */
  protected performEditorModelUpdate(value: string) {
    this.editorView.getModel().setValue(value);
  }

  /**
   * Updates a cell model.
   */
  protected updateCellModel(model: IEditorModel) {
    const newValue = model.getValue();
    const oldValue = this.model.source;
    if (oldValue !== newValue) {
      this.performDocumentModelUpdate(newValue);
    }
  }

  /**
   * Performs document model update.
   */
  protected performDocumentModelUpdate(value: string) {
    this.model.source = value;
  }

  private _modelObserver = new PropertyObserver<ICellModel>();
  private _editorViewObserver = new PropertyObserver<ICellEditorView>();

}
