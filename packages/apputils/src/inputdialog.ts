// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { Dialog, showDialog } from './dialog';

const INPUT_DIALOG_CLASS = 'jp-Input-Dialog';

const INPUT_BOOLEAN_DIALOG_CLASS = 'jp-Input-Boolean-Dialog';

/**
 * Namespace for input dialogs
 */
export namespace InputDialog {
  /**
   * Common constructor options for input dialogs
   */
  export interface IOptions extends IBaseOptions {
    /**
     * The top level text for the dialog. Defaults to an empty string.
     */
    title: Dialog.Header;

    /**
     * The host element for the dialog. Defaults to `document.body`.
     */
    host?: HTMLElement;

    /**
     * An optional renderer for dialog items. Defaults to a shared
     * default renderer.
     */
    renderer?: Dialog.IRenderer;

    /**
     * Label for ok button.
     */
    okLabel?: string;

    /**
     * Label for cancel button.
     */
    cancelLabel?: string;

    /**
     * The checkbox to display in the footer. Defaults no checkbox.
     */
    checkbox?: Partial<Dialog.ICheckbox> | null;

    /**
     * The index of the default button. Defaults to the last button.
     */
    defaultButton?: number;
  }

  /**
   * Constructor options for boolean input dialogs
   */
  export interface IBooleanOptions extends IOptions {
    /**
     * Default value
     */
    value?: boolean;
  }

  /**
   * Create and show a input dialog for a boolean.
   *
   * @param options - The dialog setup options.
   *
   * @returns A promise that resolves with whether the dialog was accepted
   */
  export function getBoolean(
    options: IBooleanOptions
  ): Promise<Dialog.IResult<boolean>> {
    return showDialog({
      ...options,
      body: new InputBooleanDialog(options),
      buttons: [
        Dialog.cancelButton({ label: options.cancelLabel }),
        Dialog.okButton({ label: options.okLabel })
      ],
      focusNodeSelector: 'input'
    });
  }

  /**
   * Constructor options for number input dialogs
   */
  export interface INumberOptions extends IOptions {
    /**
     * Default value
     */
    value?: number;
  }

  /**
   * Create and show a input dialog for a number.
   *
   * @param options - The dialog setup options.
   *
   * @returns A promise that resolves with whether the dialog was accepted
   */
  export function getNumber(
    options: INumberOptions
  ): Promise<Dialog.IResult<number>> {
    return showDialog({
      ...options,
      body: new InputNumberDialog(options),
      buttons: [
        Dialog.cancelButton({ label: options.cancelLabel }),
        Dialog.okButton({ label: options.okLabel })
      ],
      focusNodeSelector: 'input'
    });
  }

  /**
   * Constructor options for item selection input dialogs
   */
  export interface IItemOptions extends IOptions {
    /**
     * List of choices
     */
    items: Array<string>;
    /**
     * Default choice
     *
     * If the list is editable a string with a default value can be provided
     * otherwise the index of the default choice should be given.
     */
    current?: number | string;
    /**
     * Is the item editable?
     */
    editable?: boolean;
    /**
     * Placeholder text for editable input
     */
    placeholder?: string;
  }

  /**
   * Create and show a input dialog for a choice.
   *
   * @param options - The dialog setup options.
   *
   * @returns A promise that resolves with whether the dialog was accepted
   */
  export function getItem(
    options: IItemOptions
  ): Promise<Dialog.IResult<string>> {
    return showDialog({
      ...options,
      body: new InputItemsDialog(options),
      buttons: [
        Dialog.cancelButton({ label: options.cancelLabel }),
        Dialog.okButton({ label: options.okLabel })
      ],
      focusNodeSelector: options.editable ? 'input' : 'select'
    });
  }

  /**
   * Constructor options for item selection input dialogs
   */
  export interface IMultipleItemsOptions extends IOptions {
    /**
     * List of choices
     */
    items: Array<string>;
    /**
     * Default choices
     */
    defaults?: string[];
  }

  /**
   * Create and show a input dialog for a choice.
   *
   * @param options - The dialog setup options.
   *
   * @returns A promise that resolves with whether the dialog was accepted
   */
  export function getMultipleItems(
    options: IMultipleItemsOptions
  ): Promise<Dialog.IResult<string[]>> {
    return showDialog({
      ...options,
      body: new InputMultipleItemsDialog(options),
      buttons: [
        Dialog.cancelButton({ label: options.cancelLabel }),
        Dialog.okButton({ label: options.okLabel })
      ]
    });
  }

