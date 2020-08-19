import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette } from '@jupyterlab/apputils';
import { INotebookTracker } from '@jupyterlab/notebook';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IDocumentManager } from '@jupyterlab/docmanager';

import { LanguageServerManager } from './manager';

import '../style/index.css';
import { ContextCommandManager } from './command_manager';
import { IStatusBar } from '@jupyterlab/statusbar';
import { LSPStatus } from './components/statusbar';
import { DocumentConnectionManager } from './connection_manager';
import {
  ILSPAdapterManager,
  ILSPFeatureManager,
  ILSPVirtualEditorManager,
  PLUGIN_ID,
  TLanguageServerConfigurations
} from './tokens';
import { IFeature } from './feature';
import { JUMP_PLUGIN } from './features/jump_to';
import { COMPLETION_PLUGIN } from './features/completion';
import { SIGNATURE_PLUGIN } from './features/signature';
import { HOVER_PLUGIN } from './features/hover';
import { RENAME_PLUGIN } from './features/rename';
import { HIGHLIGHTS_PLUGIN } from './features/highlights';
import { DIAGNOSTICS_PLUGIN } from './features/diagnostics';

import { LabIcon } from '@jupyterlab/ui-components';

import codeCheckSvg from '../style/icons/code-check.svg';
import { WIDGET_ADAPTER_MANAGER } from './adapter_manager';
import { FILE_EDITOR_ADAPTER } from './adapters/file_editor';
import { NOTEBOOK_ADAPTER } from './adapters/notebook';
import { VIRTUAL_EDITOR_MANAGER } from './virtual/editor';
import IPaths = JupyterFrontEnd.IPaths;
import { CODEMIRROR_VIRTUAL_EDITOR } from './virtual/codemirror_editor';

export const codeCheckIcon = new LabIcon({
  name: 'lsp:codeCheck',
  svgstr: codeCheckSvg
});

export interface IFeatureOptions {
  feature: IFeature;
  /** ids of the features this feature wants to disable;
    use it to override the default feature implementations with your custom implementation
    (e.g. a custom completer from Kite)  */
  supersedes?: string[];
}

export class FeatureManager implements ILSPFeatureManager {
  features: Array<IFeature> = [];
  constructor(private command_managers: Array<ContextCommandManager> = []) {}

  register(options: IFeatureOptions): void {
    if (options.supersedes) {
      for (let option of options.supersedes) {
        this.features = this.features.filter(feature => feature.id != option);
      }
    }
    this.features.push(options.feature);

    for (let command_manager of this.command_managers) {
      if (options.feature.commands) {
        command_manager.add(options.feature.commands);
      }
    }
  }
}

export interface ILSPExtension {
  app: JupyterFrontEnd;
  connection_manager: DocumentConnectionManager;
  language_server_manager: LanguageServerManager;
  feature_manager: ILSPFeatureManager;
  editor_type_manager: ILSPVirtualEditorManager;
}

export class LSPExtension implements ILSPExtension {
  connection_manager: DocumentConnectionManager;
  language_server_manager: LanguageServerManager;
  feature_manager: ILSPFeatureManager;

  constructor(
    public app: JupyterFrontEnd,
    private setting_registry: ISettingRegistry,
    palette: ICommandPalette,
    documentManager: IDocumentManager,
    paths: IPaths,
    status_bar: IStatusBar,
    adapterManager: ILSPAdapterManager,
    public editor_type_manager: ILSPVirtualEditorManager
  ) {
    this.language_server_manager = new LanguageServerManager({});
    this.connection_manager = new DocumentConnectionManager({
      language_server_manager: this.language_server_manager
    });

    const status_bar_item = new LSPStatus(adapterManager);
    status_bar_item.model.language_server_manager = this.language_server_manager;
    status_bar_item.model.connection_manager = this.connection_manager;

    status_bar.registerStatusItem(PLUGIN_ID + ':language-server-status', {
      item: status_bar_item,
      align: 'left',
      rank: 1,
      isActive: () => adapterManager.isAnyActive()
    });

    let command_mangers: ContextCommandManager[] = [];

    for (let type of adapterManager.types) {
      new ContextCommandManager({
        adapter_manager: adapterManager,
        app: app,
        palette: palette,
        tracker: type.tracker,
        suffix: type.name,
        entry_point: type.entrypoint,
        ...type.context_menu
      });
    }

    this.feature_manager = new FeatureManager(command_mangers);

    this.setting_registry
      .load(plugin.id)
      .then(settings => {
        // Store the initial server settings, to be sent asynchronously
        // when the servers are initialized.
        this.connection_manager.initial_configurations = (settings.composite
          .language_servers || {}) as TLanguageServerConfigurations;

        settings.changed.connect(() => {
          this.updateOptions(settings);
        });
      })
      .catch((reason: Error) => {
        console.error(reason.message);
      });
  }

  private updateOptions(settings: ISettingRegistry.ISettings) {
    const options = settings.composite;

    const languageServerSettings = (options.language_servers ||
      {}) as TLanguageServerConfigurations;
    this.connection_manager.updateServerConfigurations(languageServerSettings);
  }
}

/**
 * The plugin registration information.
 */
const plugin: JupyterFrontEndPlugin<ILSPFeatureManager> = {
  id: PLUGIN_ID + ':plugin',
  requires: [
    IEditorTracker,
    INotebookTracker,
    ISettingRegistry,
    ICommandPalette,
    IDocumentManager,
    IPaths,
    IStatusBar,
    ILSPAdapterManager,
    ILSPVirtualEditorManager
  ],
  activate: (app, ...args) => {
    let extension = new LSPExtension(
      app,
      ...(args as [
        ISettingRegistry,
        ICommandPalette,
        IDocumentManager,
        IPaths,
        IStatusBar,
        ILSPAdapterManager,
        ILSPVirtualEditorManager
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
  DIAGNOSTICS_PLUGIN
];

const plugins: JupyterFrontEndPlugin<any>[] = [
  plugin,
  WIDGET_ADAPTER_MANAGER,
  NOTEBOOK_ADAPTER,
  FILE_EDITOR_ADAPTER,
  VIRTUAL_EDITOR_MANAGER,
  CODEMIRROR_VIRTUAL_EDITOR,
  ...default_features
];

/**
 * Export the plugins as default.
 */
export default plugins;
