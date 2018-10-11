// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDisposable } from '@phosphor/disposable';

import { Message, MessageLoop } from '@phosphor/messaging';

import { ISignal, Signal } from '@phosphor/signaling';

import { Widget } from '@phosphor/widgets';

import * as React from 'react';

import * as ReactDOM from 'react-dom';

/**
 * An abstract class for a Phosphor widget which renders a React component.
 */
export abstract class ReactWidget extends Widget {
  /**
   * Render the content of this widget using the virtual DOM.
   *
   * This method will be called anytime the widget needs to be rendered, which
   * includes layout triggered rendering.
   *
   * Subclasses should define this method and return the root React nodes here.
   */
  protected abstract render():
    | Array<React.ReactElement<any>>
    | React.ReactElement<any>
    | null;

  /**
   * Called to update the state of the widget.
   *
   * The default implementation of this method triggers
   * VDOM based rendering by calling the this.render() method.
   */
  protected onUpdateRequest(msg: Message): void {
    this.renderDOM();
  }

  /**
   * Called after the widget is attached to the DOM
   */
  protected onAfterAttach(msg: Message): void {
    // Make *sure* the widget is rendered.
    MessageLoop.sendMessage(this, Widget.Msg.UpdateRequest);
  }

  /**
   * Called before the widget is detached from the DOM.
   */
  protected onBeforeDetach(msg: Message): void {
    // Unmount the component so it can tear down.
    ReactDOM.unmountComponentAtNode(this.node);
  }

  /**
   * Render the React nodes to the DOM.
   *
   * @returns a promise that resolves when the rendering is done.
   */
  protected async renderDOM(): Promise<void> {
    return new Promise<void>(resolve => {
      let vnode = this.render();
      // Split up the array/element cases so type inference chooses the right
      // signature.
      if (Array.isArray(vnode)) {
        ReactDOM.render(vnode, this.node, resolve);
      } else {
        ReactDOM.render(vnode, this.node, resolve);
      }
    });
  }
}

/**
 * An abstract ReactWidget with a model.
 */
export abstract class VDomRenderer<
  T extends VDomRenderer.IModel | null
> extends ReactWidget {
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
      newValue.stateChanged.connect(
        this.update,
        this
      );
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

  private _model: T | null;
  private _modelChanged = new Signal<this, void>(this);
}

/**
 * Phosphor widget that renders React Element(s).
 *
 * All messages will re-render the element.
 */
export class ReactElementWidget extends ReactWidget {
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
