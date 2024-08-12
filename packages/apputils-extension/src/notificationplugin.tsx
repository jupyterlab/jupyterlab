/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  Notification,
  NotificationManager,
  ReactWidget
} from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  GroupItem,
  IStatusBar,
  Popup,
  showPopup,
  TextItem
} from '@jupyterlab/statusbar';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import {
  bellIcon,
  Button,
  closeIcon,
  deleteIcon,
  LabIcon,
  ToolbarButtonComponent,
  UseSignal,
  VDomModel
} from '@jupyterlab/ui-components';
import {
  PromiseDelegate,
  ReadonlyJSONObject,
  ReadonlyJSONValue
} from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import type {
  ClearWaitingQueueParams,
  CloseButtonProps,
  Icons,
  Id,
  default as ReactToastify,
  ToastContent,
  ToastItem,
  ToastOptions,
  UpdateOptions
} from 'react-toastify';

/**
 * Toast close button class
 */
const TOAST_CLOSE_BUTTON_CLASS = 'jp-Notification-Toast-Close';

/**
 * Toast close button class right margin required due to custom hover effect
 */
const TOAST_CLOSE_BUTTON_MARGIN_CLASS = 'jp-Notification-Toast-Close-Margin';

/**
 * Maximal number of characters displayed in a notification.
 */
const MAX_MESSAGE_LENGTH = 140;

namespace CommandIDs {
  /**
   * Dismiss a notification
   */
  export const dismiss = 'apputils:dismiss-notification';
  /**
   * Display all notifications
   */
  export const display = 'apputils:display-notifications';
  /**
   * Create a notification
   */
  export const notify = 'apputils:notify';
  /**
   * Update a notification
   */
  export const update = 'apputils:update-notification';
}

/**
 * Half spacing between subitems in a status item.
 */
const HALF_SPACING = 4;

/**
 * Notification center properties
 */
interface INotificationCenterProps {
  /**
   * Notification manager
   */
  manager: NotificationManager;
  /**
   * Close notification handler
   */
  onClose: () => void;
  /**
   * Translation object
   */
  trans: TranslationBundle;
}

/**
 * Notification center view
 */
