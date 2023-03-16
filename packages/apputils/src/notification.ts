/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ReadonlyJSONValue, UUID } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';

/**
 * Notification manager
 */
export class NotificationManager implements IDisposable {
  constructor() {
    this._isDisposed = false;
    this._queue = [];
    this._changed = new Signal<NotificationManager, Notification.IChange>(this);
  }

  /**
   * Signal emitted whenever a notification changes.
   */
  get changed(): ISignal<NotificationManager, Notification.IChange> {
    return this._changed;
  }

  /**
   * Total number of notifications.
   */
  get count(): number {
    return this._queue.length;
  }

  /**
   * Whether the manager is disposed or not.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * The list of notifications.
   */
  get notifications(): Notification.INotification[] {
    return this._queue.slice();
  }

  /**
   * Dismiss one notification (specified by its id) or all if no id provided.
   *
   * @param id Notification id
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

  /**
   * Dispose the manager.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * Test whether a notification exists or not.
   *
   * @param id Notification id
   * @returns Notification status
   */
  has(id: string): boolean {
    return this._queue.findIndex(n => n.id === id) > -1;
  }

  /**
   * Add a new notification.
   *
   * This will trigger the `changed` signal with an `added` event.
   *
   * @param message Notification message
   * @param type Notification type
   * @param options Notification option
   * @returns Notification unique id
   */
  notify<T extends ReadonlyJSONValue = ReadonlyJSONValue>(
    message: string,
    type: Notification.TypeOptions,
    options: Notification.IOptions<T>
  ): string {
    const now = Date.now();
    const { progress, ...othersOptions } = options;
    const notification: Notification.INotification = Object.freeze({
      id: UUID.uuid4(),
      createdAt: now,
      modifiedAt: now,
      message,
      type,
      options: {
        // By default notification will be silent
        autoClose: 0,
        progress:
          typeof progress === 'number'
            ? Math.min(Math.max(0, progress), 1)
            : progress,
        ...othersOptions
      }
    });

    this._queue.unshift(notification);

    this._changed.emit({
      type: 'added',
      notification
    });

    return notification.id;
  }

  /**
   * Update an existing notification.
   *
   * If the notification does not exists this won't do anything.
   *
   * Once updated the notification will be moved at the begin
   * of the notification stack.
   *
   * @param args Update options
   * @returns Whether the update was successful or not.
   */
  update<T extends ReadonlyJSONValue = ReadonlyJSONValue>(
    args: Notification.IUpdate<T>
  ): boolean {
    const { id, message, actions, autoClose, data, progress, type } = args;
    const newProgress =
      typeof progress === 'number'
        ? Math.min(Math.max(0, progress), 1)
        : progress;
    const notificationIndex = this._queue.findIndex(n => n.id === id);
    if (notificationIndex > -1) {
      const oldNotification = this._queue[notificationIndex];
      // We need to create a new object as notification are frozen; i.e. cannot be edited
      const notification = Object.freeze({
        ...oldNotification,
        message: message ?? oldNotification.message,
        type: type ?? oldNotification.type,
        options: {
          actions: actions ?? oldNotification.options.actions,
          autoClose: autoClose ?? oldNotification.options.autoClose,
          data: data ?? oldNotification.options.data,
          progress: newProgress ?? oldNotification.options.progress
        },
        modifiedAt: Date.now()
      });

      this._queue.splice(notificationIndex, 1);
      this._queue.unshift(notification);

      this._changed.emit({
        type: 'updated',
        notification
      });
      return true;
    }

    return false;
  }

  private _isDisposed: boolean;
  private _changed: Signal<NotificationManager, Notification.IChange>;
  private _queue: Notification.INotification[];
}

/**
 * Notification namespace
 */
export namespace Notification {
  /**
   * Enumeration of available action display type.
   */
  export type ActionDisplayType = 'default' | 'accent' | 'warn' | 'link';

  /**
   * Interface describing an action linked to a notification.
   */
  export interface IAction {
    /**
     * The action label.
     *
     * This should be a short description.
     */
    label: string;

    /**
     * Callback function to trigger
     *
     * ### Notes
     * By default execution of the callback will close the toast
     * and dismiss the notification. You can prevent this by calling
     * `event.preventDefault()` in the callback.
     */
    callback: (event: MouseEvent) => void;

    /**
     * The action caption.
     *
     * This can be a longer description of the action.
     */
    caption?: string;

    /**
     * The action display type.
     *
     * This will be used to modify the action button style.
     */
    displayType?: ActionDisplayType;
  }

  /**
   * Notification interface
   */
  export interface INotification<
    T extends ReadonlyJSONValue = ReadonlyJSONValue
  > {
    /**
     * Notification unique identifier
     */
    id: string;
    /**
     * Notification message
     *
     * #### Notes
     * The message will be truncated if longer than 140 characters.
     */
    message: string;
    /**
     * Notification creation date
     */
    createdAt: number;
    /**
     * Notification modification date
     */
    modifiedAt: number;
    /**
     * Notification type
     */
    type: TypeOptions;
    /**
     * Notification options
     */
    options: IOptions<T>;
  }

  /**
   * Notification change interface
   */
  export interface IChange {
    /**
     * Change type
     */
    type: 'added' | 'removed' | 'updated';
    /**
     * Notification that changed
     */
    notification: INotification;
  }

  /**
   * Notification options
   */
  export interface IOptions<T extends ReadonlyJSONValue> {
    /**
     * Autoclosing behavior - false (not closing automatically)
     * or number (time in milliseconds before hiding the notification)
     *
     * Set to zero if you want the notification to be retained in the notification
     * center but not displayed as toast. This is the default behavior.
     */
    autoClose?: number | false;

