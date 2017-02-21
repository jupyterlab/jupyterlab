// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from '@phosphor/disposable';

import {
  Message
} from '@phosphor/messaging';

import {
  clearSignalData, defineSignal, ISignal
} from '@phosphor/signaling';

import {
  Widget
} from '@phosphor/widgetwidget';

import {
  render, VNode
} from '@phosphor/widgetvdom';


/**
 * An interface for a model to be used with vdom rendering.
 */
export
interface IVDomModel extends IDisposable {
  /**
   * A signal emited when any model state changes.
   */
  readonly stateChanged: ISignal<IVDomModel, void>;
}


/**
 * Concrete implementation of IVDomModel.
 */
export
class VDomModel implements IVDomModel {
  /**
   * A signal emitted when any model state changes.
   */
  readonly stateChanged: ISignal<this, void>;

  /**
   * Test whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose the model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    clearSignalData(this);
  }

  private _isDisposed = false;
}


// Define the signals for the VDomModel class.
defineSignal(VDomModel.prototype, 'stateChanged');


/**
 * Phosphor widget that encodes best practices for VDOM based rendering.
 */
export
abstract class VDomWidget<T extends IVDomModel> extends Widget {
  /**
   * A signal emited when the model changes.
   */
  modelChanged: ISignal<this, void>;

  /**
   * Set the model and fire changed signals.
   */
  set model(newValue: T) {
    newValue = newValue || null;
    if (this._model === newValue) {
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
   * Dispose this widget.
   */
  dispose() {
    this._model = null;
    super.dispose();
  }

  /**
   * Called to update the state of the widget.
   *
   * The default implementation of this method triggers
   * VDOM based rendering by calling the this.render() method.
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
  protected abstract render(): VNode | VNode[];

  private _model: T;
}


// Define the signal for the VDomWidget class.
defineSignal(VDomWidget.prototype, 'modelChanged');