function NotificationCenter(props: INotificationCenterProps): JSX.Element {
  const { manager, onClose, trans } = props;

  // Markdown parsed notifications
  const [notifications, setNotifications] = React.useState<
    Notification.INotification[]
  >([]);
  // Load asynchronously react-toastify icons
  const [icons, setIcons] = React.useState<typeof Icons | null>(null);

  React.useEffect(() => {
    async function onChanged(): Promise<void> {
      setNotifications(
        await Promise.all(
          manager.notifications.map(async n => {
            return Object.freeze({
              ...n
            });
          })
        )
      );
    }

    if (notifications.length !== manager.count) {
      void onChanged();
    }
    manager.changed.connect(onChanged);

    return () => {
      manager.changed.disconnect(onChanged);
    };
  }, [manager]);
  React.useEffect(() => {
    Private.getIcons()
      .then(toastifyIcons => {
        setIcons(toastifyIcons);
      })
      .catch(r => {
        console.error(`Failed to get react-toastify icons:\n${r}`);
      });
  }, []);

  return (
    <UseSignal signal={manager.changed}>
      {() => (
        <>
          <h2 className="jp-Notification-Header jp-Toolbar">
            <span className="jp-Toolbar-item">
              {manager.count > 0
                ? trans._n('%1 notification', '%1 notifications', manager.count)
                : trans.__('No notifications')}
            </span>
            <span className="jp-Toolbar-item jp-Toolbar-spacer"></span>
            <ToolbarButtonComponent
              noFocusOnClick={false}
              onClick={() => {
                manager.dismiss();
              }}
              icon={deleteIcon}
              tooltip={trans.__('Dismiss all notifications')}
              enabled={manager.count > 0}
            />
            <ToolbarButtonComponent
              noFocusOnClick={false}
              onClick={onClose}
              icon={closeIcon}
              tooltip={trans.__('Hide notifications')}
            />
          </h2>
          <ol className="jp-Notification-List">
            {notifications.map(notification => {
              const { id, message, type, options } = notification;
              const toastType = type === 'in-progress' ? 'default' : type;
              const closeNotification = () => {
                manager.dismiss(id);
              };
              const icon =
                type === 'default'
                  ? null
                  : type === 'in-progress'
                  ? icons?.spinner ?? null
                  : icons && icons[type];
              return (
                <li
                  className="jp-Notification-List-Item"
                  key={notification.id}
                  onClick={event => {
                    // Stop propagation to avoid closing the popup on click
                    event.stopPropagation();
                  }}
                >
                  {/* This reuses the react-toastify elements to get a similar look and feel. */}
                  <div
                    className={`Toastify__toast Toastify__toast-theme--light Toastify__toast--${toastType} jp-Notification-Toast-${toastType}`}
                  >
                    <div className="Toastify__toast-body">
                      {icon && (
                        <div className="Toastify__toast-icon">
                          {icon({ theme: 'light', type: toastType })}
                        </div>
                      )}
                      <div>
                        {Private.createContent(
                          message,
                          closeNotification,
                          options.actions
                        )}
                      </div>
                    </div>
                    <Private.CloseButton
                      close={closeNotification}
                      closeIcon={deleteIcon.react}
                      title={trans.__('Dismiss notification')}
                      closeIconMargin
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </UseSignal>
  );
}

/**
 * Status widget model
 */
class NotificationStatusModel extends VDomModel {
  constructor(protected manager: NotificationManager) {
    super();
    this._count = manager.count;
    this.manager.changed.connect(this.onNotificationChanged, this);
  }

  /**
   * Number of notifications.
   */
  get count(): number {
    return this._count;
  }

  /**
   * Whether to silence all notifications or not.
   */
  get doNotDisturbMode(): boolean {
    return this._doNotDisturbMode;
  }
  set doNotDisturbMode(v: boolean) {
    this._doNotDisturbMode = v;
  }

  /**
   * Whether to highlight the status widget or not.
   */
  get highlight(): boolean {
    return this._highlight;
  }

  /**
   * Whether the popup is opened or not.
   */
  get listOpened(): boolean {
    return this._listOpened;
  }
  set listOpened(v: boolean) {
    this._listOpened = v;
    if (this._listOpened || this._highlight) {
      this._highlight = false;
    }
    this.stateChanged.emit();
  }

  protected onNotificationChanged(
    _: NotificationManager,
    change: Notification.IChange
  ): void {
    // Set private attribute to trigger only once the signal emission
    this._count = this.manager.count;

    const { autoClose } = change.notification.options;
    const noToast =
      this.doNotDisturbMode ||
      (typeof autoClose === 'number' && autoClose <= 0);

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
  private _doNotDisturbMode = false;
}

/**
 * Status view properties
 */
interface INotificationStatusProps {
  /**
   * Number of notification
   */
  count: number;
  /**
   * Whether to highlight the view or not.
   */
  highlight: boolean;
  /**
   * Click event handler
   */
  onClick: () => void;
  /**
   * Translation object
   */
  trans: TranslationBundle;
}

/**
 * Status view
 */
function NotificationStatus(props: INotificationStatusProps): JSX.Element {
  return (
    <GroupItem
      spacing={HALF_SPACING}
      onClick={() => {
        props.onClick();
      }}
      title={
        props.count > 0
          ? props.trans._n('%1 notification', '%1 notifications', props.count)
          : props.trans.__('No notifications')
      }
    >
      <TextItem
        className="jp-Notification-Status-Text"
        source={`${props.count}`}
      />
      <bellIcon.react top={'2px'} stylesheet={'statusBar'} />
    </GroupItem>
  );
}

/**
 * Add notification center and toast
 */
export const notificationPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/apputils-extension:notification',
  description: 'Add the notification center and its status indicator.',
  autoStart: true,
  optional: [IStatusBar, ISettingRegistry, ITranslator],
  activate: (
    app: JupyterFrontEnd,
    statusBar: IStatusBar | null,
    settingRegistry: ISettingRegistry | null,
    translator: ITranslator | null
  ): void => {
    Private.translator = translator ?? nullTranslator;
    const trans = Private.translator.load('jupyterlab');

    const model = new NotificationStatusModel(Notification.manager);
    model.doNotDisturbMode = false;

    if (settingRegistry) {
      void Promise.all([
        settingRegistry.load(notificationPlugin.id),
        app.restored
      ]).then(([plugin]) => {
        const updateSettings = () => {
          model.doNotDisturbMode = plugin.get('doNotDisturbMode')
            .composite as boolean;
        };
        updateSettings();
        plugin.changed.connect(updateSettings);
      });
    }

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
                      app.commands
                        .execute(action.commandId, action.args)
                        .catch(r => {
                          console.error(
                            `Failed to executed '${action.commandId}':\n${r}`
                          );
                        });
                    }
                  } as Notification.IAction;
                }
              )
            : null
        });
      }
    });

    app.commands.addCommand(CommandIDs.update, {
      label: trans.__('Update a notification'),
      caption: trans.__(
        'Notification is described by {id: string, message: string, type?: string, options?: {autoClose?: number | false, actions: {label: string, commandId: string, args?: ReadOnlyJSONObject, caption?: string, className?: string}[], data?: ReadOnlyJSONValue}}.'
      ),
      execute: args => {
        const { id, message, type, ...options } = args as any;

        return Notification.manager.update({
          id,
          message,
          type: type ?? 'default',
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
                      app.commands
                        .execute(action.commandId, action.args)
                        .catch(r => {
                          console.error(
                            `Failed to executed '${action.commandId}':\n${r}`
                          );
                        });
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

    let popup: Popup | null = null;
    model.listOpened = false;

    const notificationList = ReactWidget.create(
      <NotificationCenter
        manager={Notification.manager}
        onClose={() => {
          popup?.dispose();
        }}
        trans={trans}
      />
    );
    notificationList.addClass('jp-Notification-Center');

    async function onNotification(
      manager: NotificationManager,
      change: Notification.IChange
    ): Promise<void> {
      if (model.doNotDisturbMode || (popup !== null && !popup.isDisposed)) {
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
                // Dismiss the displayed toast
                toast.dismiss(id);
                // Dismiss the notification from the queue
                manager.dismiss(id);
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

    const displayNotifications = (): void => {
      if (popup) {
        popup.dispose();
        popup = null;
      } else {
        popup = showPopup({
          body: notificationList,
          anchor: notificationStatus,
          align: 'right',
          hasDynamicSize: true,
          startHidden: true
        });

        // Dismiss all toasts when opening the notification center
        Private.toast()
          .then(t => {
            t.dismiss();
          })
          .catch(r => {
            console.error(`Failed to dismiss all toasts:\n${r}`);
          })
          .finally(() => {
            popup?.launch();

            // Focus on the pop-up
            notificationList.node.focus();

            popup?.disposed.connect(() => {
              model.listOpened = false;
              popup = null;
            });
          });
      }

      model.listOpened = popup !== null;
    };

    app.commands.addCommand(CommandIDs.display, {
      label: trans.__('Show Notifications'),
      execute: displayNotifications
    });

    const notificationStatus = ReactWidget.create(
      <UseSignal signal={model.stateChanged}>
        {() => {
          if (model.highlight || (popup && !popup.isDisposed)) {
            notificationStatus.addClass('jp-mod-selected');
          } else {
            notificationStatus.removeClass('jp-mod-selected');
          }
          return (
            <NotificationStatus
              count={model.count}
              highlight={model.highlight}
              trans={trans}
              onClick={displayNotifications}
            />
          );
        }}
      </UseSignal>
    );

    notificationStatus.addClass('jp-Notification-Status');

    if (statusBar) {
      statusBar.registerStatusItem(notificationPlugin.id, {
        item: notificationStatus,
        align: 'right',
        rank: -1
      });
    } else {
      notificationStatus.addClass('jp-ThemedContainer');
      // if the status bar is not available, position the notification
      // status in the bottom right corner of the page
      notificationStatus.node.style.position = 'fixed';
      notificationStatus.node.style.bottom = '0';
      // 10px is the default padding for the status bar
      notificationStatus.node.style.right = '10px';
      Widget.attach(notificationStatus, document.body);
      notificationStatus.show();
    }
  }
};

namespace Private {
  /**
   * Translator object for private namespace
   */
  export let translator: ITranslator = nullTranslator;

  /**
   * Pointer to asynchronously loaded react-toastify
   */
  let toastify: typeof ReactToastify | null = null;

  /**
   * Interface for CloseButton component
   */
  export interface ICloseButtonProps
    extends React.DetailedHTMLProps<
      React.ButtonHTMLAttributes<HTMLButtonElement>,
      HTMLButtonElement
    > {
    /**
     * A function to handle a close event when the CloseButton is clicked
     */
    close: (e?: React.MouseEvent<HTMLElement, MouseEvent>) => void;
    /**
     * The LabIcon component to be used as the close icon
     */
    closeIcon: LabIcon.IReact;
    /**
     * Optional boolean to apply margin to the close icon. Default is false.
     */
    closeIconMargin?: boolean;
  }

  export function CloseButton(props: ICloseButtonProps) {
    return (
      <button
        className={`jp-Button jp-mod-minimal ${TOAST_CLOSE_BUTTON_CLASS}${
          props.closeIconMargin ? ` ${TOAST_CLOSE_BUTTON_MARGIN_CLASS}` : ''
        }`}
        title={props.title ?? ''}
        onClick={props.close}
      >
        <props.closeIcon className="jp-icon-hover" tag="span" />
      </button>
    );
  }

  function ToastifyCloseButton(props: CloseButtonProps): JSX.Element {
    const trans = translator.load('jupyterlab');
    return (
      <CloseButton
        close={props.closeToast}
        closeIcon={closeIcon.react}
        title={trans.__('Hide notification')}
      />
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
    warn(content: ToastContent, options?: ToastOptions | undefined): Id;
    /**
     * Remove toast programmatically
     */
    dismiss(id?: Id): void;
    /**
     * Clear waiting queue when limit is used
     */
    clearWaitingQueue(params?: ClearWaitingQueueParams): void;
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
    done(id: Id): void;
    /**
     * Track changes. The callback get the number of toast displayed
     */
    onChange(callback: (toast: ToastItem) => void): () => void;
  }

  let waitForToastify: PromiseDelegate<void> | null = null;

  /**
   * Asynchronously load the toast container
   *
   * @returns The toast object
   */
  export async function toast(): Promise<IToast> {
    if (waitForToastify === null) {
      waitForToastify = new PromiseDelegate();
    } else {
      await waitForToastify.promise;
    }

    if (toastify === null) {
      toastify = await import('react-toastify');

      const container = document.body.appendChild(
        document.createElement('div')
      );
      container.id = 'react-toastify-container';
      container.classList.add('jp-ThemedContainer');
      const root = createRoot(container);

      root.render(
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
          closeButton={ToastifyCloseButton}
        />
      );

      waitForToastify.resolve();
    }

    return toastify.toast;
  }

  /**
   * react-toastify icons loader
   */
  export async function getIcons(): Promise<typeof Icons> {
    if (toastify === null) {
      await toast();
    }

    return toastify!.Icons;
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

  const displayType2Class: Record<Notification.ActionDisplayType, string> = {
    accent: 'jp-mod-accept',
    link: 'jp-mod-link',
    warn: 'jp-mod-warn',
    default: ''
  };

  /**
   * Create a button with customized callback in a toast
   */
  function ToastButton({ action, closeToast }: IToastButtonProps): JSX.Element {
    const clickHandler = (event: React.MouseEvent): void => {
      action.callback(event as any);
      if (!event.defaultPrevented) {
        closeToast();
      }
    };
    const classes = [
      'jp-toast-button',
      displayType2Class[action.displayType ?? 'default']
    ].join(' ');
    return (
      <Button
        title={action.caption ?? action.label}
        className={classes}
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
    message: string,
    closeHandler: () => void,
    actions?: Notification.IAction[]
  ): React.ReactNode {
    const shortenMessage =
      message.length > MAX_MESSAGE_LENGTH
        ? message.slice(0, MAX_MESSAGE_LENGTH) + '…'
        : message;
    return (
      <>
        <div className="jp-toast-message">
          {shortenMessage.split('\n').map((part, index) => (
            <React.Fragment key={`part-${index}`}>
              {index > 0 ? <br /> : null}
              {part}
            </React.Fragment>
          ))}
        </div>
        {(actions?.length ?? 0) > 0 && (
          <div className="jp-toast-buttonBar">
            <div className="jp-toast-spacer" />
            {actions!.map((action, idx) => {
              return (
                <ToastButton
                  key={'button-' + idx}
                  action={action}
                  closeToast={closeHandler}
                />
              );
            })}
          </div>
        )}
      </>
    );
  }

  /**
   * Create a toast notification
   *
   * @param toastId Toast unique id
   * @param message Toast message
   * @param type Toast type
   * @param options Toast options
   * @returns Toast id
   */
  export async function createToast<T extends ReadonlyJSONValue>(
    toastId: string,
    message: string,
    type: Notification.TypeOptions,
    options: Notification.IOptions<T> = {}
  ): Promise<Id> {
    const { actions, autoClose, data } = options;
    const t = await toast();
    const toastOptions = {
      autoClose:
        autoClose ?? (actions && actions.length > 0 ? false : undefined),
      data: data as any,
      className: `jp-Notification-Toast-${type}`,
      toastId,
      type: type === 'in-progress' ? null : type,
      isLoading: type === 'in-progress'
    } as any;

    return t(
      ({ closeToast }: { closeToast?: () => void }) =>
        createContent(
          message,
          () => {
            if (closeToast) closeToast();
            Notification.manager.dismiss(toastId);
          },
          actions
        ),
      toastOptions
    );
  }
}
