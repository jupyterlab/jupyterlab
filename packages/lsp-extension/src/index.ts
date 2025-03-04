// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module lsp-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  LabShell
} from '@jupyterlab/application';
import {
  CodeExtractorsManager,
  DocumentConnectionManager,
  FeatureManager,
  ILSPCodeExtractorsManager,
  ILSPConnection,
  ILSPDocumentConnectionManager,
  ILSPFeatureManager,
  IWidgetLSPAdapterTracker,
  LanguageServerManager,
  LanguageServersExperimental,
  TextForeignCodeExtractor,
  TLanguageServerConfigurations,
  TLanguageServerId,
  WidgetLSPAdapterTracker
} from '@jupyterlab/lsp';
import { IRunningSessionManagers, IRunningSessions } from '@jupyterlab/running';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';
import {
  IFormRenderer,
  IFormRendererRegistry,
  LabIcon,
  pythonIcon
} from '@jupyterlab/ui-components';
import { PartialJSONObject } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';

import { renderServerSetting } from './renderer';

import type { FieldProps } from '@rjsf/utils';

const plugin: JupyterFrontEndPlugin<ILSPDocumentConnectionManager> = {
  activate,
  id: '@jupyterlab/lsp-extension:plugin',
  description: 'Provides the language server connection manager.',
  requires: [ITranslator, IWidgetLSPAdapterTracker],
  optional: [IRunningSessionManagers],
  provides: ILSPDocumentConnectionManager,
  autoStart: true
};

const featurePlugin: JupyterFrontEndPlugin<ILSPFeatureManager> = {
  id: '@jupyterlab/lsp-extension:feature',
  description: 'Provides the language server feature manager.',
  activate: () => new FeatureManager(),
  provides: ILSPFeatureManager,
  autoStart: true
};

const settingsPlugin: JupyterFrontEndPlugin<void> = {
  activate: activateSettings,
  id: '@jupyterlab/lsp-extension:settings',
  description: 'Provides the language server settings.',
  requires: [ILSPDocumentConnectionManager, ISettingRegistry, ITranslator],
  optional: [IFormRendererRegistry],
  autoStart: true
};

const codeExtractorManagerPlugin: JupyterFrontEndPlugin<ILSPCodeExtractorsManager> =
  {
    id: '@jupyterlab/lsp-extension:code-extractor-manager',
    autoStart: true,
    description: 'Provides the code extractor manager.',
    provides: ILSPCodeExtractorsManager,
    activate: app => {
      const extractorManager = new CodeExtractorsManager();

      const markdownCellExtractor = new TextForeignCodeExtractor({
        language: 'markdown',
        isStandalone: false,
        file_extension: 'md',
        cellType: ['markdown']
      });
      extractorManager.register(markdownCellExtractor, null);
      const rawCellExtractor = new TextForeignCodeExtractor({
        language: 'text',
        isStandalone: false,
        file_extension: 'txt',
        cellType: ['raw']
      });
      extractorManager.register(rawCellExtractor, null);
      return extractorManager;
    }
  };

/**
 * Activate the lsp plugin.
 */
function activate(
  app: JupyterFrontEnd,
  translator: ITranslator,
  tracker: IWidgetLSPAdapterTracker,
  runningSessionManagers: IRunningSessionManagers | null
): ILSPDocumentConnectionManager {
  const languageServerManager = new LanguageServerManager({
    settings: app.serviceManager.serverSettings
  });
  const connectionManager = new DocumentConnectionManager({
    languageServerManager,
    adapterTracker: tracker
  });

  // Add a sessions manager if the running extension is available
  if (runningSessionManagers) {
    addRunningSessionManager(
      runningSessionManagers,
      connectionManager,
      translator
    );
  }

  return connectionManager;
}

/**
 * Activate the lsp settings plugin.
 */
