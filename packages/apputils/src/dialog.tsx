// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  Button,
  closeIcon,
  LabIcon,
  ReactWidget,
  Styling
} from '@jupyterlab/ui-components';
import { ArrayExt } from '@lumino/algorithm';
import { PromiseDelegate } from '@lumino/coreutils';
import { Message, MessageLoop } from '@lumino/messaging';
import { Panel, PanelLayout, Widget } from '@lumino/widgets';
import * as React from 'react';
import { WidgetTracker } from './widgettracker';

/**
 * Create and show a dialog.
 *
 * @param options - The dialog setup options.
 *
 * @returns A promise that resolves with whether the dialog was accepted.
 */
export function showDialog<T>(
  options: Partial<Dialog.IOptions<T>> = {}
): Promise<Dialog.IResult<T>> {
  const dialog = new Dialog(options);
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
export function showErrorMessage(
  title: string,
  error: string | Dialog.IError,
  buttons?: ReadonlyArray<Dialog.IButton>
): Promise<void> {
  const trans = Dialog.translator.load('jupyterlab');
  buttons = buttons ?? [Dialog.cancelButton({ label: trans.__('Close') })];
  console.warn('Showing error:', error);

  // Cache promises to prevent multiple copies of identical dialogs showing
  // to the user.
  const body = typeof error === 'string' ? error : error.message;
  const key = title + '----' + body;
  const promise = Private.errorMessagePromiseCache.get(key);
  if (promise) {
    return promise;
  } else {
    const dialogPromise = showDialog({
      title: title,
      body: body,
      buttons: buttons
    }).then(
      () => {
        Private.errorMessagePromiseCache.delete(key);
      },
      error => {
        // TODO: Use .finally() above when supported
        Private.errorMessagePromiseCache.delete(key);
        throw error;
      }
    );
    Private.errorMessagePromiseCache.set(key, dialogPromise);
    return dialogPromise;
  }
}

/**
 * A modal dialog widget.
 */
export class Dialog<T> extends Widget {
  /**
   * Create a dialog panel instance.
   *
   * @param options - The dialog setup options.
   */
  constructor(options: Partial<Dialog.IOptions<T>> = {}) {
    const dialogNode = document.createElement('dialog');
    dialogNode.ariaModal = 'true';
    super({ node: dialogNode });
    this.addClass('jp-Dialog');
    this.addClass('jp-ThemedContainer');
    const normalized = Private.handleOptions(options);
    const renderer = normalized.renderer;

    this._host = normalized.host;
    this._defaultButton = normalized.defaultButton;
    this._buttons = normalized.buttons;
    this._hasClose = normalized.hasClose;
    this._buttonNodes = this._buttons.map(b => renderer.createButtonNode(b));
    this._checkboxNode = null;
    this._lastMouseDownInDialog = false;

    if (normalized.checkbox) {
      const {
        label = '',
        caption = '',
        checked = false,
        className = ''
      } = normalized.checkbox;
      this._checkboxNode = renderer.createCheckboxNode({
        label,
        caption: caption ?? label,
        checked,
        className
      });
    }

    const layout = (this.layout = new PanelLayout());
    const content = new Panel();
    content.addClass('jp-Dialog-content');
    if (typeof options.body === 'string') {
      content.addClass('jp-Dialog-content-small');
      dialogNode.ariaLabel = [normalized.title, options.body].join(' ');
    }
    layout.addWidget(content);

    this._body = normalized.body;

    const header = renderer.createHeader(
      normalized.title,
      () => this.reject(),
      options
    );
    const body = renderer.createBody(normalized.body);
    const footer = renderer.createFooter(this._buttonNodes, this._checkboxNode);
    content.addWidget(header);
    content.addWidget(body);
    content.addWidget(footer);

    this._bodyWidget = body;
    this._primary = this._buttonNodes[this._defaultButton];
    this._focusNodeSelector = options.focusNodeSelector;

    // Add new dialogs to the tracker.
    void Dialog.tracker.add(this);
  }

  /**
   * A promise that resolves when the Dialog first rendering is done.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
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
    const promise = (this._promise = new PromiseDelegate<Dialog.IResult<T>>());
    const promises = Promise.all(Private.launchQueue);
    Private.launchQueue.push(this._promise.promise);
    return promises.then(() => {
      // Do not show Dialog if it was disposed of before it was at the front of the launch queue
      if (!this._promise) {
        return Promise.resolve({
          button: Dialog.cancelButton(),
          isChecked: null,
          value: null
        });
      }
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
      case 'mousedown':
        this._evtMouseDown(event as MouseEvent);
        break;
      case 'click':
        this._evtClick(event as MouseEvent);
        break;
      case 'input':
        this._evtInput(event as InputEvent);
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
   *  A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    const node = this.node;
    node.addEventListener('keydown', this, true);
    node.addEventListener('contextmenu', this, true);
    node.addEventListener('click', this, true);
    document.addEventListener('mousedown', this, true);
    document.addEventListener('focus', this, true);
    document.addEventListener('input', this, true);
    this._first = Private.findFirstFocusable(this.node);
    this._original = document.activeElement as HTMLElement;

    const setFocus = () => {
      if (this._focusNodeSelector) {
        const body = this.node.querySelector('.jp-Dialog-body');
        const el = body?.querySelector(this._focusNodeSelector);

        if (el) {
          this._primary = el as HTMLElement;
        }
      }
      this._primary?.focus();
      this._ready.resolve();
    };

    if (
      this._bodyWidget instanceof ReactWidget &&
      (this._bodyWidget as ReactWidget).renderPromise !== undefined
    ) {
      (this._bodyWidget as ReactWidget)
        .renderPromise!.then(() => {
          setFocus();
        })
        .catch(() => {
          console.error("Error while loading Dialog's body");
        });
    } else {
      setFocus();
    }
  }

  /**
   *  A message handler invoked on an `'after-detach'` message.
   */
  protected onAfterDetach(msg: Message): void {
    const node = this.node;
    node.removeEventListener('keydown', this, true);
    node.removeEventListener('contextmenu', this, true);
    node.removeEventListener('click', this, true);
    document.removeEventListener('focus', this, true);
    document.removeEventListener('mousedown', this, true);
    document.removeEventListener('input', this, true);
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
   * Handle the `'input'` event for dialog's children.
   *
   * @param event - The DOM event sent to the widget
   */
  protected _evtInput(_event: InputEvent): void {
    this._hasValidationErrors = !!this.node.querySelector(':invalid');
    for (let i = 0; i < this._buttons.length; i++) {
      if (this._buttons[i].accept) {
        this._buttonNodes[i].disabled = this._hasValidationErrors;
      }
    }
  }

  /**
   * Handle the `'click'` event for a dialog button.
   *
   * @param event - The DOM event sent to the widget
   */
  protected _evtClick(event: MouseEvent): void {
    const content = this.node.getElementsByClassName(
      'jp-Dialog-content'
    )[0] as HTMLElement;
    if (!content.contains(event.target as HTMLElement)) {
      event.stopPropagation();
      event.preventDefault();
      if (this._hasClose && !this._lastMouseDownInDialog) {
        this.reject();
      }
      return;
    }
    for (const buttonNode of this._buttonNodes) {
      if (buttonNode.contains(event.target as HTMLElement)) {
        const index = this._buttonNodes.indexOf(buttonNode);
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
      case 27: // Escape.
        event.stopPropagation();
        event.preventDefault();
        if (this._hasClose) {
          this.reject();
        }
        break;
      case 37: {
        // Left arrow
        const activeEl = document.activeElement;

        if (activeEl instanceof HTMLButtonElement) {
          let idx = this._buttonNodes.indexOf(activeEl) - 1;

          // Handle a left arrows on the first button
          if (idx < 0) {
            idx = this._buttonNodes.length - 1;
          }

          const node = this._buttonNodes[idx];
          event.stopPropagation();
          event.preventDefault();
          node.focus();
        }
        break;
      }
      case 39: {
        // Right arrow
        const activeEl = document.activeElement;

        if (activeEl instanceof HTMLButtonElement) {
          let idx = this._buttonNodes.indexOf(activeEl) + 1;

          // Handle a right arrows on the last button
          if (idx == this._buttons.length) {
            idx = 0;
          }

          const node = this._buttonNodes[idx];
          event.stopPropagation();
          event.preventDefault();
          node.focus();
        }
        break;
      }
      case 9: {
        // Tab.
        // Handle a tab on the last button.
        const node = this._buttonNodes[this._buttons.length - 1];
        if (document.activeElement === node && !event.shiftKey) {
          event.stopPropagation();
          event.preventDefault();
          this._first.focus();
        }
        break;
      }
      case 13: {
        // Enter.
        event.stopPropagation();
        event.preventDefault();

        const activeEl = document.activeElement;

        if (activeEl instanceof HTMLButtonElement) {
          const index = this._buttonNodes.indexOf(activeEl);
          if (index !== -1) {
            this.resolve(index);
          }
        } else if (!(activeEl instanceof HTMLTextAreaElement)) {
          const index = this._defaultButton;
          this.resolve(index);
        }
        break;
      }
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
    const target = event.target as HTMLElement;
    if (!this.node.contains(target as HTMLElement)) {
      event.stopPropagation();
      this._buttonNodes[this._defaultButton]?.focus();
    }
  }

  /**
   * Handle the `'mousedown'` event for the widget.
   *
   * @param event - The DOM event sent to the widget
   */
  protected _evtMouseDown(event: MouseEvent): void {
    const content = this.node.getElementsByClassName(
      'jp-Dialog-content'
    )[0] as HTMLElement;
    const target = event.target as HTMLElement;
    this._lastMouseDownInDialog = content.contains(target as HTMLElement);
  }

  /**
   * Resolve a button item.
   */
  private _resolve(button: Dialog.IButton): void {
    if (this._hasValidationErrors && button.accept) {
      // Do not allow accepting with validation errors
      return;
    }
    // Prevent loopback.
    const promise = this._promise;
    if (!promise) {
      this.dispose();
      return;
    }
    this._promise = null;
    ArrayExt.removeFirstOf(Private.launchQueue, promise.promise);
    const body = this._body;
    let value: T | null = null;
    if (
      button.accept &&
      body instanceof Widget &&
      typeof body.getValue === 'function'
    ) {
      value = body.getValue();
    }
    this.dispose();
    promise.resolve({
      button,
      isChecked:
        this._checkboxNode?.querySelector<HTMLInputElement>('input')?.checked ??
        null,
      value
    });
  }

  private _hasValidationErrors: boolean = false;
  private _ready: PromiseDelegate<void> = new PromiseDelegate<void>();
  private _buttonNodes: ReadonlyArray<HTMLButtonElement>;
  private _buttons: ReadonlyArray<Dialog.IButton>;
  private _checkboxNode: HTMLElement | null;
  private _original: HTMLElement;
  private _first: HTMLElement;
  private _primary: HTMLElement;
  private _promise: PromiseDelegate<Dialog.IResult<T>> | null;
  private _defaultButton: number;
  private _host: HTMLElement;
  private _hasClose: boolean;
  private _body: Dialog.Body<T>;
  private _lastMouseDownInDialog: boolean;
  private _focusNodeSelector: string | undefined = '';
  private _bodyWidget: Widget;
}

/**
 * The namespace for Dialog class statics.
 */
export namespace Dialog {
  /**
   * Translator object.
   */
  export let translator: ITranslator = nullTranslator;

  /**
   * The body input types.
   */
  export type Body<T> = IBodyWidget<T> | React.ReactElement<any> | string;

  /**
   * The header input types.
   */
  export type Header = React.ReactElement<any> | string;

  /**
   * A widget used as a dialog body.
   */
  export interface IBodyWidget<T = string> extends Widget {
    /**
     * Get the serialized value of the widget.
     */
    getValue?(): T;
  }

  /**
   * The options used to make a button item.
   */
  export interface IButton {
    /**
     * The aria label for the button.
     */
    ariaLabel: string;
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
     * The additional dialog actions to perform when the button is clicked.
     */
    actions: Array<string>;

    /**
     * The button display type.
     */
    displayType: 'default' | 'warn';
  }

  /**
   * The options used to make a checkbox item.
   */
  export interface ICheckbox {
    /**
     * The label for the checkbox.
     */
    label: string;

    /**
     * The caption for the checkbox.
     */
    caption: string;

    /**
     * The initial checkbox state.
     */
    checked: boolean;

    /**
     * The extra class name for the checkbox.
     */
    className: string;
  }

  /**
   * Error object interface
   */
  export interface IError {
    /**
     * Error message
     */
    message: string | React.ReactElement<any>;
  }

  /**
   * The options used to create a dialog.
   */
  export interface IOptions<T> {
    /**
     * The top level text for the dialog.  Defaults to an empty string.
     */
    title: Header;

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
    body: Body<T>;

    /**
     * The host element for the dialog. Defaults to `document.body`.
     */
    host: HTMLElement;

    /**
     * The buttons to display. Defaults to cancel and accept buttons.
     */
    buttons: ReadonlyArray<IButton>;

    /**
     * The checkbox to display in the footer. Defaults no checkbox.
     */
    checkbox: Partial<ICheckbox> | null;

    /**
     * The index of the default button. Defaults to the last button.
     */
    defaultButton: number;

    /**
     * A selector for the primary element that should take focus in the dialog.
     * Defaults to an empty string, causing the [[defaultButton]] to take
     * focus.
     */
    focusNodeSelector: string;

    /**
     * When "false", disallows user from dismissing the dialog by clicking outside it
     * or pressing escape. Defaults to "true", which renders a close button.
     */
    hasClose: boolean;

    /**
     * An optional renderer for dialog items.  Defaults to a shared
     * default renderer.
     */
    renderer: IRenderer;
  }

  /**
   * A dialog renderer.
   */
  export interface IRenderer {
    /**
     * Create the header of the dialog.
     *
     * @param title - The title of the dialog.
     *
     * @returns A widget for the dialog header.
     */
    createHeader<T>(
      title: Header,
      reject: () => void,
      options: Partial<Dialog.IOptions<T>>
    ): Widget;

    /**
     * Create the body of the dialog.
     *
     * @param body - The input value for the body.
     *
     * @returns A widget for the body.
     */
    createBody(body: Body<any>): Widget;

    /**
     * Create the footer of the dialog.
     *
     * @param buttons - The button nodes to add to the footer.
     * @param checkbox - The checkbox node to add to the footer.
     *
     * @returns A widget for the footer.
     */
    createFooter(
      buttons: ReadonlyArray<HTMLElement>,
      checkbox: HTMLElement | null
    ): Widget;

    /**
     * Create a button node for the dialog.
     *
     * @param button - The button data.
     *
     * @returns A node for the button.
     */
    createButtonNode(button: IButton): HTMLButtonElement;

    /**
     * Create a checkbox node for the dialog.
     *
     * @param checkbox - The checkbox data.
     *
     * @returns A node for the checkbox.
     */
    createCheckboxNode(checkbox: ICheckbox): HTMLElement;
  }

  /**
   * The result of a dialog.
   */
  export interface IResult<T> {
    /**
     * The button that was pressed.
     */
    button: IButton;

    /**
     * State of the dialog checkbox.
     *
     * #### Notes
     * It will be null if no checkbox is defined for the dialog.
     */
    isChecked: boolean | null;

    /**
     * The value retrieved from `.getValue()` if given on the widget.
     */
    value: T | null;
  }

  /**
   * Create a button item.
   */
  export function createButton(value: Partial<IButton>): Readonly<IButton> {
    value.accept = value.accept !== false;
    const trans = translator.load('jupyterlab');
    const defaultLabel = value.accept ? trans.__('Ok') : trans.__('Cancel');
    return {
      ariaLabel: value.ariaLabel || value.label || defaultLabel,
      label: value.label || defaultLabel,
      iconClass: value.iconClass || '',
      iconLabel: value.iconLabel || '',
      caption: value.caption || '',
      className: value.className || '',
      accept: value.accept,
      actions: value.actions || [],
      displayType: value.displayType || 'default'
    };
  }

  /**
   * Create a reject button.
   */
  export function cancelButton(
    options: Partial<IButton> = {}
  ): Readonly<IButton> {
    options.accept = false;
    return createButton(options);
  }

  /**
   * Create an accept button.
   */
  export function okButton(options: Partial<IButton> = {}): Readonly<IButton> {
    options.accept = true;
    return createButton(options);
  }

  /**
   * Create a warn button.
   */
  export function warnButton(
    options: Partial<IButton> = {}
  ): Readonly<IButton> {
    options.displayType = 'warn';
    return createButton(options);
  }

  /**
   * Disposes all dialog instances.
   *
   * #### Notes
   * This function should only be used in tests or cases where application state
   * may be discarded.
   */
  export function flush(): void {
    tracker.forEach(dialog => {
      dialog.dispose();
    });
  }

  /**
   * The default implementation of a dialog renderer.
   */
  export class Renderer {
    /**
     * Create the header of the dialog.
     *
     * @param title - The title of the dialog.
     *
     * @returns A widget for the dialog header.
     */
    createHeader<T>(
      title: Header,
      reject: () => void = () => {
        /* empty */
      },
      options: Partial<Dialog.IOptions<T>> = {}
    ): Widget {
      let header: Widget;

      const handleMouseDown = (event: React.MouseEvent) => {
        // Fire action only when left button is pressed.
        if (event.button === 0) {
          event.preventDefault();
          reject();
        }
      };

      const handleKeyDown = (event: React.KeyboardEvent) => {
        const { key } = event;
        if (key === 'Enter' || key === ' ') {
          reject();
        }
      };

      if (typeof title === 'string') {
        const trans = translator.load('jupyterlab');
        header = ReactWidget.create(
          <>
            {title}
            {options.hasClose && (
              <Button
                className="jp-Dialog-close-button"
                onMouseDown={handleMouseDown}
                onKeyDown={handleKeyDown}
                title={trans.__('Cancel')}
                minimal
              >
                <LabIcon.resolveReact icon={closeIcon} tag="span" />
              </Button>
            )}
          </>
        );
      } else {
        header = ReactWidget.create(title);
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
    createBody(value: Body<any>): Widget {
      const styleReactWidget = (widget: ReactWidget) => {
        if (widget.renderPromise !== undefined) {
          widget.renderPromise
            .then(() => {
              Styling.styleNode(widget.node);
            })
            .catch(() => {
              console.error("Error while loading Dialog's body");
            });
        } else {
          Styling.styleNode(widget.node);
        }
      };

      let body: Widget;
      if (typeof value === 'string') {
        body = new Widget({ node: document.createElement('span') });
        body.node.textContent = value;
      } else if (value instanceof Widget) {
        body = value;
        if (body instanceof ReactWidget) {
          styleReactWidget(body);
        } else {
          Styling.styleNode(body.node);
        }
      } else {
        body = ReactWidget.create(value);
        // Immediately update the body even though it has not yet attached in
        // order to trigger a render of the DOM nodes from the React element.
        MessageLoop.sendMessage(body, Widget.Msg.UpdateRequest);
        styleReactWidget(body as ReactWidget);
      }
      body.addClass('jp-Dialog-body');
      return body;
    }

    /**
     * Create the footer of the dialog.
     *
     * @param buttons - The buttons nodes to add to the footer.
     * @param checkbox - The checkbox node to add to the footer.
     *
     * @returns A widget for the footer.
     */
    createFooter(
      buttons: ReadonlyArray<HTMLElement>,
      checkbox: HTMLElement | null
    ): Widget {
      const footer = new Widget();

      footer.addClass('jp-Dialog-footer');
      if (checkbox) {
        footer.node.appendChild(checkbox);
        footer.node.insertAdjacentHTML(
          'beforeend',
          '<div class="jp-Dialog-spacer"></div>'
        );
      }
      const footerButton = document.createElement('div');
      footerButton.classList.add('jp-Dialog-footerButtons');
      for (const button of buttons) {
        footerButton.appendChild(button);
      }
      footer.node.appendChild(footerButton);
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
    createButtonNode(button: IButton): HTMLButtonElement {
      const e = document.createElement('button');
      e.className = this.createItemClass(button);
      e.appendChild(this.renderIcon(button));
      e.appendChild(this.renderLabel(button));
      return e;
    }

    /**
     * Create a checkbox node for the dialog.
     *
     * @param checkbox - The checkbox data.
     *
     * @returns A node for the checkbox.
     */
    createCheckboxNode(checkbox: ICheckbox): HTMLElement {
      const e = document.createElement('label');
      e.className = 'jp-Dialog-checkbox';
      if (checkbox.className) {
        e.classList.add(checkbox.className);
      }
      e.title = checkbox.caption;
      e.textContent = checkbox.label;
      const input = document.createElement('input') as HTMLInputElement;
      input.type = 'checkbox';
      input.checked = !!checkbox.checked;
      e.insertAdjacentElement('afterbegin', input);
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
      const extra = data.className;
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
      e.appendChild(document.createTextNode(data.iconLabel));
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
      const name = 'jp-Dialog-buttonIcon';
      const extra = data.iconClass;
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
      e.ariaLabel = data.ariaLabel;
      e.appendChild(document.createTextNode(data.label));
      return e;
    }
  }

  /**
   * The default renderer instance.
   */
  export const defaultRenderer = new Renderer();

  /**
   * The dialog widget tracker.
   */
  export const tracker = new WidgetTracker<Dialog<any>>({
    namespace: '@jupyterlab/apputils:Dialog'
  });
}

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * The queue for launching dialogs.
   */
  export const launchQueue: Promise<Dialog.IResult<any>>[] = [];

  export const errorMessagePromiseCache: Map<string, Promise<void>> = new Map();

  /**
   * Handle the input options for a dialog.
   *
   * @param options - The input options.
   *
   * @returns A new options object with defaults applied.
   */
  export function handleOptions<T>(
    options: Partial<Dialog.IOptions<T>> = {}
  ): Dialog.IOptions<T> {
    const buttons = options.buttons ?? [
      Dialog.cancelButton(),
      Dialog.okButton()
    ];
    return {
      title: options.title ?? '',
      body: options.body ?? '',
      host: options.host ?? document.body,
      checkbox: options.checkbox ?? null,
      buttons,
      defaultButton: options.defaultButton ?? buttons.length - 1,
      renderer: options.renderer ?? Dialog.defaultRenderer,
      focusNodeSelector: options.focusNodeSelector ?? '',
      hasClose: options.hasClose ?? true
    };
  }

  /**
   *  Find the first focusable item in the dialog.
   */
  export function findFirstFocusable(node: HTMLElement): HTMLElement {
    const candidateSelectors = [
      'input',
      'select',
      'a[href]',
      'textarea',
      'button',
      '[tabindex]'
    ].join(',');
    return node.querySelectorAll(candidateSelectors)[0] as HTMLElement;
  }
}
