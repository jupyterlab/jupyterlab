/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  ISanitizer,
  Notification,
  NotificationManager,
  ReactWidget
} from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  GroupItem,
  IStatusBar,
  showPopup,
  TextItem
} from '@jupyterlab/statusbar';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  bellIcon,
  Button,
  closeIcon,
  UseSignal,
  VDomModel
} from '@jupyterlab/ui-components';
import { ReadonlyJSONObject, ReadonlyJSONValue } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import type {
  ClearWaitingQueueParams,
  CloseButtonProps,
  Id,
  default as ReactToastify,
  ToastContent,
  ToastItem,
  ToastOptions,
  UpdateOptions
} from 'react-toastify';

namespace CommandIDs {
  export const notify = 'apputils:notify';

  export const dismiss = 'apputils:dismiss-notification';
}

/**
 * Half spacing between subitems in a status item.
 */
const HALF_SPACING = 4;

function NotificationCenter(props: {
  manager: NotificationManager;
}): JSX.Element {
  return (
    <ul>
      {props.manager.notifications.map(notification => (
        <li key={notification.id}>{notification.message}</li>
      ))}
    </ul>
  );
}

class NotificationStatusModel extends VDomModel {
  constructor(protected manager: NotificationManager) {
    super();
    this._count = manager.count;
    this.manager.changed.connect(this.onNotificationChanged, this);
  }

  get count(): number {
    return this._count;
  }

  get highlight(): boolean {
    return this._highlight;
  }

  get listOpened(): boolean {
    return this._listOpened;
  }
  set listOpened(v: boolean) {
    this._listOpened = v;
    if (this._listOpened || this._highlight) {
      this._highlight = false;
      this.stateChanged.emit();
    }
  }

  protected onNotificationChanged(
    manager: NotificationManager,
    change: Notification.IChange
  ): void {
    // Set private attribute to trigger only once the signal emission
    this._count = this.manager.count;

    const { autoClose } = change.notification.options;
    const noToast = typeof autoClose === 'number' && autoClose <= 0;

    // Highlight if
    //   the list is not opened (the style change if list is opened due to clickedItem style in statusbar.)
    //   the change type is not removed
    //   the notification will be hidden
    if (!this._listOpened && change.type !== 'removed' && noToast) {
      this._highlight = true;
    }
    this.stateChanged.emit();
  }

  private _count: number;
  private _highlight = false;
  private _listOpened = false;
}

interface INotificationStatusProps {
  count: number;
  highlight: boolean;
  onClick: () => void;
}

function NotificationStatus(props: INotificationStatusProps): JSX.Element {
  return (
    <GroupItem
      spacing={HALF_SPACING}
      onClick={() => {
        props.onClick();
      }}
    >
      <TextItem source={`${props.count}`}></TextItem>
      <bellIcon.react top={'2px'} stylesheet={'statusBar'}></bellIcon.react>
    </GroupItem>
  );
}

/**
 * Add notification center and toast
 */
