/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module services-extension
 */

import {
  ConfigSection,
  ConfigSectionManager,
  ConnectionStatus,
  Contents,
  ContentsManager,
  Drive,
  Event,
  EventManager,
  IConfigSectionManager,
  IConnectionStatus,
  IContentsManager,
  IDefaultDrive,
  IEventManager,
  IKernelManager,
  IKernelSpecManager,
  INbConvertManager,
  IServerSettings,
  IServiceManager,
  ISessionManager,
  ISettingManager,
  ITerminalManager,
  IUserManager,
  IWorkspaceManager,
  Kernel,
  KernelManager,
  KernelSpec,
  KernelSpecManager,
  NbConvert,
  NbConvertManager,
  ServerConnection,
  ServiceManager,
  ServiceManagerPlugin,
  Session,
  SessionManager,
  Setting,
  SettingManager,
  Terminal,
  TerminalManager,
  User,
  UserManager,
  Workspace,
  WorkspaceManager
} from '@jupyterlab/services';

import type { IPlugin } from '@lumino/coreutils';

/**
 * Config section manager plugin.
 */
const configSectionManager: IPlugin<null, ConfigSection.IManager> = {
  id: '@jupyterlab/services-extension:config-section-manager',
  autoStart: true,
  provides: IConfigSectionManager,
  optional: [IServerSettings],
  description: 'Provides the config section manager.',
  activate: (
    _: null,
    serverSettings: ServerConnection.ISettings | undefined
  ) => {
    const manager = new ConfigSectionManager({ serverSettings });
    // Set the config section manager for the global ConfigSection.
    ConfigSection._setConfigSectionManager(manager);
    return manager;
  }
};

/**
 * The default connection status provider.
 */
const connectionStatusPlugin: IPlugin<null, IConnectionStatus> = {
  id: '@jupyterlab/services-extension:connection-status',
  autoStart: true,
  provides: IConnectionStatus,
  description: 'Provides the default connection status.',
  activate: () => {
    return new ConnectionStatus();
  }
};

/**
 * The default contents manager plugin.
 */
const contentsManagerPlugin: ServiceManagerPlugin<Contents.IManager> = {
  id: '@jupyterlab/services-extension:contents-manager',
  description: 'The default contents manager plugin.',
  autoStart: true,
  provides: IContentsManager,
  requires: [IDefaultDrive, IServerSettings],
  activate: (
    _: null,
    defaultDrive: Contents.IDrive,
    serverSettings: ServerConnection.ISettings
  ): Contents.IManager => {
    return new ContentsManager({
      defaultDrive,
      serverSettings
    });
  }
};

/**
 * The default drive plugin.
 */
const defaultDrivePlugin: ServiceManagerPlugin<Contents.IDrive> = {
  id: '@jupyterlab/services-extension:default-drive',
  description: 'The default drive for the contents manager.',
  autoStart: true,
  provides: IDefaultDrive,
  optional: [IServerSettings],
  activate: (
    _: null,
    serverSettings: ServerConnection.ISettings | null
  ): Contents.IDrive => {
    return new Drive({ serverSettings: serverSettings ?? undefined });
  }
};

/**
 * The event manager plugin.
 */
const eventManagerPlugin: ServiceManagerPlugin<Event.IManager> = {
  id: '@jupyterlab/services-extension:event-manager',
  description: 'The event manager plugin.',
  autoStart: true,
  provides: IEventManager,
  optional: [IServerSettings],
  activate: (
    _: null,
    serverSettings: ServerConnection.ISettings | undefined
  ): Event.IManager => {
    return new EventManager({ serverSettings });
  }
};

/**
 * The kernel manager plugin.
 */
const kernelManagerPlugin: ServiceManagerPlugin<Kernel.IManager> = {
  id: '@jupyterlab/services-extension:kernel-manager',
  description: 'The kernel manager plugin.',
  autoStart: true,
  provides: IKernelManager,
  optional: [IServerSettings],
  activate: (
    _: null,
    serverSettings: ServerConnection.ISettings | undefined
  ): Kernel.IManager => {
    return new KernelManager({ serverSettings });
  }
};

/**
 * The kernel spec manager plugin.
 */
const kernelSpecManagerPlugin: ServiceManagerPlugin<KernelSpec.IManager> = {
  id: '@jupyterlab/services-extension:kernel-spec-manager',
  description: 'The kernel spec manager plugin.',
  autoStart: true,
  provides: IKernelSpecManager,
  optional: [IServerSettings],
  activate: (
    _: null,
    serverSettings: ServerConnection.ISettings | undefined
  ): KernelSpec.IManager => {
    return new KernelSpecManager({ serverSettings });
  }
};

/**
 * The nbconvert manager plugin.
 */
const nbConvertManagerPlugin: ServiceManagerPlugin<NbConvert.IManager> = {
  id: '@jupyterlab/services-extension:nbconvert-manager',
  description: 'The nbconvert manager plugin.',
  autoStart: true,
  provides: INbConvertManager,
  optional: [IServerSettings],
  activate: (
    _: null,
    serverSettings: ServerConnection.ISettings | undefined
  ): NbConvert.IManager => {
    return new NbConvertManager({ serverSettings });
  }
};

