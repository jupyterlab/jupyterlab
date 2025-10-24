// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ConfigSection,
  Contents,
  Event,
  IContentProvider,
  Kernel,
  KernelSpec,
  NbConvert,
  ServerConnection,
  Session,
  Setting,
  Terminal,
  User,
  Workspace
} from '.';
import { ServiceManager } from './manager';

import { type IPlugin, Token } from '@lumino/coreutils';

/**
 * The type for a service manager plugin.
 *
 * @typeparam T - The type that the plugin `provides` upon being activated.
 *
 * #### Notes
 * This type of plugin is different than a JupyterFrontEndPlugin,
 * as the app will still be `null` when its `activate` method is called.
 */
export type ServiceManagerPlugin<T> = IPlugin<null, T>;

/**
 * Application connection status interface
 */
export interface IConnectionStatus {
  /**
   * Whether the application is connected to the server or not.
   *
   * #### Notes
   *
   * Every periodic network polling should be paused while this is set
   * to `false`. Extensions should use this value to decide whether to proceed
   * with the polling.
   * The extensions may also set this value to `false` if there is no need to
   * fetch anything from the server backend basing on some conditions
   * (e.g. when an error message dialog is displayed).
   * At the same time, the extensions are responsible for setting this value
   * back to `true`.
   */
  isConnected: boolean;
}

/**
 * Token providing the application connection status.
 */
export const IConnectionStatus = new Token<IConnectionStatus>(
  '@jupyterlab/application:IConnectionStatus',
  'A service providing the application connection status.'
);

/**
 * Token providing the config section manager.
 */
export const IConfigSectionManager = new Token<ConfigSection.IManager>(
  '@jupyterlab/services:IConfigSectionManager',
  'A service providing the config section manager.'
);

/**
 * The contents manager token.
 */
export const IContentsManager = new Token<Contents.IManager>(
  '@jupyterlab/services:IContentsManager',
  'The contents manager token.'
);

/**
 * The default content provider token.
 */
export const IDefaultContentProvider = new Token<IContentProvider>(
  '@jupyterlab/services:IDefaultContentProvider',
  'The default content provider for the contents manager.'
);

/**
 * The default drive token.
 */
export const IDefaultDrive = new Token<Contents.IDrive>(
  '@jupyterlab/services:IDefaultDrive',
  'The default drive for the contents manager.'
);

/**
 * The event manager token.
 */
export const IEventManager = new Token<Event.IManager>(
  '@jupyterlab/services:IEventManager',
  'The event manager token.'
);

/**
 * The kernel manager token.
 */
export const IKernelManager = new Token<Kernel.IManager>(
  '@jupyterlab/services:IKernelManager',
  'The kernel manager token.'
);

/**
 * The kernel spec manager token.
 */
export const IKernelSpecManager = new Token<KernelSpec.IManager>(
  '@jupyterlab/services:IKernelSpecManager',
  'The kernel spec manager token.'
);

/**
 * The nbconvert manager token.
 */
export const INbConvertManager = new Token<NbConvert.IManager>(
  '@jupyterlab/services:INbConvertManager',
  'The nbconvert manager token.'
);

/**
 * The server settings token.
 */
export const IServerSettings = new Token<ServerConnection.ISettings>(
  '@jupyterlab/services:IServerSettings',
  'The server settings for the application.'
);

/**
 * The session manager token.
 */
export const ISessionManager = new Token<Session.IManager>(
  '@jupyterlab/services:ISessionManager',
  'The session manager token.'
);

/**
 * The setting manager token.
 */
export const ISettingManager = new Token<Setting.IManager>(
  '@jupyterlab/services:ISettingManager',
  'The setting manager token.'
);

/**
 * The default service manager token.
 */
export const IServiceManager = new Token<ServiceManager.IManager>(
  '@jupyterlab/services:IServiceManager',
  'The service manager for the application.'
);

/**
 * The terminal manager token.
 */
export const ITerminalManager = new Token<Terminal.IManager>(
  '@jupyterlab/services:ITerminalManager',
  'The terminal manager token.'
);

/**
 * The user manager token.
 */
export const IUserManager = new Token<User.IManager>(
  '@jupyterlab/services:IUserManager',
  'The user manager token.'
);

/**
 * The workspace manager token.
 */
export const IWorkspaceManager = new Token<Workspace.IManager>(
  '@jupyterlab/services:IWorkspaceManager',
  'The workspace manager token.'
);