export const notificationPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/apputils-extension:notification',
  autoStart: true,
  requires: [IStatusBar, ISanitizer],
  optional: [ISettingRegistry, ITranslator],
  activate: (
    app: JupyterFrontEnd,
    statusBar: IStatusBar,
    sanitizer: ISanitizer,
    settingRegistry: ISettingRegistry | null,
    translator: ITranslator | null
  ): void => {
    const trans = (translator ?? nullTranslator).load('jupyterlab');

    app.commands.addCommand(CommandIDs.notify, {
      label: trans.__('Emit a notification'),
      caption: trans.__(
        'Notification is described by {message: string, type?: string, options?: {autoClose?: number | false, actions: {label: string, commandId: string, args?: ReadOnlyJSONObject, caption?: string, className?: string}[], data?: ReadOnlyJSONValue}}.'
      ),
      execute: args => {
        const { message, type } = args as any;
        const options = (args.options as any) ?? {};

        return Notification.manager.notify(message, type ?? 'default', {
          ...options,
          actions: options.actions
            ? options.actions.map(
                (
                  action: Omit<Notification.IAction, 'callback'> & {
                    commandId: string;
                    args?: ReadonlyJSONObject;
                  }
                ) => {
                  return {
                    ...action,
                    callback: () => {
                      app.commands.execute(action.commandId, action.args);
                    }
                  } as Notification.IAction;
                }
              )
            : null
        });
      }
    });

    app.commands.addCommand(CommandIDs.dismiss, {
      label: trans.__('Dismiss a notification'),
      execute: args => {
        const { id } = args as any;

        Notification.manager.dismiss(id);
      }
    });

    const notificationList = ReactWidget.create(
      <NotificationCenter manager={Notification.manager}></NotificationCenter>
    );
    let popup: Widget | null = null;

    async function onNotification(
      manager: NotificationManager,
      change: Notification.IChange
    ): Promise<void> {
      if (popup?.isDisposed) {
        return;
      }

      const { message, type, options, id } = change.notification;

      if (typeof options.autoClose === 'number' && options.autoClose <= 0) {
        // If the notification is silent, bail early.
        return;
      }

      switch (change.type) {
        case 'added':
          await Private.createToast(id, message, type, options);
          break;
        case 'updated':
          {
            const toast = await Private.toast();
            const actions = options.actions;

            const autoClose =
              options.autoClose ??
              (actions && actions.length > 0 ? false : null);

            if (toast.isActive(id)) {
              // Update existing toast
              const closeToast = (): void => {
                toast.dismiss(id);
              };
              toast.update(id, {
                type: type === 'in-progress' ? null : type,
                isLoading: type === 'in-progress',
                autoClose: autoClose,
                render: Private.createContent(
                  message,
                  closeToast,
                  options.actions
                )
              });
            } else {
              // Needs to recreate a closed toast
              await Private.createToast(id, message, type, options);
            }
          }
          break;
        case 'removed':
          await Private.toast().then(t => {
            t.dismiss(id);
          });
          break;
      }
    }
    Notification.manager.changed.connect(onNotification);

    const model = new NotificationStatusModel(Notification.manager);
    model.listOpened = popup !== null;
    const notificationStatus = ReactWidget.create(
      <UseSignal signal={model.stateChanged}>
        {() => {
          if (model.highlight) {
            notificationStatus.addClass('jp-mod-selected');
          } else {
            notificationStatus.removeClass('jp-mod-selected');
          }
          return (
            <NotificationStatus
              count={model.count}
              highlight={model.highlight}
              onClick={() => {
                if (popup) {
                  popup.dispose();
                  popup = null;
                } else {
                  // Dismiss all toasts when opening the notification center
                  Private.toast()
                    .then(t => {
                      t.dismiss();
                    })
                    .catch(r => {
                      console.error(`Failed to dismiss all toasts:\n${r}`);
                    });

                  popup = showPopup({
                    body: notificationList,
                    anchor: notificationStatus,
                    align: 'right'
                  });
                }

                model.listOpened = popup !== null;
              }}
            ></NotificationStatus>
          );
        }}
      </UseSignal>
    );

    notificationStatus.addClass('jp-Notification-Status');

    statusBar.registerStatusItem(notificationPlugin.id, {
      item: notificationStatus,
      align: 'right',
      rank: -1
    });
  }
};

namespace Private {
  let toastify: typeof ReactToastify | null = null;

  function CloseButton(props: CloseButtonProps): JSX.Element {
    return (
      <i onClick={props.closeToast}>
        <closeIcon.react className="jp-icon-hover" tag="span"></closeIcon.react>
      </i>
    );
  }

