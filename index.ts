/** The Public API, as exposed in the `main` field of package.json */

/** General public tokens, including lumino Tokens and namespaces */
export * from './tokens';

/** Component- and feature-specific APIs */
export * from './api';

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette } from '@jupyterlab/apputils';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { ILoggerRegistry } from '@jupyterlab/logconsole';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IStatusBar } from '@jupyterlab/statusbar';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { COMPLETION_THEME_MANAGER } from '@krassowski/completion-theme';
import { plugin as THEME_MATERIAL } from '@krassowski/theme-material';
import { plugin as THEME_VSCODE } from '@krassowski/theme-vscode';
import { Signal } from '@lumino/signaling';

import '../style/index.css';

import { LanguageServer } from './_plugin';
import { WIDGET_ADAPTER_MANAGER } from './adapter_manager';
import { FILE_EDITOR_ADAPTER } from './adapters/file_editor';
import { NOTEBOOK_ADAPTER } from './adapters/notebook';
import { ContextCommandManager } from './command_manager';
import { StatusButtonExtension } from './components/statusbar';
import { DocumentConnectionManager } from './connection_manager';
import { CODE_EXTRACTORS_MANAGER } from './extractors/manager';
import { IForeignCodeExtractorsRegistry } from './extractors/types';
import { IFeature } from './feature';
import { COMPLETION_PLUGIN } from './features/completion';
import { DIAGNOSTICS_PLUGIN } from './features/diagnostics';
import { HIGHLIGHTS_PLUGIN } from './features/highlights';
import { HOVER_PLUGIN } from './features/hover';
import { JUMP_PLUGIN } from './features/jump_to';
import { RENAME_PLUGIN } from './features/rename';
import { SIGNATURE_PLUGIN } from './features/signature';
import { SYNTAX_HIGHLIGHTING_PLUGIN } from './features/syntax_highlighting';
import { LanguageServerManager } from './manager';
import { CODE_OVERRIDES_MANAGER } from './overrides';
import {
  ICodeOverridesRegistry,
  ILSPCodeOverridesManager
} from './overrides/tokens';
import {
  IAdapterTypeOptions,
  ILSPAdapterManager,
  ILSPCodeExtractorsManager,
  ILSPFeatureManager,
  ILSPLogConsole,
  ILSPVirtualEditorManager,
  PLUGIN_ID,
  TLanguageServerConfigurations
} from './tokens';
import { DEFAULT_TRANSCLUSIONS } from './transclusions/defaults';
import { CODEMIRROR_VIRTUAL_EDITOR } from './virtual/codemirror_editor';
import { LOG_CONSOLE } from './virtual/console';
import { VIRTUAL_EDITOR_MANAGER } from './virtual/editor';

import IPaths = JupyterFrontEnd.IPaths;

export interface IFeatureOptions {
  /**
   * The feature to be registered.
   */
  feature: IFeature;
  /**
   * Identifiers (values of `JupyterFrontEndPlugin.id` field) of the features
   * that your feature wants to disable; use it to override the default feature
   * implementations with your custom implementation (e.g. a custom completer)
   */
  supersedes?: string[];
}

export class FeatureManager implements ILSPFeatureManager {
  features: Array<IFeature> = [];
  private command_managers: Array<ContextCommandManager> = [];
  private command_manager_registered: Signal<
    FeatureManager,
    ContextCommandManager
  >;

  constructor() {
    this.command_manager_registered = new Signal(this);
  }

  private _register(options: IFeatureOptions) {
    if (options.supersedes) {
      for (let option of options.supersedes) {
        this.features = this.features.filter(feature => feature.id != option);
      }
    }
    this.features.push(options.feature);

    if (options.feature.commands) {
      for (let command_manager of this.command_managers) {
        command_manager.add(options.feature.commands);
      }
      this.command_manager_registered.connect(
        (feature_manager, command_manager) => {
          command_manager.add(options.feature.commands);
        }
      );
    }
  }

  register(options: IFeatureOptions): void {
    if (options.feature.settings && options.feature.settings.ready) {
      options.feature.settings.ready
        .then(() => {
          if (!options.feature.settings.composite.disable) {
            this._register(options);
          } else {
            console.log('Skipping ', options.feature.id, 'as disabled');
          }
        })
        .catch(console.warn);
      return;
    } else {
      this._register(options);
    }
  }

  registerCommandManager(manager: ContextCommandManager) {
    this.command_managers.push(manager);
    this.command_manager_registered.emit(manager);
  }
}

export interface ILSPExtension {
  app: JupyterFrontEnd;
  connection_manager: DocumentConnectionManager;
  language_server_manager: LanguageServerManager;
  feature_manager: ILSPFeatureManager;
  editor_type_manager: ILSPVirtualEditorManager;
  foreign_code_extractors: IForeignCodeExtractorsRegistry;
  code_overrides: ICodeOverridesRegistry;
  console: ILSPLogConsole;
  translator: ITranslator;
  user_console: ILoggerRegistry | null;
}

export class LSPExtension implements ILSPExtension {
  connection_manager: DocumentConnectionManager;
  language_server_manager: LanguageServerManager;
  feature_manager: ILSPFeatureManager;

