// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDisposable } from '@phosphor/disposable';

import { Message, MessageLoop } from '@phosphor/messaging';

import { ISignal, Signal } from '@phosphor/signaling';

import { Widget } from '@phosphor/widgets';

import * as React from 'react';

import * as ReactDOM from 'react-dom';

/**
 * Phosphor widget that encodes best practices for VDOM based rendering.
 */
export abstract class VDomRenderer<
  T extends VDomRenderer.IModel | null
> extends Widget {
  /**
   * A signal emitted when the model changes.
   */
  get modelChanged(): ISignal<this, void> {
    return this._modelChanged;
  }

  /**
   * Set the model and fire changed signals.
   */
  set model(newValue: T | null) {
    if (this._model === newValue) {
      return;
    }

    if (this._model) {
      this._model.stateChanged.disconnect(this.update, this);
    }
    this._model = newValue;
    if (newValue) {
      newValue.stateChanged.connect(this.update, this);
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
    if (Array.isArray(vnode)) {
      ReactDOM.render(vnode, this.node);
    } else {
      ReactDOM.render<any>(vnode, this.node);
    }
  }

  /* Called after the widget is attached to the DOM
   *
   * Make sure the widget is rendered, even if the model has not changed.
   */
  protected onAfterAttach(msg: Message): void {
    MessageLoop.sendMessage(this, Widget.Msg.UpdateRequest);
  }

  /**
   * Render the content of this widget using the virtual DOM.
   *
   * This method will be called anytime the widget needs to be rendered,
   * which includes layout triggered rendering and all model changes.
   *
   * Subclasses should define this method and use the current model state
   * to create a virtual node or nodes to render.
   */
  protected abstract render():
    | Array<React.ReactElement<any>>
    | React.ReactElement<any>
    | null;

  private _model: T | null;
  private _modelChanged = new Signal<this, void>(this);
}

/**
 * Phosphor widget that renders React Element(s).
 *
 * All messages will re-render the element.
 */
export class ReactElementWidget extends VDomRenderer<any> {
  /**
   * Creates a Phosphor widget that renders the element(s) `es`.
   */
  constructor(
    es: Array<React.ReactElement<any>> | React.ReactElement<any> | null
  ) {
    super();
    this._es = es;
  }

  render(): Array<React.ReactElement<any>> | React.ReactElement<any> | null {
    return this._es;
  }

  private _es: Array<React.ReactElement<any>> | React.ReactElement<any> | null;
}

/**
 * The namespace for VDomRenderer statics.
 */
export namespace VDomRenderer {
  /**
   * An interface for a model to be used with vdom rendering.
   */
  export interface IModel extends IDisposable {
    /**
     * A signal emitted when any model state changes.
     */
    readonly stateChanged: ISignal<this, void>;
  }
}

/**
 * Concrete implementation of VDomRenderer model.
 */
export class VDomModel implements VDomRenderer.IModel {
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
