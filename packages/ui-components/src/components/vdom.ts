// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDisposable } from '@lumino/disposable';
import { Message, MessageLoop } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';

type ReactRenderElement =
  | Array<React.ReactElement<any>>
  | React.ReactElement<any>;

/**
 * An abstract class for a Lumino widget which renders a React component.
 */
export abstract class ReactWidget extends Widget {
  constructor() {
    super();
  }
  /**
   * Creates a new `ReactWidget` that renders a constant element.
   * @param element React element to render.
   */
  static create(element: ReactRenderElement): ReactWidget {
    return new (class extends ReactWidget {
      render() {
        return element;
      }
    })();
  }

  /**
   * Render the content of this widget using the virtual DOM.
   *
   * This method will be called anytime the widget needs to be rendered, which
   * includes layout triggered rendering.
   *
   * Subclasses should define this method and return the root React nodes here.
   */
  protected abstract render(): ReactRenderElement | null;

  /**
   * Called to update the state of the widget.
   *
   * The default implementation of this method triggers
   * VDOM based rendering by calling the `renderDOM` method.
   */
  protected onUpdateRequest(msg: Message): void {
    this.renderPromise = this.renderDOM();
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
    if (this._rootDOM !== null) {
      this._rootDOM.unmount();
      this._rootDOM = null;
    }
  }

  /**
   * Render the React nodes to the DOM.
   *
   * @returns a promise that resolves when the rendering is done.
   */
  private renderDOM(): Promise<void> {
    return new Promise<void>(resolve => {
      const vnode = this.render();
      if (this._rootDOM === null) {
        this._rootDOM = createRoot(this.node);
      }
      // Split up the array/element cases so type inference chooses the right
      // signature.
      if (Array.isArray(vnode)) {
        this._rootDOM.render(vnode);
        // Resolves after the widget has been rendered.
        // https://github.com/reactwg/react-18/discussions/5#discussioncomment-798304
        requestIdleCallback(() => resolve());
      } else if (vnode) {
        this._rootDOM.render(vnode);
        // Resolves after the widget has been rendered.
        // https://github.com/reactwg/react-18/discussions/5#discussioncomment-798304
        requestIdleCallback(() => resolve());
      } else {
        // If the virtual node is null, unmount the node content
        this._rootDOM.unmount();
        this._rootDOM = null;
        requestIdleCallback(() => resolve());
      }
    });
  }

  // Set whenever a new render is triggered and resolved when it is finished.
  renderPromise?: Promise<void>;
  private _rootDOM: Root | null = null;
}

/**
 * An abstract ReactWidget with a model.
 */
export abstract class VDomRenderer<
  T extends VDomRenderer.IModel | null = null
> extends ReactWidget {
  /**
   * Create a new VDomRenderer
   */
  constructor(model?: T) {
    super();
    this.model = (model ?? null) as unknown as T;
  }
  /**
   * A signal emitted when the model changes.
   */
  get modelChanged(): ISignal<this, void> {
    return this._modelChanged;
  }

  /**
   * Set the model and fire changed signals.
   */
  set model(newValue: T) {
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
  get model(): T {
    return this._model;
  }

  /**
   * Dispose this widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._model = null!;
    super.dispose();
  }

  private _model: T;
  private _modelChanged = new Signal<this, void>(this);
}

/**
 * Props for the UseSignal component
 */
export interface IUseSignalProps<SENDER, ARGS> {
  /**
   * Lumino signal to connect to.
   */

  signal: ISignal<SENDER, ARGS>;
  /**
   * Initial value to use for the sender, used before the signal emits a value.
   * If not provided, initial sender will be undefined
   */
  initialSender?: SENDER;
  /**
   * Initial value to use for the args, used before the signal emits a value.
   * If not provided, initial args will be undefined.
   */
  initialArgs?: ARGS;
  /**
   * Function mapping the last signal value or initial values to an element to render.
   *
   * Note: returns `React.ReactNode` as per
   * https://github.com/sw-yx/react-typescript-cheatsheet#higher-order-componentsrender-props
   */

  children: (sender?: SENDER, args?: ARGS) => React.ReactNode;
  /**
   * Given the last signal value, should return whether to update the state or not.
   *
   * The default unconditionally returns `true`, so you only have to override if you want
   * to skip some updates.
   */

  shouldUpdate?: (sender: SENDER, args: ARGS) => boolean;
}

/**
 * State for the UseSignal component
 */
export interface IUseSignalState<SENDER, ARGS> {
  value: [SENDER?, ARGS?];
}

/**
 * UseSignal provides a way to hook up a Lumino signal to a React element,
 * so that the element is re-rendered every time the signal fires.
 *
 * It is implemented through the "render props" technique, using the `children`
 * prop as a function to render, so that it can be used either as a prop or as a child
 * of this element
 * https://reactjs.org/docs/render-props.html
 *
 *
 * Example as child:
 *
 * ```
 * function LiveButton(isActiveSignal: ISignal<any, boolean>) {
 *  return (
 *    <UseSignal signal={isActiveSignal} initialArgs={true}>
 *     {(_, isActive) => <Button isActive={isActive}>}
 *    </UseSignal>
 *  )
 * }
 * ```
 *
 * Example as prop:
 *
 * ```
 * function LiveButton(isActiveSignal: ISignal<any, boolean>) {
 *  return (
 *    <UseSignal
 *      signal={isActiveSignal}
 *      initialArgs={true}
 *      children={(_, isActive) => <Button isActive={isActive}>}
 *    />
 *  )
 * }
 * ```
 */
export class UseSignal<SENDER, ARGS> extends React.Component<
  IUseSignalProps<SENDER, ARGS>,
  IUseSignalState<SENDER, ARGS>
> {
  constructor(props: IUseSignalProps<SENDER, ARGS>) {
    super(props);
    this.state = { value: [this.props.initialSender, this.props.initialArgs] };
  }

  componentDidMount(): void {
    this.props.signal.connect(this.slot);
  }

  componentWillUnmount(): void {
    this.props.signal.disconnect(this.slot);
  }

  private slot = (sender: SENDER, args: ARGS) => {
    // skip setting new state if we have a shouldUpdate function and it returns false
    if (this.props.shouldUpdate && !this.props.shouldUpdate(sender, args)) {
      return;
    }
    this.setState({ value: [sender, args] });
  };

  render(): React.ReactNode {
    return this.props.children(...this.state.value);
  }
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
