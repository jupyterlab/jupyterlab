// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from '@phosphor/disposable';

import {
  Message
} from '@phosphor/messaging';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  Widget
} from '@phosphor/widgets';

import {
  VirtualDOM, VirtualNode
} from '@phosphor/virtualdom';


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
  get stateChanged(): ISignal<this, void> {
    return this._stateChanged;
  }

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
    Signal.clearData(this);
  }

  /**
   * Trigger a change signal.
   */
  protected triggerChange(): void {
    this._stateChanged.emit(void 0);
  }

  private _isDisposed = false;
  private _stateChanged = new Signal<this, void>(this);
}


/**
 * Phosphor widget that encodes best practices for VDOM based rendering.
 */
export
abstract class VDomWidget<T extends IVDomModel> extends Widget {
  /**
   * A signal emited when the model changes.
   */
  get modelChanged(): ISignal<this, void> {
    return this._modelChanged;
  }

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
    this._modelChanged.emit(void 0);
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
    VirtualDOM.render(vnode, this.node);
  }

  /**
   * Render the content of this widget using the virtial DOM.
   *
   * This method will be called anytime the widget needs to be rendered,
   * which includes layout triggered rendering and all model changes.
   *
   * Subclasses should define this method and use the current model state
   * in this.model and return a phosphor VirtualNode or VirtualNode[] using the phosphor
   * VDOM API.
   */
  protected abstract render(): VirtualNode | VirtualNode[];

  private _model: T;
  private _modelChanged = new Signal<this, void>(this);
}
