// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ArrayExt, each, map, toArray
} from '@phosphor/algorithm';

import {
  PromiseDelegate
} from '@phosphor/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  PanelLayout, Panel, Widget
} from '@phosphor/widgets';

import * as React from 'react';

import {
  ReactElementWidget
} from './vdom';

import {
  Styling
} from './styling';


/**
 * Create and show a dialog.
 *
 * @param options - The dialog setup options.
 *
 * @returns A promise that resolves with whether the dialog was accepted.
 */
export
function showDialog<T>(options: Partial<Dialog.IOptions<T>>={}): Promise<Dialog.IResult<T>> {
  let dialog = new Dialog(options);
  return dialog.launch();
}

/**
 * Show an error message dialog.
 *
 * @param title - The title of the dialog box.
 *
 * @param error - the error to show in the dialog body (either a string
 *   or an object with a string `message` property).
 */
export
function showErrorMessage(title: string, error: any): Promise<void> {
  console.warn('Showing error:', error);

  return showDialog({
    title: title,
    body: error.message || title,
    buttons: [Dialog.okButton({ label: 'DISMISS' })]
  }).then(() => { /* no-op */ });
}

/**
 * A modal dialog widget.
 */
export
class Dialog<T> extends Widget {
  /**
   * Create a dialog panel instance.
   *
   * @param options - The dialog setup options.
   */
  constructor(options: Partial<Dialog.IOptions<T>> = { }) {
    super();
    this.addClass('jp-Dialog');
    let normalized = Private.handleOptions(options);
    let renderer = normalized.renderer;

    this._host = normalized.host;
    this._defaultButton = normalized.defaultButton;
    this._buttons = normalized.buttons;
    this._buttonNodes = toArray(map(this._buttons, button => {
      return renderer.createButtonNode(button);
    }));

    let layout = this.layout = new PanelLayout();
    let content = new Panel();
    content.addClass('jp-Dialog-content');
    layout.addWidget(content);

    this._body = normalized.body;

    let header = renderer.createHeader(normalized.title);
    let body = renderer.createBody(normalized.body);
    let footer = renderer.createFooter(this._buttonNodes);
    content.addWidget(header);
    content.addWidget(body);
    content.addWidget(footer);

    this._primary = this._buttonNodes[this._defaultButton];

    if (options.focusNodeSelector) {
      let el = body.node.querySelector(options.focusNodeSelector);
      if (el) {
        this._primary = el as HTMLElement;
      }
    }
  }

  /**
   * Dispose of the resources used by the dialog.
   */
  dispose(): void {
    const promise = this._promise;
    if (promise) {
      this._promise = null;
      promise.reject(void 0);
      ArrayExt.removeFirstOf(Private.launchQueue, promise.promise);
    }
    super.dispose();
  }

  /**
   * Launch the dialog as a modal window.
   *
   * @returns a promise that resolves with the result of the dialog.
   */
  launch(): Promise<Dialog.IResult<T>> {
    // Return the existing dialog if already open.
    if (this._promise) {
      return this._promise.promise;
    }
    const promise = this._promise = new PromiseDelegate<Dialog.IResult<T>>();
    let promises = Promise.all(Private.launchQueue);
    Private.launchQueue.push(this._promise.promise);
    return promises.then(() => {
      Widget.attach(this, this._host);
      return promise.promise;
    });
  }

  /**
   * Resolve the current dialog.
   *
   * @param index - An optional index to the button to resolve.
   *
   * #### Notes
   * Will default to the defaultIndex.
   * Will resolve the current `show()` with the button value.
   * Will be a no-op if the dialog is not shown.
   */
  resolve(index?: number): void {
    if (!this._promise) {
      return;
    }
    if (index === undefined) {
      index = this._defaultButton;
    }
    this._resolve(this._buttons[index]);
  }

  /**
   * Reject the current dialog with a default reject value.
   *
   * #### Notes
   * Will be a no-op if the dialog is not shown.
   */
  reject(): void {
    if (!this._promise) {
      return;
    }
    this._resolve(Dialog.cancelButton());
  }