  constructor(
    public app: JupyterFrontEnd,
    private setting_registry: ISettingRegistry,
    private palette: ICommandPalette,
    documentManager: IDocumentManager,
    paths: IPaths,
    adapterManager: ILSPAdapterManager,
    public editor_type_manager: ILSPVirtualEditorManager,
    private code_extractors_manager: ILSPCodeExtractorsManager,
    private code_overrides_manager: ILSPCodeOverridesManager,
    public console: ILSPLogConsole,
    public translator: ITranslator,
    public user_console: ILoggerRegistry,
    status_bar: IStatusBar | null
  ) {
    const trans = (translator || nullTranslator).load('jupyterlab_lsp');
    this.language_server_manager = new LanguageServerManager({
      console: this.console.scope('LanguageServerManager')
    });
    this.connection_manager = new DocumentConnectionManager({
      language_server_manager: this.language_server_manager,
      console: this.console.scope('DocumentConnectionManager')
    });

    const statusButtonExtension = new StatusButtonExtension({
      language_server_manager: this.language_server_manager,
      connection_manager: this.connection_manager,
      adapter_manager: adapterManager,
      translator_bundle: trans
    });

    if (status_bar !== null) {
      status_bar.registerStatusItem(PLUGIN_ID + ':language-server-status', {
        item: statusButtonExtension.createItem(),
        align: 'left',
        rank: 1,
        isActive: () => adapterManager.isAnyActive()
      });
    } else {
      app.docRegistry.addWidgetExtension('Notebook', statusButtonExtension);
    }

    this.feature_manager = new FeatureManager();

    this.setting_registry
      .load(plugin.id)
      .then(settings => {
        const options = settings.composite as LanguageServer;
        // Store the initial server settings, to be sent asynchronously
        // when the servers are initialized.
        const initial_configuration = (options.language_servers ||
          {}) as TLanguageServerConfigurations;
        this.connection_manager.initial_configurations = initial_configuration;
        // update the server-independent part of configuration immediately
        this.connection_manager.updateConfiguration(initial_configuration);
        this.connection_manager.updateLogging(
          options.logAllCommunication,
          options.setTrace
        );

        settings.changed.connect(() => {
          this.updateOptions(settings);
        });
      })
      .catch((reason: Error) => {
        console.error(reason.message);
      });

    adapterManager.registerExtension(this);
  }

  registerAdapterType(
    adapterManager: ILSPAdapterManager,
    type: IAdapterTypeOptions<IDocumentWidget>
  ): void {
    let command_manger = new ContextCommandManager({
      adapter_manager: adapterManager,
      app: this.app,
      palette: this.palette,
      tracker: type.tracker,
      suffix: type.name,
      entry_point: type.entrypoint,
      console: this.console,
      ...type.context_menu
    });
    this.feature_manager.registerCommandManager(command_manger);
  }

  get foreign_code_extractors() {
    return this.code_extractors_manager.registry;
  }

  get code_overrides() {
    return this.code_overrides_manager.registry;
  }

  private updateOptions(settings: ISettingRegistry.ISettings) {
    const options = settings.composite as LanguageServer;

    const languageServerSettings = (options.language_servers ||
      {}) as TLanguageServerConfigurations;

    this.connection_manager.initial_configurations = languageServerSettings;
    // TODO: if priorities changed reset connections
    this.connection_manager.updateConfiguration(languageServerSettings);
    this.connection_manager.updateServerConfigurations(languageServerSettings);
    this.connection_manager.updateLogging(
      options.logAllCommunication,
      options.setTrace
    );
  }
}

/**
 * The plugin registration information.
 */
const plugin: JupyterFrontEndPlugin<ILSPFeatureManager> = {
  id: PLUGIN_ID + ':plugin',
  requires: [
    ISettingRegistry,
    ICommandPalette,
    IDocumentManager,
    IPaths,
    ILSPAdapterManager,
    ILSPVirtualEditorManager,
    ILSPCodeExtractorsManager,
    ILSPCodeOverridesManager,
    ILSPLogConsole,
    ITranslator
  ],
  optional: [ILoggerRegistry, IStatusBar],
  activate: (app, ...args) => {
    let extension = new LSPExtension(
      app,
      ...(args as [
        ISettingRegistry,
        ICommandPalette,
        IDocumentManager,
        IPaths,
        ILSPAdapterManager,
        ILSPVirtualEditorManager,
        ILSPCodeExtractorsManager,
        ILSPCodeOverridesManager,
        ILSPLogConsole,
        ITranslator,
        ILoggerRegistry | null,
        IStatusBar | null
      ])
    );
    return extension.feature_manager;
  },
  provides: ILSPFeatureManager,
  autoStart: true
};

const default_features: JupyterFrontEndPlugin<void>[] = [
  JUMP_PLUGIN,
  COMPLETION_PLUGIN,
  SIGNATURE_PLUGIN,
  HOVER_PLUGIN,
  RENAME_PLUGIN,
  HIGHLIGHTS_PLUGIN,
  DIAGNOSTICS_PLUGIN,
  SYNTAX_HIGHLIGHTING_PLUGIN
];

const plugins: JupyterFrontEndPlugin<any>[] = [
  LOG_CONSOLE,
  CODE_EXTRACTORS_MANAGER,
  WIDGET_ADAPTER_MANAGER,
  NOTEBOOK_ADAPTER,
  FILE_EDITOR_ADAPTER,
  VIRTUAL_EDITOR_MANAGER,
  CODEMIRROR_VIRTUAL_EDITOR,
  COMPLETION_THEME_MANAGER,
  THEME_VSCODE,
  THEME_MATERIAL,
  CODE_OVERRIDES_MANAGER,
  plugin,
  ...DEFAULT_TRANSCLUSIONS,
  ...default_features
];

/**
 * Export the plugins as default.
 */
export default plugins;