  /**
   * Helper interface for 'react-toastify'.toast
   */
  export interface IToast {
    /**
     * Helper generic function
     */
    (content: ToastContent, options?: ToastOptions): Id;
    /**
     * Helper function for a toast with loading animation
     */
    loading(content: ToastContent, options?: ToastOptions): Id;
    /**
     * Helper function for a toast with success style
     */
    success(content: ToastContent, options?: ToastOptions): Id;
    /**
     * Helper function for a toast with info style
     */
    info(content: ToastContent, options?: ToastOptions | undefined): Id;
    /**
     * Helper function for a toast with error style
     */
    error(content: ToastContent, options?: ToastOptions | undefined): Id;
    /**
     * Helper function for a toast with warning style
     */
    warning(content: ToastContent, options?: ToastOptions | undefined): Id;
    /**
     * Helper function for a toast with dark style
     */
    dark(content: ToastContent, options?: ToastOptions | undefined): Id;
    /**
     * Helper function for a toast with warning style
     */
    warn: (content: ToastContent, options?: ToastOptions | undefined) => Id;
    /**
     * Remove toast programmatically
     */
    dismiss(id?: Id): false | void;
    /**
     * Clear waiting queue when limit is used
     */
    clearWaitingQueue(params?: ClearWaitingQueueParams): false | void;
    /**
     * return true if one container is displaying the toast
     */
    isActive(id: Id): boolean;
    /**
     * Update a toast
     */
    update(toastId: Id, options?: UpdateOptions): void;
    /**
     * Used for controlled progress bar.
     */
    done(id: React.ReactText): void;
    /**
     * Track changes. The callback get the number of toast displayed
     */
    onChange(callback: (toast: ToastItem) => void): () => void;
  }

  /**
   * Asynchronously load the toast container
   *
   * @returns The toast object
   */
  export async function toast(): Promise<IToast> {
    if (toastify === null) {
      toastify = await import('react-toastify');

      const container = document.body.appendChild(
        document.createElement('div')
      );
      container.id = 'react-toastify-container';

      ReactDOM.render(
        <toastify.ToastContainer
          draggable={false}
          closeOnClick={false}
          hideProgressBar={true}
          newestOnTop={true}
          pauseOnFocusLoss={true}
          pauseOnHover={true}
          position="bottom-right"
          className="jp-toastContainer"
          transition={toastify.Slide}
          closeButton={CloseButton}
        ></toastify.ToastContainer>,
        container
      );
    }

    return toastify.toast;
  }

  interface IToastButtonProps {
    /**
     * User specification for the button
     */
    action: Notification.IAction;

    /**
     * Function closing the notification
     */
    closeToast: () => void;
  }

  /**
   * Create a button with customized callback in a toast
   */
  function ToastButton({ action, closeToast }: IToastButtonProps): JSX.Element {
    const clickHandler = (): void => {
      closeToast();
      action.callback();
    };
    return (
      <Button
        title={action.caption ?? action.label}
        className={'jp-toast-button'}
        onClick={clickHandler}
        small={true}
      >
        {action.label}
      </Button>
    );
  }

  /**
   * Helper function to construct the notification content
   *
   * @param message Message to print in the notification
   * @param closeHandler Function closing the notification
   * @param actions Toast actions
   */
  export function createContent(
    message: React.ReactNode,
    closeHandler: () => void,
    actions?: Notification.IAction[]
  ): React.ReactNode {
    if (actions && actions.length > 0) {
      return (
        <>
          {message}
          <div className="jp-toast-buttonBar">
            <div className="jp-toast-spacer" />
            {actions.map((action, idx) => {
              return (
                <ToastButton
                  key={'button-' + idx}
                  action={action}
                  closeToast={closeHandler}
                />
              );
            })}
          </div>
        </>
      );
    } else {
      return <>{message}</>;
    }
  }

  export async function createToast<T extends ReadonlyJSONValue>(
    toastId: string,
    message: React.ReactNode,
    type: Notification.TypeOptions,
    options: Notification.IOptions<T> = {}
  ): Promise<Id> {
    const { actions, autoClose, data } = options;
    const t = await toast();
    const toastOptions = {
      autoClose:
        autoClose ?? (actions && actions.length > 0 ? false : undefined),
      data: data as any,
      className: `jp-toast-${type}`,
      toastId,
      type: type === 'in-progress' ? null : type,
      isLoading: type === 'in-progress'
    } as any;

    return t(
      ({ closeToast }: { closeToast: () => void }) =>
        createContent(message, closeToast, actions),
      toastOptions
    );
  }
}