  /**
   * Handle the DOM events for the directory listing.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the panel's DOM node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
    case 'keydown':
      this._evtKeydown(event as KeyboardEvent);
      break;
    case 'click':
      this._evtClick(event as MouseEvent);
      break;
    case 'focus':
      this._evtFocus(event as FocusEvent);
      break;
    case 'contextmenu':
      event.preventDefault();
      event.stopPropagation();
      break;
    default:
      break;
    }
  }

  /**
   *  A message handler invoked on a `'before-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    let node = this.node;
    node.addEventListener('keydown', this, true);
    node.addEventListener('contextmenu', this, true);
    node.addEventListener('click', this, true);
    document.addEventListener('focus', this, true);
    this._first = Private.findFirstFocusable(this.node);
    this._original = document.activeElement as HTMLElement;
    this._primary.focus();
  }

  /**
   *  A message handler invoked on a `'after-detach'` message.
   */
  protected onAfterDetach(msg: Message): void {
    let node = this.node;
    node.removeEventListener('keydown', this, true);
    node.removeEventListener('contextmenu', this, true);
    node.removeEventListener('click', this, true);
    document.removeEventListener('focus', this, true);
    this._original.focus();
  }

  /**
   * A message handler invoked on a `'close-request'` message.
   */
  protected onCloseRequest(msg: Message): void {
    if (this._promise) {
      this.reject();
    }
    super.onCloseRequest(msg);
  }

  /**
   * Handle the `'click'` event for a dialog button.
   *
   * @param event - The DOM event sent to the widget
   */
  protected _evtClick(event: MouseEvent): void {
    let content = this.node.getElementsByClassName('jp-Dialog-content')[0] as HTMLElement;
    if (!content.contains(event.target as HTMLElement)) {
      event.stopPropagation();
      event.preventDefault();
      return;
    }
    for (let buttonNode of this._buttonNodes) {
      if (buttonNode.contains(event.target as HTMLElement)) {
        let index = this._buttonNodes.indexOf(buttonNode);
        this.resolve(index);
      }
    }
  }

  /**
   * Handle the `'keydown'` event for the widget.
   *
   * @param event - The DOM event sent to the widget
   */
  protected _evtKeydown(event: KeyboardEvent): void {
    // Check for escape key
    switch (event.keyCode) {
    case 27:  // Escape.
      event.stopPropagation();
      event.preventDefault();
      this.reject();
      break;
    case 9:  // Tab.
      // Handle a tab on the last button.
      let node = this._buttonNodes[this._buttons.length - 1];
      if (document.activeElement === node && !event.shiftKey) {
        event.stopPropagation();
        event.preventDefault();
        this._first.focus();
      }
      break;
    case 13:  // Enter.
      event.stopPropagation();
      event.preventDefault();
      this.resolve();
      break;
    default:
      break;
    }
  }

  /**
   * Handle the `'focus'` event for the widget.
   *
   * @param event - The DOM event sent to the widget
   */
  protected _evtFocus(event: FocusEvent): void {
    let target = event.target as HTMLElement;
    if (!this.node.contains(target as HTMLElement)) {
      event.stopPropagation();
      this._buttonNodes[this._defaultButton].focus();
    }
  }

  /**
   * Resolve a button item.
   */
  private _resolve(button: Dialog.IButton): void {
    // Prevent loopback.
    const promise = this._promise;
    if (!promise) {
      this.dispose();
      return;
    }
    this._promise = null;
    ArrayExt.removeFirstOf(Private.launchQueue, promise.promise);
    let body = this._body;
    let value: T | null = null;
    if (button.accept &&
      body instanceof Widget &&
      typeof body.getValue === 'function') {
      value = body.getValue();
    }
    this.dispose();
    promise.resolve({ button, value });
  }

  private _buttonNodes: ReadonlyArray<HTMLElement>;
  private _buttons: ReadonlyArray<Dialog.IButton>;
  private _original: HTMLElement;
  private _first: HTMLElement;
  private _primary: HTMLElement;
  private _promise: PromiseDelegate<Dialog.IResult<T>> | null;
  private _defaultButton: number;
  private _host: HTMLElement;
  private _body: Dialog.BodyType<T>;
}


/**
 * The namespace for Dialog class statics.
 */
export
namespace Dialog {
  /**
   * The options used to create a dialog.
   */
  export
  interface IOptions<T> {
    /**
     * The top level text for the dialog.  Defaults to an empty string.
     */
    title: HeaderType;

    /**
     * The main body element for the dialog or a message to display.
     * Defaults to an empty string.
     *
     * #### Notes
     * If a widget is given as the body, it will be disposed after the
     * dialog is resolved.  If the widget has a `getValue()` method,
     * the method will be called prior to disposal and the value
     * will be provided as part of the dialog result.
     * A string argument will be used as raw `textContent`.
     * All `input` and `select` nodes will be wrapped and styled.
     */
    body: BodyType<T>;

