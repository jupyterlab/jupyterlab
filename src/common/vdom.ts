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
  VirtualDOM, VirtualNode
} from '@phosphor/virtualdom';

import {
  Widget
} from '@phosphor/widgets';


/**
 * Phosphor widget that encodes best practices for VDOM based rendering.
 */
export
abstract class VDomWidget<T extends VDomWidget.IModel> extends Widget {
  /**
   * A signal emited when the model changes.
   */
  get modelChanged(): ISignal<this, void> {
    return this._modelChanged;
  }

  /**
   * Set the model and fire changed signals.
   */
  set model(newValue: T | null) {
    newValue = newValue || null;
    if (this._model === newValue) {
      return;
    }

    if (this._model) {
      this._model.stateChanged.disconnect(this.update, this);
    }
    this._model = newValue;
    if (this._model) {
      this._model.stateChanged.connect(this.update, this);
    }
    this.update();
    this._modelChanged.emit(void 0);
  }

  /**
   * Get the current model.
   */
  get model(): T | null {
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
   * to create a virtual node or nodes to render.
   */
  protected abstract render(): VirtualNode | ReadonlyArray<VirtualNode>;

  private _model: T | null;
  private _modelChanged = new Signal<this, void>(this);
}


/**
 * The namespace for VDomWidget statics.
 */
export
namespace VDomWidget {
  /**
   * An interface for a model to be used with vdom rendering.
   */
  export
  interface IModel extends IDisposable {
    /**
     * A signal emited when any model state changes.
     */
    readonly stateChanged: ISignal<this, void>;
  }
}


/**
 * Concrete implementation of VDomWidget model.
 */
export
class VDomModel implements VDomWidget.IModel {
  /**
   * A signal emitted when any model state changes.
   */
  readonly stateChanged = new Signal<this, void>(this);

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

  private _isDisposed = false;
}