/**
 * The session manager plugin.
 */
const sessionManagerPlugin: ServiceManagerPlugin<Session.IManager> = {
  id: '@jupyterlab/services-extension:session-manager',
  description: 'The session manager plugin.',
  autoStart: true,
  provides: ISessionManager,
  requires: [IKernelManager],
  optional: [IServerSettings],
  activate: (
    _: null,
    kernelManager: Kernel.IManager,
    serverSettings: ServerConnection.ISettings | undefined
  ): Session.IManager => {
    return new SessionManager({ kernelManager, serverSettings });
  }
};

/**
 * The setting manager plugin.
 */
const settingManagerPlugin: ServiceManagerPlugin<Setting.IManager> = {
  id: '@jupyterlab/services-extension:setting-manager',
  description: 'The setting manager plugin.',
  autoStart: true,
  provides: ISettingManager,
  optional: [IServerSettings],
  activate: (
    _: null,
    serverSettings: ServerConnection.ISettings | undefined
  ): Setting.IManager => {
    return new SettingManager({ serverSettings });
  }
};

/**
 * The terminal manager plugin.
 */
const terminalManagerPlugin: ServiceManagerPlugin<Terminal.IManager> = {
  id: '@jupyterlab/services-extension:terminal-manager',
  description: 'The terminal manager plugin.',
  autoStart: true,
  provides: ITerminalManager,
  optional: [IServerSettings],
  activate: (
    _: null,
    serverSettings: ServerConnection.ISettings | undefined
  ): Terminal.IManager => {
    return new TerminalManager({ serverSettings });
  }
};

/**
 * The user manager plugin.
 */
const userManagerPlugin: ServiceManagerPlugin<User.IManager> = {
  id: '@jupyterlab/services-extension:user-manager',
  description: 'The user manager plugin.',
  autoStart: true,
  provides: IUserManager,
  optional: [IServerSettings],
  activate: (
    _: null,
    serverSettings: ServerConnection.ISettings | undefined
  ): User.IManager => {
    return new UserManager({ serverSettings });
  }
};

/**
 * The workspace manager plugin.
 */
const workspaceManagerPlugin: ServiceManagerPlugin<Workspace.IManager> = {
  id: '@jupyterlab/services-extension:workspace-manager',
  description: 'The workspace manager plugin.',
  autoStart: true,
  provides: IWorkspaceManager,
  optional: [IServerSettings],
  activate: (
    _: null,
    serverSettings: ServerConnection.ISettings | undefined
  ): Workspace.IManager => {
    return new WorkspaceManager({ serverSettings });
  }
};

/**
 * The default server settings plugin.
 */
const serverSettingsPlugin: ServiceManagerPlugin<ServerConnection.ISettings> = {
  id: '@jupyterlab/services-extension:server-settings',
  description: 'The default server settings plugin.',
  autoStart: true,
  provides: IServerSettings,
  activate: (_: null): ServerConnection.ISettings => {
    return ServerConnection.makeSettings();
  }
};

/**
 * Instantiate a new service manager.
 */
const serviceManagerPlugin: ServiceManagerPlugin<ServiceManager.IManager> = {
  id: '@jupyterlab/services-extension:service-manager',
  description: 'The default service manager plugin.',
  autoStart: true,
  provides: IServiceManager,
  // Builder is not exposed as a plugin since it is now deprecated.
  optional: [
    IConnectionStatus,
    IContentsManager,
    IDefaultDrive,
    IServerSettings,
    IEventManager,
    IKernelManager,
    IKernelSpecManager,
    INbConvertManager,
    ISessionManager,
    ISettingManager,
    ITerminalManager,
    IUserManager,
    IWorkspaceManager
  ],
  activate: (
    _: null,
    connectionStatus: IConnectionStatus | undefined,
    contents: Contents.IManager | undefined,
    defaultDrive: Contents.IDrive | undefined,
    serverSettings: ServerConnection.ISettings | undefined,
    events: Event.IManager | undefined,
    kernels: Kernel.IManager | undefined,
    kernelspecs: KernelSpec.IManager | undefined,
    nbconvert: NbConvert.IManager | undefined,
    sessions: Session.IManager | undefined,
    settings: Setting.IManager | undefined,
    terminals: Terminal.IManager | undefined,
    user: User.IManager | undefined,
    workspaces: Workspace.IManager | undefined
  ): ServiceManager.IManager => {
    return new ServiceManager({
      standby: () => {
        return !connectionStatus?.isConnected || 'when-hidden';
      },
      contents,
      defaultDrive,
      serverSettings,
      events,
      kernels,
      kernelspecs,
      nbconvert,
      sessions,
      settings,
      terminals,
      user,
      workspaces
    });
  }
};

export default [
  configSectionManager,
  connectionStatusPlugin,
  contentsManagerPlugin,
  defaultDrivePlugin,
  eventManagerPlugin,
  kernelManagerPlugin,
  kernelSpecManagerPlugin,
  nbConvertManagerPlugin,
  sessionManagerPlugin,
  settingManagerPlugin,
  serverSettingsPlugin,
  serviceManagerPlugin,
  terminalManagerPlugin,
  userManagerPlugin,
  workspaceManagerPlugin
];