    /**
     * The host element for the dialog. Defaults to `document.body`.
     */
    host: HTMLElement;

    /**
     * The to buttons to display. Defaults to cancel and accept buttons.
     */
    buttons: ReadonlyArray<IButton>;

    /**
     * The index of the default button.  Defaults to the last button.
     */
    defaultButton: number;

    /**
     * A selector for the primary element that should take focus in the dialog.
     * Defaults to an empty string, causing the [[defaultButton]] to take
     * focus.
     */
    focusNodeSelector: string;

    /**
     * An optional renderer for dialog items.  Defaults to a shared
     * default renderer.
     */
    renderer: IRenderer;
  }

  /**
   * The options used to make a button item.
   */
  export
  interface IButton {
    /**
     * The label for the button.
     */
    label: string;

    /**
     * The icon class for the button.
     */
    iconClass: string;

    /**
     * The icon label for the button.
     */
    iconLabel: string;

    /**
     * The caption for the button.
     */
    caption: string;

    /**
     * The extra class name for the button.
     */
    className: string;

    /**
     * The dialog action to perform when the button is clicked.
     */
    accept: boolean;

    /**
     * The button display type.
     */
    displayType: 'default' | 'warn';
  }

  /**
   * The options used to create a button.
   */
  export
  type ButtonOptions = Partial<IButton>;

  /**
   * The header input types.
   */
  export
  type HeaderType = React.ReactElement<any> | string;

  /**
   * The result of a dialog.
   */
  export
  interface IResult<T> {
    /**
     * The button that was pressed.
     */
    button: IButton;

    /**
     * The value retrieved from `.getValue()` if given on the widget.
     */
    value: T | null;
  }

  /**
   * A widget used as a dialog body.
   */
  export
  interface IBodyWidget<T = string> extends Widget {
    /**
     * Get the serialized value of the widget.
     */
    getValue?(): T;
  }

  /**
   * The body input types.
   */
  export
  type BodyType<T> = IBodyWidget<T> | React.ReactElement<any> | string;

  /**
   * Create an accept button.
   */
  export
  function okButton(options: ButtonOptions = {}): Readonly<IButton> {
    options.accept = true;
    return createButton(options);
  }

  /**
   * Create a reject button.
   */
  export
  function cancelButton(options: ButtonOptions = {}): Readonly<IButton>  {
    options.accept = false;
    return createButton(options);
  }

  /**
   * Create a warn button.
   */
  export
  function warnButton(options: ButtonOptions = {}): Readonly<IButton>  {
    options.displayType = 'warn';
    return createButton(options);
  }

  /**
   * Create a button item.
   */
  export
  function createButton(value: Dialog.ButtonOptions): Readonly<IButton>  {
    value.accept = value.accept !== false;
    let defaultLabel = value.accept ? 'OK' : 'CANCEL';
    return {
      label: value.label || defaultLabel,
      iconClass: value.iconClass || '',
      iconLabel: value.iconLabel || '',
      caption: value.caption || '',
      className: value.className || '',
      accept: value.accept,
      displayType: value.displayType || 'default'
    };
  }

  /**
   * A dialog renderer.
   */
  export
  interface IRenderer {
    /**
     * Create the header of the dialog.
     *
     * @param title - The title of the dialog.
     *
     * @returns A widget for the dialog header.
     */
    createHeader(title: HeaderType): Widget;

    /**
     * Create the body of the dialog.
     *
     * @param value - The input value for the body.
     *
     * @returns A widget for the body.
     */
    createBody(body: BodyType<any>): Widget;

    /**
     * Create the footer of the dialog.
     *
     * @param buttons - The button nodes to add to the footer.
     *
     * @returns A widget for the footer.
     */
    createFooter(buttons: ReadonlyArray<HTMLElement>): Widget;

    /**
     * Create a button node for the dialog.
     *
     * @param button - The button data.
     *
     * @returns A node for the button.
     */
    createButtonNode(button: IButton): HTMLElement;
  }

  /**
   * The default implementation of a dialog renderer.
   */
  export
  class Renderer {
    /**
     * Create the header of the dialog.
     *
     * @param title - The title of the dialog.
     *
     * @returns A widget for the dialog header.
     */
    createHeader(title: HeaderType): Widget {
      let header: Widget;
      if (typeof title === 'string') {
        header = new Widget({ node: document.createElement('span') });
        header.node.textContent = title;
      } else {
        header = new ReactElementWidget(title);
      }
      header.addClass('jp-Dialog-header');
      Styling.styleNode(header.node);
      return header;
    }