  /**
   * Constructor options for text input dialogs
   */
  export interface ITextOptions extends IOptions {
    /**
     * Default input text
     */
    text?: string;
    /**
     * Placeholder text
     */
    placeholder?: string;
    /**
     * Selection range
     *
     * Number of characters to pre-select when dialog opens.
     * Default is to select the whole input text if present.
     */
    selectionRange?: number;
    /**
     * Pattern used by the browser to validate the input value.
     */
    pattern?: string;
    /**
     * Whether the input is required (has to be non-empty).
     */
    required?: boolean;
  }

  /**
   * Create and show a input dialog for a text.
   *
   * @param options - The dialog setup options.
   *
   * @returns A promise that resolves with whether the dialog was accepted
   */
  export function getText(
    options: ITextOptions
  ): Promise<Dialog.IResult<string>> {
    return showDialog({
      ...options,
      body: new InputTextDialog(options),
      buttons: [
        Dialog.cancelButton({ label: options.cancelLabel }),
        Dialog.okButton({ label: options.okLabel })
      ],
      focusNodeSelector: 'input'
    });
  }

  /**
   * Create and show a input dialog for a password.
   *
   * @param options - The dialog setup options.
   *
   * @returns A promise that resolves with whether the dialog was accepted
   */
  export function getPassword(
    options: Omit<ITextOptions, 'selectionRange'>
  ): Promise<Dialog.IResult<string>> {
    return showDialog({
      ...options,
      body: new InputPasswordDialog(options),
      buttons: [
        Dialog.cancelButton({ label: options.cancelLabel }),
        Dialog.okButton({ label: options.okLabel })
      ],
      focusNodeSelector: 'input'
    });
  }
}

/**
 * Constructor options for base input dialog body.
 */
interface IBaseOptions {
  /**
   * Label of the requested input
   */
  label?: string;

  /**
   * Additional prefix string preceding the input (e.g. £).
   */
  prefix?: string;

  /**
   * Additional suffix string following the input (e.g. $).
   */
  suffix?: string;
}

/**
 * Base widget for input dialog body
 */
class InputDialogBase<T> extends Widget implements Dialog.IBodyWidget<T> {
  /**
   * InputDialog constructor
   *
   * @param label Input field label
   */
  constructor(options: IBaseOptions) {
    super();
    this.addClass(INPUT_DIALOG_CLASS);

    this._input = document.createElement('input');
    this._input.classList.add('jp-mod-styled');
    this._input.id = 'jp-dialog-input-id';

    if (options.label !== undefined) {
      const labelElement = document.createElement('label');
      labelElement.textContent = options.label;
      labelElement.htmlFor = this._input.id;

      // Initialize the node
      this.node.appendChild(labelElement);
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'jp-InputDialog-inputWrapper';

    if (options.prefix) {
      const prefix = document.createElement('span');
      prefix.className = 'jp-InputDialog-inputPrefix';
      prefix.textContent = options.prefix;
      // Both US WDS (https://designsystem.digital.gov/components/input-prefix-suffix/)
      // and UK DS (https://design-system.service.gov.uk/components/text-input/) recommend
      // hiding prefixes and suffixes from screen readers.
      prefix.ariaHidden = 'true';
      wrapper.appendChild(prefix);
    }
    wrapper.appendChild(this._input);
    if (options.suffix) {
      const suffix = document.createElement('span');
      suffix.className = 'jp-InputDialog-inputSuffix';
      suffix.textContent = options.suffix;
      suffix.ariaHidden = 'true';
      wrapper.appendChild(suffix);
    }

    this.node.appendChild(wrapper);
  }

  /** Input HTML node */
  protected _input: HTMLInputElement;
}

/**
 * Widget body for input boolean dialog
 */
class InputBooleanDialog extends InputDialogBase<boolean> {
  /**
   * InputBooleanDialog constructor
   *
   * @param options Constructor options
   */
  constructor(options: InputDialog.IBooleanOptions) {
    super(options);
    this.addClass(INPUT_BOOLEAN_DIALOG_CLASS);

    this._input.type = 'checkbox';
    this._input.checked = options.value ? true : false;
  }

  /**
   * Get the text specified by the user
   */
  getValue(): boolean {
    return this._input.checked;
  }
}

/**
 * Widget body for input number dialog
 */
class InputNumberDialog extends InputDialogBase<number> {
  /**
   * InputNumberDialog constructor
   *
   * @param options Constructor options
   */
  constructor(options: InputDialog.INumberOptions) {
    super(options);

    this._input.type = 'number';
    this._input.value = options.value ? options.value.toString() : '0';
  }

