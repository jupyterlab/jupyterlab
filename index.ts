import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { ICommandPalette, IWidgetTracker } from '@jupyterlab/apputils';
import { INotebookTracker } from '@jupyterlab/notebook';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IDocumentManager } from '@jupyterlab/docmanager';

import { LanguageServerManager } from './manager';

// TODO: make use of it for jump target selection (requires to be added to package.json)?
// import 'codemirror/addon/hint/show-hint.css';
// import 'codemirror/addon/hint/show-hint';
import '../style/index.css';
import { CommandEntryPoint, ContextCommandManager, IContextMenuOptions } from './command_manager';
import { IStatusBar } from '@jupyterlab/statusbar';
import { LSPStatus } from './components/statusbar';
import { DocumentConnectionManager } from './connection_manager';
import { ILSPAdapterManager, ILSPFeatureManager, PLUGIN_ID, TLanguageServerConfigurations } from './tokens';
import { IFeature } from './feature';
import { JUMP_PLUGIN } from './features/jump_to';
import { COMPLETION_PLUGIN } from './features/completion';
import { WidgetAdapter } from './adapters/adapter';
import { SIGNATURE_PLUGIN } from './features/signature';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { HOVER_PLUGIN } from './features/hover';
import { RENAME_PLUGIN } from './features/rename';
import { HIGHLIGHTS_PLUGIN } from './features/highlights';
import { DIAGNOSTICS_PLUGIN } from './features/diagnostics';

import { LabIcon } from '@jupyterlab/ui-components';

import codeCheckSvg from '../style/icons/code-check.svg';
import { WIDGET_ADAPTER_MANAGER } from "./adapter_manager";
import { FILE_EDITOR_ADAPTER } from "./adapters/file_editor";
import { NOTEBOOK_ADAPTER } from "./adapters/notebook";
import IPaths = JupyterFrontEnd.IPaths;

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

class FeatureManager implements ILSPFeatureManager {
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

export type WidgetAdapterConstructor<T extends IDocumentWidget> = {
  new (extension: LSPExtension, widget: T): WidgetAdapter<T>;
};

export interface IAdapterTypeOptions<T extends IDocumentWidget> {
  tracker: IWidgetTracker<T>;
  name: string;
  adapter: WidgetAdapterConstructor<T>;
  entrypoint: CommandEntryPoint;
  context_menu: IContextMenuOptions;
  get_id(widget: T): string;
}


export class LSPExtension {
  connection_manager: DocumentConnectionManager;
  language_server_manager: LanguageServerManager;
  feature_manager: FeatureManager;

  constructor(
    public app: JupyterFrontEnd,
    private setting_registry: ISettingRegistry,
    palette: ICommandPalette,
    documentManager: IDocumentManager,
    paths: IPaths,
    status_bar: IStatusBar,
    adapterManager: ILSPAdapterManager
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

    let command_mangers: ContextCommandManager[] = []

    for (let type of adapterManager.types) {
      new ContextCommandManager(
        {
          adapter_manager: adapterManager,
          app: app,
          palette: palette,
          tracker: type.tracker,
          suffix: type.name,
          entry_point: type.entrypoint,
          ...type.context_menu
        }
      )
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
    this.connection_manager.updateServerConfigurations(
      languageServerSettings
    );
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
    ILSPAdapterManager
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
        ILSPAdapterManager
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
  ...default_features
];

/**
 * Export the plugins as default.
 */
export default plugins;
