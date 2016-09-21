// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  render, VNode
} from 'phosphor/lib/ui/vdom';


/**
 * An interface for a model to be used with vdom rendering
 */
export
interface IVDomModel extends IDisposable {

  /**
   * A signal emmited when any model state changes.
   */
  stateChanged: ISignal<IVDomModel, void>;

}


/**
 * Concrete implementation of IVDomModel
 */
export class VDomModel implements IVDomModel {

  /**
   * Create a VDomModel
   */
  contructor() {}

  /**
   * A signal emitted when any model state changes.
   */
  stateChanged: ISignal<IVDomModel, void>;

  /**
   * Dispose the model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return
    };
    this._isDisposed = true;
    clearSignalData(this);
  }

  /**
   * Is the model disposed?
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  _isDisposed = false;

}

// Define the signals for the VDomModel class.
defineSignal(VDomModel.prototype, 'stateChanged');


/** 
 * Phosphor widget that encodes best practices for VDOM based rendering
 */
export
abstract class VDomWidget<T extends IVDomModel> extends Widget {

  /**
   * Create a VDomWidget.
   */
  constructor() {
    super();
  }

  /**
   * A signal emmited when the model changes.
   */
  modelChanged: ISignal<VDomWidget<T>, void>;

  /** 
   * Set the model and fire changed signals.
   * 
   */
  set model(newValue: T) {
    if (!newValue && !this._model || newValue === this._model) {
      return;
    }

    if (this._model) {
      this._model.stateChanged.disconnect(this.update, this);
    }
    this._model = newValue;
    this._model.stateChanged.connect(this.update, this);
    this.update();
    this.modelChanged.emit(void 0);
  }

  /**
   * Get the current model.
   */
  get model(): T {
    return this._model;
  }

  /**
   * Called to update the state of the widget.
   * 
   * In this class, this triggers VDOM based rendering by calling
   * the this.render() method.
   */
  protected onUpdateRequest(msg: Message): void {
    let vnode = this.render();
    render(vnode, this.node);
  }

  /**
   * Render the content of this widget using the virtial DOM.
   * 
   * This method will be called anytime the widget needs to be rendered,
   * which includes layout triggered rendering and all model changes.
   * 
   * Subclasses should define this method and use the current model state
   * in this.model and return a phosphor VNode or VNode[] using the phosphor
   * VDOM API.
   */
  protected abstract render(): VNode | VNode[]

  /**
   * Is this widget disposed?
   */
  get isDisposed(): boolean {
    return this._model === null;
  }

  /**
   * Dispose this widget.
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._model = null;
    super.dispose();
  }

  _model: T

}

// Define the signal for the VDomWidget class
defineSignal(VDomWidget.prototype, 'modelChanged');
