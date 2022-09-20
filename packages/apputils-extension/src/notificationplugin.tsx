import { faBell } from '@fortawesome/free-solid-svg-icons/faBell';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons/faExclamationCircle';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons/faExclamationTriangle';
import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
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
import { GroupItem, IStatusBar, TextItem } from '@jupyterlab/statusbar';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { buildIcon, closeIcon } from '@jupyterlab/ui-components';
import { ReadonlyJSONObject, ReadonlyJSONValue } from '@lumino/coreutils';
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
}

/**
 * Half spacing between subitems in a status item.
 */
const HALF_SPACING = 4;

function NotificationCenter(props: IPropsNotification): JSX.Element {
  return (
    <div>
      <div>Header</div>
      <ul>
        {props.manager.notifications.map(notification => (
          <li key={notification.id}>{notification.message}</li>
        ))}
      </ul>
    </div>
  );
}

interface IPropsNotification {
  manager: NotificationManager;
}

function NotificationStatus(props: IPropsNotification): JSX.Element {
  const [open, setOpen] = React.useState<boolean>(false);
  const [hasUnread, setHasUnread] = React.useState<boolean>(
    props.manager.notifications.length > 0
  );

  if (open) {
    // Dismiss all toasts when opening the notification center
    Private.toast()
      .then(t => {
        t.dismiss();
      })
      .catch(r => {
        console.error(`Failed to dismiss all toasts:\n${r}`);
      });
  }

  React.useEffect(() => {
    const onNotification = async (
      manager: NotificationManager,
      change: Notification.IChange
    ) => {
      if (open) {
        // If all notifications are displayed, bail early.
        setHasUnread(false);
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
          setHasUnread(true);
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
                autoClose: autoClose,
                render: Private.createContent(
                  message,
                  closeToast,
                  options.actions,
                  Private.TYPE2ICON.get(type)
                )
              });
            } else {
              // Needs to recreate a closed toast
              await Private.createToast(id, message, type, options);
            }
            setHasUnread(true);
          }
          break;
        case 'removed':
          await Private.toast().then(t => {
            t.dismiss(id);
          });
          break;
      }
    };
    Notification.manager.changed.connect(onNotification);

    return () => {
      Notification.manager.changed.disconnect(onNotification);
    };
  }, []);

  return (
    <div>
      <GroupItem
        className={
          hasUnread
            ? 'jp-Notification-Status jp-mod-highlight'
            : 'jp-Notification-Status'
        }
        spacing={HALF_SPACING}
        onClick={() => {
          setOpen(!open);
        }}
      >
        <TextItem source={props.manager.count}></TextItem>
        <buildIcon.react top={'2px'} stylesheet={'statusBar'}></buildIcon.react>
      </GroupItem>
      {open && (
        <NotificationCenter manager={props.manager}></NotificationCenter>
      )}
    </div>
  );
}

/**
 * Add notification center and toast
 */
export const notificationPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/apputils-extension:notification',
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

        Notification.manager.notify(message, type ?? 'default', {
          ...options,
          actions: options.actions
            ? options.actions.forEach(
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

    statusBar.registerStatusItem(notificationPlugin.id, {
      item: ReactWidget.create(
        <NotificationStatus manager={Notification.manager}></NotificationStatus>
      ),
      align: 'right',
      rank: 1000
    });
  }
};

namespace Private {
  export const TYPE2ICON = new Map<
    Notification.TypeOptions,
    JSX.Element | null
  >([
    ['default', null],
    [
      'in-progress',
      // eslint-disable-next-line react/jsx-key
      <FontAwesomeIcon
        icon={faSpinner}
        pull="left"
        spin
        style={{ color: 'var(--jp-inverse-layout-color3)' }}
      />
    ],
    [
      'error',
      // eslint-disable-next-line react/jsx-key
      <FontAwesomeIcon
        icon={faExclamationCircle}
        pull="left"
        style={{ color: 'var(--jp-error-color1)' }}
      />
    ],
    [
      'warning',
      // eslint-disable-next-line react/jsx-key
      <FontAwesomeIcon
        icon={faExclamationTriangle}
        pull="left"
        style={{ color: 'var(--jp-warn-color1)' }}
      />
    ],
    [
      'info',
      // eslint-disable-next-line react/jsx-key
      <FontAwesomeIcon
        icon={faBell}
        pull="left"
        style={{ color: 'var(--jp-info-color1)' }}
      />
    ],
    [
      'success',
      // eslint-disable-next-line react/jsx-key
      <FontAwesomeIcon
        icon={faCheck}
        pull="left"
        style={{ color: 'var(--jp-success-color1)' }}
      />
    ]
  ]);

  let toastify: typeof ReactToastify | null = null;

  function CloseButton(props: CloseButtonProps): JSX.Element {
    return (
      <i onClick={props.closeToast}>
        <span className="jp-icon-hover">{closeIcon.react}</span>
      </i>
    );
  }

  export interface IToast {
    (content: ToastContent, options?: ToastOptions): Id;
    success(content: ToastContent, options?: ToastOptions): Id;
    info(content: ToastContent, options?: ToastOptions | undefined): Id;
    error(content: ToastContent, options?: ToastOptions | undefined): Id;
    warning(content: ToastContent, options?: ToastOptions | undefined): Id;
    dark(content: ToastContent, options?: ToastOptions | undefined): Id;
    /**
     * Maybe I should remove warning in favor of warn, I don't know
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
    update(toastId: Id, options?: UpdateOptions): void;
    /**
     * Used for controlled progress bar.
     */
    done(id: React.ReactText): void;
    /**
     * Track changes. The callback get the number of toast displayed
     *
     */
    onChange(callback: (toast: ToastItem) => void): () => void;
  }

  export async function toast(): Promise<IToast> {
    if (toastify === null) {
      toastify = await import('react-toastify');

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
        document.body
      );
    }

    return toastify.toast;
  }

  interface IToastButtonProps {
    /**
     * User specification for the button
     */
    button: Notification.IAction;

    /**
     * Function closing the notification
     */
    closeToast: () => void;
  }

  /**
   * Create a button with customized callback in a toast
   */
  const ToastButton = ({
    button,
    closeToast
  }: {
    button: Notification.IAction;
    closeToast: () => void;
  }): React.ReactElement<IToastButtonProps> => {
    const fullClassName = button.className
      ? `jp-toast-button ${button.className}`
      : 'jp-toast-button';
    const clickHandler = (): void => {
      closeToast();
      button.callback();
    };
    return (
      <button className={fullClassName} onClick={clickHandler}>
        {button.label}
      </button>
    );
  };

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
    actions?: Notification.IAction[],
    icon?: JSX.Element | null
  ): React.ReactNode {
    if (actions && actions.length > 0) {
      return (
        <>
          {icon ? icon : null}
          {message}
          <div className="jp-toast-buttonBar">
            <div className="jp-toast-spacer" />
            {actions.map((button, idx) => {
              return (
                <ToastButton
                  key={'button-' + idx}
                  button={button}
                  closeToast={closeHandler}
                />
              );
            })}
          </div>
        </>
      );
    } else {
      return (
        <>
          {icon ? icon : null}
          {message}
        </>
      );
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
    return t(
      ({ closeToast }: { closeToast: () => void }) =>
        createContent(message, closeToast, actions, TYPE2ICON.get(type)),
      {
        autoClose:
          autoClose ?? (actions && actions.length > 0 ? false : undefined),
        data: data as any,
        className: `jp-toast-${type}`,
        toastId
      }
    );
  }
}
