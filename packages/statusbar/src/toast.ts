import {
  IToaster as IBPToaster,
  Toaster as BPToaster,
  Position,
  IToastProps,
  IActionProps,
  IconName,
  IToastOptions
} from '@blueprintjs/core';

import { Intent } from '@jupyterlab/ui-components';

import { Token } from '@phosphor/coreutils';

export const TOASTERCLASSNAME = 'jp-toaster';

export const TOASTCLASSNAME = 'jp-toast';

export const TOASTBUTTONCLASSNAME = 'jp-toast-button';

// tslint:disable-next-line:variable-name
export const IToaster = new Token<IToaster>('@jupyterlab/statusbar:IToaster');

/**
 * Container object of all toasts.
 */
export interface IToaster {
  /**
   * Dismiss all toasts instantly.
   */
  clear(): void;

  /**
   * Dismiss the given toast instantly.
   *
   * @param key Toast unique key
   */
  dismiss(key: string): void;

  /**
   * Display an toast message with error format.
   *
   * @param options Toast options
   * @returns Unique key of the created toast
   */
  error(options: IToaster.IOptions): string;

  /**
   * Return the model of all active toasts.
   *
   * @returns Array of active toast models
   */
  getToasts(): IToaster.IModel[];

  /**
   * Display an toast message with information format.
   *
   * @param options Toast options
   * @returns Unique key of the created toast
   */
  info(options: IToaster.IOptions): string;

  /**
   * Show a new toast to the user or update an existing one corresponding
   * to the provided key option.
   *
   * @param model Toast model
   * @returns Toast unique key
   */
  show(model: IToaster.IModel): string;

  /**
   * Display an toast message with success format.
   *
   * @param options Toast options
   * @returns Unique key of the created toast
   */
  success(options: IToaster.IOptions): string;

  /**
   * Display an toast message with warning format.
   *
   * @param options Toast options
   * @returns Unique key of the created toast
   */
  warning(options: IToaster.IOptions): string;
}

/**
 * A namespace for toast
 */
export namespace IToaster {
  /**
   * Optional action associated to a toast.
   */
  export interface IAction {
    /**
     * Click event handler
     */
    onClick: (event: React.MouseEvent<HTMLElement>) => void;
    /**
     * Button label
     */
    label: string;
  }

  /**
   * Available option when creating a toast.
   */
  export interface IOptions {
    /**
     * Actions rendered as button
     */
    action?: IAction;
    /**
     * Message to display in the body of the toast
     */
    message: React.ReactNode;
    /**
     * Callback invoked when the toast is dismissed by the user or by the timeout.
     *
     * @param didTimeoutExpire true if the toast is dismissed due to timeout expiration.
     */
    onDismiss?: (didTimeoutExpire: boolean) => void;
    /**
     * Milliseconds to wait before automatically dismissing toast. A value less or
     * equal to 0 will disable the timeout.
     */
    timeout?: number;
  }

  /**
   * Toast model
   */
  export interface IModel extends IOptions {
    /**
     * Unique key of the toast
     */
    key?: string;
    /**
     * Visual type color to apply to the toast.
     */
    type?: Intent;
    /**
     * Icon to illustrating the toast
     */
    icon?: string;
  }
}

export class Toaster implements IToaster {
  constructor() {
    this._toaster = BPToaster.create({
      className: TOASTERCLASSNAME,
      position: Position.BOTTOM_RIGHT
    });
  }

  /**
   * Dismiss all toasts instantly.
   */
  clear(): void {
    this._toaster.clear();
  }

  /**
   * Dismiss the given toast instantly.
   *
   * @param key Toast unique key
   */
  dismiss(key: string): void {
    this._toaster.dismiss(key);
  }

  /**
   * Display an toast message with error format.
   * By default, there is no time out to dismiss error toast.
   *
   * @param message Toast message
   * @param options Toast options
   * @returns Unique key of the created toast
   */
  error(options: IToaster.IOptions): string {
    let model: IToaster.IModel = {
      ...options,
      timeout: options.timeout || 0,
      type: 'danger',
      icon: 'error'
    };
    return this.show(model);
  }

  /**
   * Return the model of all active toasts.
   *
   * @returns Array of active toast models
   */
  getToasts(): IToaster.IModel[] {
    return this._toaster.getToasts().map(props => this._toModel(props));
  }

  /**
   * Display an toast message with information format.
   *
   * @param message Toast message
   * @param options Toast options
   * @returns Unique key of the created toast
   */
  info(options: IToaster.IOptions): string {
    let model: IToaster.IModel = {
      ...options,
      type: 'primary',
      icon: 'info-sign'
    };
    return this.show(model);
  }

  /**
   * Show a new toast to the user or update an existing one corresponding
   * to the provided key option.
   *
   * @param model Toast model
   * @returns Toast unique key
   */
  show(model: IToaster.IModel): string {
    return this._toaster.show(this._toBluePrint(model), model.key);
  }

  /**
   * Display an toast message with success format.
   *
   * @param message Toast message
   * @param options Toast options
   * @returns Unique key of the created toast
   */
  success(options: IToaster.IOptions): string {
    let model: IToaster.IModel = {
      ...options,
      type: 'success',
      icon: 'tick'
    };
    return this.show(model);
  }

  /**
   * Display an toast message with warning format.
   * By default, there is no time out to dismiss warning toast.
   *
   * @param message Toast message
   * @param options Toast options
   * @returns Unique key of the created toast
   */
  warning(options: IToaster.IOptions): string {
    let model: IToaster.IModel = {
      ...options,
      timeout: options.timeout || 0,
      type: 'warning',
      icon: 'warning-sign'
    };
    return this.show(model);
  }

  private _toBluePrint(model: IToaster.IModel): IToastProps {
    let action: IActionProps;
    if (model.action) {
      action = {
        onClick: model.action.onClick,
        text: model.action.label,
        className: TOASTBUTTONCLASSNAME
      };
    }

    let className = TOASTCLASSNAME;
    const intent = model.type ? model.type : 'none';
    const classIntent: { [intent: string]: string } = {
      none: '',
      primary: 'jp-mod-primary',
      success: 'jp-mod-success',
      warning: 'jp-mod-warning',
      danger: 'jp-mod-danger'
    };
    className += ' ' + classIntent[intent];

    return {
      action,
      className,
      icon: model.icon as IconName,
      intent,
      message: model.message,
      onDismiss: model.onDismiss,
      timeout: model.timeout
    };
  }

  private _toModel(props: IToastOptions): IToaster.IModel {
    let action: IToaster.IAction;
    if (props.action) {
      action = {
        label: String(props.action.text),
        onClick: props.action.onClick
      };
    }
    return {
      action,
      icon: props.icon as string,
      key: undefined,
      message: props.message,
      onDismiss: props.onDismiss,
      timeout: props.timeout,
      type: props.intent
    };
  }

  private _toaster: IBPToaster;
}
