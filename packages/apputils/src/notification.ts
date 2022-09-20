import { ReadonlyJSONValue, UUID } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';

export class NotificationManager implements IDisposable {
  constructor() {
    this._isDisposed = false;
    this._changed = new Signal<NotificationManager, Notification.IChange>(this);
  }

  get changed(): ISignal<NotificationManager, Notification.IChange> {
    return this._changed;
  }

  get count(): number {
    return this._queue.length;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  get notifications(): Notification.INotification[] {
    return this._queue.slice();
  }

  /**
   * Dismiss one toast (specified by its id) or all if no id provided
   *
   * @param id Toast id
   * @returns False or void
   */
  dismiss(id?: string): void {
    if (typeof id === 'undefined') {
      const q = this._queue.slice();
      this._queue.length = 0;
      for (const notification of q) {
        this._changed.emit({
          type: 'removed',
          notification
        });
      }
    } else {
      const notificationIndex = this._queue.findIndex(n => n.id === id);
      if (notificationIndex > -1) {
        const notification = this._queue.splice(notificationIndex, 1)[0];
        this._changed.emit({
          type: 'removed',
          notification
        });
      }
    }
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._isDisposed = true;
    Signal.clearData(this);
  }

  has(id: string): boolean {
    return this._queue.findIndex(n => n.id === id) > -1;
  }

  notify<T extends ReadonlyJSONValue>(
    message: string,
    type: Notification.TypeOptions,
    options: Notification.IOptions<T>
  ): string {
    const now = Date.now();
    const notification: Notification.INotification = Object.freeze({
      id: UUID.uuid4(),
      createAt: now,
      modifiedAt: now,
      message,
      type,
      options: {
        // By default notification will be silent
        autoClose: 0,
        ...options
      }
    });

    this._changed.emit({
      type: 'added',
      notification
    });

    return notification.id;
  }

  /**
   * Update an existing toast.
   *
   * If the toast is inactive (i.e. closed), a new one with the provided id
   * will be created with the new content.
   *
   * @param args Update options
   */
  update<T extends ReadonlyJSONValue>(args: Notification.IUpdate<T>): void {
    const { id, message, actions, autoClose, data, type } = args;
    const notificationIndex = this._queue.findIndex(n => n.id === id);
    if (notificationIndex > -1) {
      const oldNotification = this._queue[notificationIndex];
      // We need to create a new object as notification are frozen; i.e. cannot be edited
      const notification = Object.freeze({
        ...oldNotification,
        message,
        type: type ?? oldNotification.type,
        options: {
          actions: actions ?? oldNotification.options.actions,
          autoClose: autoClose ?? oldNotification.options.autoClose,
          data: data ?? oldNotification.options.data
        },
        modifiedAt: Date.now()
      });
      this._changed.emit({
        type: 'updated',
        notification
      });
    }
  }

  private _isDisposed: boolean;
  private _changed: Signal<NotificationManager, Notification.IChange>;
  private _queue: Notification.INotification[];
}

export namespace Notification {
  export const manager = new NotificationManager();

  /**
   * Helper function to show an error notification. Those
   * notifications need an user action to close.
   *
   * @param message Message to be printed in the notification
   * @param options Options for the error notification
   * @returns ToastId
   */
  export function error<T extends ReadonlyJSONValue = ReadonlyJSONValue>(
    message: string,
    options: IOptions<T> = {}
  ): string {
    return manager.notify<T>(message, 'error', options);
  }
  /**
   * Helper function to show a warning notification. Those
   * notifications need an user action to close.
   *
   * @param message Message to be printed in the notification
   * @param options Options for the warning notification
   * @returns ToastId
   */
  export function warning<T extends ReadonlyJSONValue = ReadonlyJSONValue>(
    message: string,
    options: IOptions<T> = {}
  ): string {
    return manager.notify<T>(message, 'warning', options);
  }

  /**
   * Helper function to show an informative notification. Those
   * notifications close automatically.
   *
   * @param message Message to be printed in the notification
   * @param options Options for the error notification
   * @returns ToastId
   */
  export function info<T extends ReadonlyJSONValue = ReadonlyJSONValue>(
    message: string,
    options: IOptions<T> = {}
  ): string {
    return manager.notify<T>(message, 'info', options);
  }