    /**
     * Create the body of the dialog.
     *
     * @param value - The input value for the body.
     *
     * @returns A widget for the body.
     */
    createBody(value: BodyType<any>): Widget {
      let body: Widget;
      if (typeof value === 'string') {
        body = new Widget({ node: document.createElement('span') });
        body.node.textContent = value;
      } else if (value instanceof Widget) {
        body = value;
      } else {
        body = new ReactElementWidget(value);
      }
      body.addClass('jp-Dialog-body');
      Styling.styleNode(body.node);
      return body;
    }

    /**
     * Create the footer of the dialog.
     *
     * @param buttonNodes - The buttons nodes to add to the footer.
     *
     * @returns A widget for the footer.
     */
    createFooter(buttons: ReadonlyArray<HTMLElement>): Widget {
      let footer = new Widget();
      footer.addClass('jp-Dialog-footer');
      each(buttons, button => {
        footer.node.appendChild(button);
      });
      Styling.styleNode(footer.node);
      return footer;
    }

    /**
     * Create a button node for the dialog.
     *
     * @param button - The button data.
     *
     * @returns A node for the button.
     */
    createButtonNode(button: IButton): HTMLElement {
      const e = document.createElement(
        'button'
      );
      e.className = this.createItemClass(button);
      e.appendChild(this.renderIcon(button));
      e.appendChild(this.renderLabel(button));
      return e;
    }

    /**
     * Create the class name for the button.
     *
     * @param data - The data to use for the class name.
     *
     * @returns The full class name for the button.
     */
    createItemClass(data: IButton): string {
      // Setup the initial class name.
      let name = 'jp-Dialog-button';

      // Add the other state classes.
      if (data.accept) {
        name += ' jp-mod-accept';
      } else {
        name += ' jp-mod-reject';
      }
      if (data.displayType === 'warn') {
        name += ' jp-mod-warn';
      }

      // Add the extra class.
      let extra = data.className;
      if (extra) {
        name += ` ${extra}`;
      }

      // Return the complete class name.
      return name;
    }

    /**
     * Render an icon element for a dialog item.
     *
     * @param data - The data to use for rendering the icon.
     *
     * @returns An HTML element representing the icon.
     */
    renderIcon(data: IButton): HTMLElement {
      const e = document.createElement('div');
      e.className = this.createIconClass(data);
      e.appendChild(
        document.createTextNode(data.iconLabel)
      );
      return e;
    }

    /**
     * Create the class name for the button icon.
     *
     * @param data - The data to use for the class name.
     *
     * @returns The full class name for the item icon.
     */
    createIconClass(data: IButton): string {
      let name = 'jp-Dialog-buttonIcon';
      let extra = data.iconClass;
      return extra ? `${name} ${extra}` : name;
    }

    /**
     * Render the label element for a button.
     *
     * @param data - The data to use for rendering the label.
     *
     * @returns An HTML element representing the item label.
     */
    renderLabel(data: IButton): HTMLElement {
      const e = document.createElement('div');
      e.className = 'jp-Dialog-buttonLabel';
      e.title = data.caption;
      e.appendChild(document.createTextNode(data.label));
      return e;
    }
  }

  /**
   * The default renderer instance.
   */
  export
  const defaultRenderer = new Renderer();
}


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * The queue for launching dialogs.
   */
  export
  let launchQueue: Promise<Dialog.IResult<any>>[] = [];

  /**
   * Handle the input options for a dialog.
   *
   * @param options - The input options.
   *
   * @returns A new options object with defaults applied.
   */
  export
  function handleOptions<T>(options: Partial<Dialog.IOptions<T>>={}): Dialog.IOptions<T> {
    let buttons = (
      options.buttons || [Dialog.cancelButton(), Dialog.okButton()]
    );
    let defaultButton = buttons.length - 1;
    if (options.defaultButton !== undefined) {
      defaultButton = options.defaultButton;
    }
    return {
      title: options.title || '',
      body: options.body || '',
      host: options.host || document.body,
      buttons,
      defaultButton,
      renderer: options.renderer || Dialog.defaultRenderer,
      focusNodeSelector: options.focusNodeSelector || ''
    };
  }

  /**
   *  Find the first focusable item in the dialog.
   */
  export
  function findFirstFocusable(node: HTMLElement): HTMLElement {
    let candidateSelectors = [
      'input',
      'select',
      'a[href]',
      'textarea',
      'button',
      '[tabindex]',
    ].join(',');
    return node.querySelectorAll(candidateSelectors)[0] as HTMLElement;
  }
}