    /**
     * List of associated actions
     */
    actions?: Array<IAction>;

    /**
     * Data associated with a notification
     */
    data?: T;

    /**
     * Task progression
     *
     * ### Notes
     * This should be a number between 0 (not started) and 1 (completed).
     */
    progress?: number;
  }

  /**
   * Parameters for notification depending on a promise.
   */
  export interface IPromiseOptions<
    Pending extends ReadonlyJSONValue,
    Success extends ReadonlyJSONValue = Pending,
    Error extends ReadonlyJSONValue = Pending
  > {
    /**
     * Promise pending message and options
     *
     * #### Notes
     * The message will be truncated if longer than 140 characters.
     */
    pending: { message: string; options?: IOptions<Pending> };
    /**
     * Message when promise resolves and options
     *
     * The message factory receives as first argument the result
     * of the promise and as second the success `options.data`.
     *
     * #### Notes
     * The message will be truncated if longer than 140 characters.
     */
    success: {
      message: (result: unknown, data?: Success) => string;
      options?: IOptions<Success>;
    };
    /**
     * Message when promise rejects and options
     *
     * The message factory receives as first argument the error
     * of the promise and as second the error `options.data`.
     *
     * #### Notes
     * The message will be truncated if longer than 140 characters.
     */
    error: {
      message: (reason: unknown, data?: Error) => string;
      options?: IOptions<Error>;
    };
  }

  /**
   * Type of notifications
   */
  export type TypeOptions =
    | 'info'
    | 'in-progress'
    | 'success'
    | 'warning'
    | 'error'
    | 'default';

  /**
   * Options for updating a notification
   */
  export interface IUpdate<T extends ReadonlyJSONValue> extends IOptions<T> {
    /**
     * Notification unique id
     */
    id: string;
    /**
     * New notification message
     */
    message?: string;
    /**
     * New notification type
     */
    type?: TypeOptions;
  }

  /**
   * The global notification manager.
   */
  export const manager = new NotificationManager();

  /**
   * Dismiss one notification (specified by its id) or all if no id provided
   *
   * @param id notification id
   */
  export function dismiss(id?: string): void {
    manager.dismiss(id);
  }

  /**
   * Helper function to emit a notification.
   *
   * #### Notes
   * The message will be truncated if longer than 140 characters.
   *
   * @param message Notification message
   * @param type Notification type
   * @param options Options for the error notification
   * @returns Notification unique id
   */
  export function emit<T extends ReadonlyJSONValue = ReadonlyJSONValue>(
    message: string,
    type: TypeOptions = 'default',
    options: IOptions<T> = {}
  ): string {
    return manager.notify<T>(message, type, options);
  }

  /**
   * Helper function to emit an error notification.
   *
   * #### Notes
   * The message will be truncated if longer than 140 characters.
   *
   * @param message Notification message
   * @param options Options for the error notification
   * @returns Notification unique id
   */
  export function error<T extends ReadonlyJSONValue = ReadonlyJSONValue>(
    message: string,
    options: IOptions<T> = {}
  ): string {
    return manager.notify<T>(message, 'error', options);
  }

  /**
   * Helper function to emit an info notification.
   *
   * #### Notes
   * The message will be truncated if longer than 140 characters.
   *
   * @param message Notification message
   * @param options Options for the info notification
   * @returns Notification unique id
   */
  export function info<T extends ReadonlyJSONValue = ReadonlyJSONValue>(
    message: string,
    options: IOptions<T> = {}
  ): string {
    return manager.notify<T>(message, 'info', options);
  }

  /**
   * Helper function to show an in-progress notification.
   *
   * #### Notes
   * The message will be truncated if longer than 140 characters.
   *
   * @param promise Promise to wait for
   * @param options Options for the in-progress notification
   * @returns Notification unique id
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
      pending.options ?? {}
    );
    promise
      .then(result => {
        manager.update<Success>({
          id,
          message: success.message(result, success.options?.data),
          type: 'success',
          ...success.options,
          data: success.options?.data ?? result
        });
      })
      .catch(reason => {
        manager.update<Error>({
          id,
          message: error.message(reason, error.options?.data),
          type: 'error',
          ...error.options,
          data: error.options?.data ?? reason
        });
      });
    return id;
  }

  /**
   * Helper function to emit a success notification.
   *
   * #### Notes
   * The message will be truncated if longer than 140 characters.
   *
   * @param message Notification message
   * @param options Options for the success notification
   * @returns Notification unique id
   */
  export function success<T extends ReadonlyJSONValue = ReadonlyJSONValue>(
    message: string,
    options: IOptions<T> = {}
  ): string {
    return manager.notify<T>(message, 'success', options);
  }

  /**
   * Helper function to update a notification.
   *
   * If the notification does not exists, nothing will happen.
   *
   * Once updated the notification will be moved at the begin
   * of the notification stack.
   *
   * #### Notes
   * The message will be truncated if longer than 140 characters.
   *
   * @param args Update options
   * @returns Whether the update was successful or not.
   */
  export function update<T extends ReadonlyJSONValue = ReadonlyJSONValue>(
    args: IUpdate<T>
  ): boolean {
    return manager.update(args);
  }

  /**
   * Helper function to emit a warning notification.
   *
   * #### Notes
   * The message will be truncated if longer than 140 characters.
   *
   * @param message Notification message
   * @param options Options for the warning notification
   * @returns Notification unique id
   */
  export function warning<T extends ReadonlyJSONValue = ReadonlyJSONValue>(
    message: string,
    options: IOptions<T> = {}
  ): string {
    return manager.notify<T>(message, 'warning', options);
  }
}