  /**
   * Helper function to show a success notification. Those
   * notifications close automatically.
   *
   * @param message Message to be printed in the notification
   * @param options Options for the error notification
   * @returns ToastId
   */
  export function success<T extends ReadonlyJSONValue = ReadonlyJSONValue>(
    message: string,
    options: IOptions<T> = {}
  ): string {
    return manager.notify<T>(message, 'success', options);
  }

  /**
   * Helper function to show a in progress notification. Those
   * notifications do not close automatically.
   *
   * @param options Options for the error notification
   * @returns ToastId
   */
  export function promise<
    Pending extends ReadonlyJSONValue = ReadonlyJSONValue,
    Success extends ReadonlyJSONValue = Pending,
    Error extends ReadonlyJSONValue = Pending
  >(
    promise: Promise<Success>,
    options: IPromiseOptions<Pending, Success, Error>
  ): string {
    const { pending, error, success } = options;
    const id = manager.notify<Pending>(
      pending.message,
      'in-progress',
      pending.options
    );
    promise
      .then(data => {
        manager.update<Success>({
          id,
          message: success.message,
          type: 'success',
          ...success.options,
          data: success.options.data ?? data
        });
      })
      .catch(reason => {
        manager.update<Error>({
          id,
          message: error.message,
          type: 'error',
          ...error.options,
          data: error.options.data ?? reason
        });
      });
    return id;
  }

  /** Options needed to update an existing toast */
  export interface IUpdate<T extends ReadonlyJSONValue> extends IOptions<T> {
    /** Id of the toast to be updated */
    id: string;
    /** New message to be displayed */
    message: string;
    /** New type of the toast */
    type?: TypeOptions;
  }

  /**
   * Update an existing toast.
   *
   * If the toast is inactive (i.e. closed), a new one with the provided id
   * will be created with the new content.
   *
   * @param args Update options
   */
  export function update<T extends ReadonlyJSONValue = ReadonlyJSONValue>(
    args: IUpdate<T>
  ): void {
    manager.update(args);
  }

  /**
   * Dismiss one toast (specified by its id) or all if no id provided
   *
   * @param id Toast id
   * @returns False or void
   */
  export function dismiss(id?: string): void {
    manager.dismiss(id);
  }

  export interface IAction {
    /**
     * The label for the action.
     */
    label: string;

    /**
     * Callback function
     */
    callback: () => void;

    /**
     * The caption for the action component.
     */
    caption?: string;

    /**
     * The extra class name for the action component.
     */
    className?: string;
  }

  /**
   * Notification description
   */
  export interface INotification<
    T extends ReadonlyJSONValue = ReadonlyJSONValue
  > {
    id: string;
    message: string;
    createAt: number;
    modifiedAt: number;
    type: TypeOptions;
    options: IOptions<T>;
  }

  export interface IChange {
    type: 'added' | 'removed' | 'updated';
    notification: INotification;
  }

  /**
   * Notification options
   */
  export interface IOptions<T extends ReadonlyJSONValue> {
    /**
     * Autoclosing behavior - undefined (not closing automatically)
     * or number (time in milliseconds before hiding the notification)
     *
     * Set to zero if you want the notification to be retained in the notification
     * center but not displayed as toast.
     */
    autoClose?: number | false;
    /**
     * List of associated actions
     */
    actions?: Array<IAction>;

    data?: T;
  }

  export interface IPromiseOptions<
    Pending extends ReadonlyJSONValue,
    Success extends ReadonlyJSONValue = Pending,
    Error extends ReadonlyJSONValue = Pending
  > {
    /**
     * Pending message and options
     */
    pending: { message: string; options: IOptions<Pending> };
    /**
     * Message when promise resolves and options
     */
    success: { message: string; options: IOptions<Success> };
    /**
     * Message when promise rejects and options
     */
    error: { message: string; options: IOptions<Error> };
  }

  export type TypeOptions =
    | 'info'
    | 'in-progress'
    | 'success'
    | 'warning'
    | 'error'
    | 'default';
}