function activateSettings(
  app: JupyterFrontEnd,
  connectionManager: ILSPDocumentConnectionManager,
  settingRegistry: ISettingRegistry,
  translator: ITranslator,
  settingRendererRegistry: IFormRendererRegistry | null
): void {
  const LANGUAGE_SERVERS = 'languageServers';
  const languageServerManager = connectionManager.languageServerManager;

  const updateOptions = (settings: ISettingRegistry.ISettings) => {
    const options = settings.composite as Required<LanguageServersExperimental>;
    const languageServerSettings = (options.languageServers ||
      {}) as TLanguageServerConfigurations;
    if (options.activate === 'on' && !languageServerManager.isEnabled) {
      languageServerManager.enable().catch(console.error);
    } else if (options.activate === 'off' && languageServerManager.isEnabled) {
      languageServerManager.disable();
      return;
    }
    connectionManager.initialConfigurations = languageServerSettings;
    // TODO: if priorities changed reset connections
    connectionManager.updateConfiguration(languageServerSettings);
    connectionManager.updateServerConfigurations(languageServerSettings);
    connectionManager.updateLogging(
      options.logAllCommunication,
      options.setTrace
    );
  };

  settingRegistry.transform(plugin.id, {
    fetch: plugin => {
      const schema = plugin.schema.properties!;
      const defaultValue: { [key: string]: any } = {};
      languageServerManager.sessions.forEach((_, key) => {
        defaultValue[key] = { rank: 50, configuration: {} };
      });

      schema[LANGUAGE_SERVERS]['default'] = defaultValue;
      return plugin;
    },
    compose: plugin => {
      const properties = plugin.schema.properties!;
      const user = plugin.data.user;

      const serverDefaultSettings = properties[LANGUAGE_SERVERS][
        'default'
      ] as PartialJSONObject;
      const serverUserSettings = user[LANGUAGE_SERVERS] as
        | PartialJSONObject
        | undefined;
      let serverComposite = { ...serverDefaultSettings };
      if (serverUserSettings) {
        serverComposite = { ...serverComposite, ...serverUserSettings };
      }
      const composite: { [key: string]: any } = {
        [LANGUAGE_SERVERS]: serverComposite
      };
      Object.entries(properties).forEach(([key, value]) => {
        if (key !== LANGUAGE_SERVERS) {
          if (key in user) {
            composite[key] = user[key];
          } else {
            composite[key] = value.default;
          }
        }
      });
      plugin.data.composite = composite;
      return plugin;
    }
  });
  languageServerManager.sessionsChanged.connect(async () => {
    await settingRegistry.load(plugin.id, true);
  });

  settingRegistry
    .load(plugin.id)
    .then(settings => {
      updateOptions(settings);
      settings.changed.connect(() => {
        updateOptions(settings);
      });
      languageServerManager.disable();
    })
    .catch((reason: Error) => {
      console.error(reason.message);
    });

  if (settingRendererRegistry) {
    const renderer: IFormRenderer = {
      fieldRenderer: (props: FieldProps) => {
        return renderServerSetting(props, translator);
      }
    };
    settingRendererRegistry.addRenderer(
      `${plugin.id}.${LANGUAGE_SERVERS}`,
      renderer
    );
  }
}

export class RunningLanguageServer implements IRunningSessions.IRunningItem {
  constructor(
    connection: ILSPConnection,
    manager: ILSPDocumentConnectionManager
  ) {
    this._connection = new WeakSet([connection]);
    this._manager = manager;
    this._serverIdentifier = connection.serverIdentifier;
    this._serverLanguage = connection.serverLanguage;
  }
  /**
   * This is no-op because we do not do anything on server click event
   */
  open(): void {
    /** no-op */
  }
  icon(): LabIcon {
    return pythonIcon;
  }
  label(): string {
    return `${this._serverIdentifier ?? ''} (${this._serverLanguage ?? ''})`;
  }
  shutdown(): void {
    for (const [key, value] of this._manager.connections.entries()) {
      if (this._connection.has(value)) {
        const { uri } = this._manager.documents.get(key)!;
        this._manager.unregisterDocument(uri);
      }
    }
    this._manager.disconnect(this._serverIdentifier as TLanguageServerId);
  }
  private _connection: WeakSet<ILSPConnection>;
  private _manager: ILSPDocumentConnectionManager;
  private _serverIdentifier: string | undefined;
  private _serverLanguage: string | undefined;
}

/**
 * Add the running terminal manager to the running panel.
 */
function addRunningSessionManager(
  managers: IRunningSessionManagers,
  lsManager: ILSPDocumentConnectionManager,
  translator: ITranslator
) {
  const trans = translator.load('jupyterlab');
  const signal = new Signal<any, any>(lsManager);
  lsManager.connected.connect(() => signal.emit(lsManager));
  lsManager.disconnected.connect(() => signal.emit(lsManager));
  lsManager.closed.connect(() => signal.emit(lsManager));
  lsManager.documentsChanged.connect(() => signal.emit(lsManager));
  let currentRunning: RunningLanguageServer[] = [];
  managers.add({
    name: trans.__('Language servers'),
    supportsMultipleViews: false,
    running: () => {
      const connections = new Set([...lsManager.connections.values()]);

      currentRunning = [...connections].map(
        conn => new RunningLanguageServer(conn, lsManager)
      );
      return currentRunning;
    },
    shutdownAll: () => {
      currentRunning.forEach(item => {
        item.shutdown();
      });
    },
    refreshRunning: () => {
      return void 0;
    },
    runningChanged: signal,
    shutdownLabel: trans.__('Shut Down'),
    shutdownAllLabel: trans.__('Shut Down All'),
    shutdownAllConfirmationText: trans.__(
      'Are you sure you want to permanently shut down all running language servers?'
    )
  });
}

const adapterTrackerPlugin: JupyterFrontEndPlugin<IWidgetLSPAdapterTracker> = {
  id: '@jupyterlab/lsp-extension:tracker',
  description: 'Provides the tracker of `WidgetLSPAdapter`.',
  autoStart: true,
  provides: IWidgetLSPAdapterTracker,
  activate: (app: JupyterFrontEnd<LabShell>): IWidgetLSPAdapterTracker => {
    return new WidgetLSPAdapterTracker({ shell: app.shell });
  }
};

/**
 * Export the plugin as default.
 */
export default [
  plugin,
  featurePlugin,
  settingsPlugin,
  codeExtractorManagerPlugin,
  adapterTrackerPlugin
];