  /**
   * Get the number specified by the user.
   */
  getValue(): number {
    if (this._input.value) {
      return Number(this._input.value);
    } else {
      return Number.NaN;
    }
  }
}

/**
 * Base widget body for input text/password/email dialog
 */
class InputDialogTextBase extends InputDialogBase<string> {
  /**
   * InputDialogTextBase constructor
   *
   * @param options Constructor options
   */
  constructor(options: Omit<InputDialog.ITextOptions, 'selectionRange'>) {
    super(options);
    this._input.value = options.text ? options.text : '';
    if (options.placeholder) {
      this._input.placeholder = options.placeholder;
    }
    if (options.pattern) {
      this._input.pattern = options.pattern;
    }
    if (options.required) {
      this._input.required = options.required;
    }
  }

  /**
   * Get the text specified by the user
   */
  getValue(): string {
    return this._input.value;
  }
}

/**
 * Widget body for input text dialog
 */
class InputTextDialog extends InputDialogTextBase {
  /**
   * InputTextDialog constructor
   *
   * @param options Constructor options
   */
  constructor(options: InputDialog.ITextOptions) {
    super(options);
    this._input.type = 'text';

    this._initialSelectionRange = Math.min(
      this._input.value.length,
      Math.max(0, options.selectionRange ?? this._input.value.length)
    );
  }

  /**
   *  A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    if (this._initialSelectionRange > 0 && this._input.value) {
      this._input.setSelectionRange(0, this._initialSelectionRange);
    }
  }

  private _initialSelectionRange: number;
}

/**
 * Widget body for input password dialog
 */
class InputPasswordDialog extends InputDialogTextBase {
  /**
   * InputPasswordDialog constructor
   *
   * @param options Constructor options
   */
  constructor(options: InputDialog.ITextOptions) {
    super(options);
    this._input.type = 'password';
  }

  /**
   *  A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    if (this._input.value) {
      this._input.select();
    }
  }
}

/**
 * Widget body for input list dialog
 */
class InputItemsDialog extends InputDialogBase<string> {
  /**
   * InputItemsDialog constructor
   *
   * @param options Constructor options
   */
  constructor(options: InputDialog.IItemOptions) {
    super(options);

    this._editable = options.editable || false;

    let current = options.current || 0;
    let defaultIndex: number;
    if (typeof current === 'number') {
      defaultIndex = Math.max(0, Math.min(current, options.items.length - 1));
      current = '';
    }

    this._list = document.createElement('select');
    options.items.forEach((item, index) => {
      const option = document.createElement('option');
      if (index === defaultIndex) {
        option.selected = true;
        current = item;
      }
      option.value = item;
      option.textContent = item;
      this._list.appendChild(option);
    });

    if (options.editable) {
      /* Use of list and datalist */
      const data = document.createElement('datalist');
      data.id = 'input-dialog-items';
      data.appendChild(this._list);

      this._input.type = 'list';
      this._input.value = current;
      this._input.setAttribute('list', data.id);
      if (options.placeholder) {
        this._input.placeholder = options.placeholder;
      }
      this.node.appendChild(data);
    } else {
      /* Use select directly */
      this._input.parentElement!.replaceChild(this._list, this._input);
    }
  }

  /**
   * Get the user choice
   */
  getValue(): string {
    if (this._editable) {
      return this._input.value;
    } else {
      return this._list.value;
    }
  }

  private _list: HTMLSelectElement;
  private _editable: boolean;
}

/**
 * Widget body for input list dialog
 */
class InputMultipleItemsDialog extends InputDialogBase<string> {
  /**
   * InputMultipleItemsDialog constructor
   *
   * @param options Constructor options
   */
  constructor(options: InputDialog.IMultipleItemsOptions) {
    super(options);

    let defaults = options.defaults || [];

    this._list = document.createElement('select');
    this._list.setAttribute('multiple', '');

    options.items.forEach(item => {
      const option = document.createElement('option');
      option.value = item;
      option.textContent = item;
      this._list.appendChild(option);
    });

    // use the select
    this._input.remove();
    this.node.appendChild(this._list);

    // select the current ones
    const htmlOptions = this._list.options;
    for (let i: number = 0; i < htmlOptions.length; i++) {
      const option = htmlOptions[i];
      if (defaults.includes(option.value)) {
        option.selected = true;
      } else {
        option.selected = false;
      }
    }
  }

  /**
   * Get the user choices
   */
  getValue(): string[] {
    let result = [];
    for (let opt of this._list.options) {
      if (opt.selected && !opt.classList.contains('hidden')) {
        result.push(opt.value || opt.text);
      }
    }
    return result;
  }

  private _list: HTMLSelectElement;
}
