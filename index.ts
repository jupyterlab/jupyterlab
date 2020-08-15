import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette, IWidgetTracker } from '@jupyterlab/apputils';
import { INotebookTracker } from '@jupyterlab/notebook';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { Signal } from '@lumino/signaling';

import { LanguageServerManager } from './manager';

// TODO: make use of it for jump target selection (requires to be added to package.json)?
// import 'codemirror/addon/hint/show-hint.css';
// import 'codemirror/addon/hint/show-hint';
import '../style/index.css';

import { NotebookAdapter } from './adapters/jupyterlab/notebook';
import { FileEditorAdapter } from './adapters/jupyterlab/file_editor';
import {
  CommandEntryPoint,
  ContextCommandManager, IContextMenuOptions
} from './command_manager';
import { IStatusBar } from '@jupyterlab/statusbar';
import { LSPStatus } from './components/statusbar';
import { DocumentConnectionManager } from './connection_manager';
import {
  IAdapterRegistration,
  ILSPAdapterManager,
  ILSPFeatureManager,
  PLUGIN_ID,
  TLanguageServerConfigurations
} from './tokens';
import { IFeature } from './feature';
import { JUMP_PLUGIN } from './features/jump_to';
import { COMPLETION_PLUGIN } from './features/completion';
import { WidgetAdapter } from './adapters/jupyterlab/jl_adapter';
import { SIGNATURE_PLUGIN } from './features/signature';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { HOVER_PLUGIN } from './features/hover';
import { RENAME_PLUGIN } from './features/rename';
import { HIGHLIGHTS_PLUGIN } from './features/highlights';
import { DIAGNOSTICS_PLUGIN } from './features/diagnostics';
import IPaths = JupyterFrontEnd.IPaths;

import { LabIcon } from '@jupyterlab/ui-components';

import codeCheckSvg from '../style/icons/code-check.svg';

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

export interface IWidgetTypeOptions<T extends IDocumentWidget> {
  tracker: IWidgetTracker<T>;
  name: string;
  adapter: WidgetAdapterConstructor<T>;
  entrypoint: CommandEntryPoint;
  context_menu: IContextMenuOptions;
  get_id(widget: T): string;
}

export class WidgetAdapterManager implements ILSPAdapterManager {
  adapterChanged: Signal<WidgetAdapterManager, WidgetAdapter<IDocumentWidget>>;
  adapterDisposed: Signal<WidgetAdapterManager, WidgetAdapter<IDocumentWidget>>;
  currentAdapter: WidgetAdapter<IDocumentWidget>;   // TODO populate this!

  protected adapters: Map<string, WidgetAdapter<IDocumentWidget>> = new Map();

  get types(): IWidgetTypeOptions<IDocumentWidget>[] {
    return this.widgetTypes;
  }

  constructor(
    protected labShell: ILabShell,
    protected widgetTypes: IWidgetTypeOptions<IDocumentWidget>[]
  ) {
    this.adapterChanged = new Signal(this);
    this.adapterDisposed = new Signal(this);
    labShell.currentChanged.connect(this.onLabFocusChanged, this);
  }

  public registerExtension(extension: LSPExtension) {
    for(let type of this.widgetTypes) {
      type.tracker.widgetAdded.connect((tracker, widget) => {
        this.connectWidget(extension, widget, type)
      })
    }
  }

  protected connectWidget(extension: LSPExtension, widget: IDocumentWidget, type: IWidgetTypeOptions<IDocumentWidget>) {
    let adapter = new type.adapter(extension, widget);
    this.registerAdapter({
      adapter: adapter,
      id: type.get_id(widget),
      re_connector: () => {
        this.connectWidget(extension, widget, type)
      }
    });
  }

  protected onLabFocusChanged() {
    const current = this.labShell.currentWidget as IDocumentWidget;
    if (!current) {
      return;
    }
    let adapter = null;

    for (let type of this.widgetTypes) {
      if (type.tracker.has(current)) {
        let id = type.get_id(current);
        adapter = this.adapters.get(id);
      }
    }

    if (adapter != null) {
      this.adapterChanged.emit(adapter);
      this.currentAdapter = adapter;
    }
  }

  registerAdapter(options: IAdapterRegistration) {
    let { id, adapter, re_connector } = options;
    let widget = options.adapter.widget;

    if (this.adapters.has(id)) {
      let old = this.adapters.get(id);
      console.warn(`Adapter with id ${id} was already registered (${adapter} vs ${old}) `);
    }
    this.adapters.set(id, adapter);

    const disconnect = () => {
      this.adapters.delete(id);
      widget.disposed.disconnect(disconnect);
      widget.context.pathChanged.disconnect(reconnect);
      adapter.dispose();
    };

    const reconnect = () => {
      disconnect();
      re_connector();
    };

    widget.disposed.connect(() => {
      disconnect();
      this.adapterDisposed.emit(adapter);
    });
    widget.context.pathChanged.connect(reconnect);

    // TODO: maybe emit adapterCreated. Should it be handled by statusbar?
  }

  isAnyActive() {
    return (
      this.labShell.currentWidget &&
      this.widgetTypes.some((type) => type.tracker.currentWidget)
      &&
      this.widgetTypes.some((type) => type.tracker.currentWidget == this.labShell.currentWidget)
    );
  }
}

const WIDGET_ADAPTER_MANAGER: JupyterFrontEndPlugin<ILSPAdapterManager> = {
  id: PLUGIN_ID + ':ILSPAdapterManager',
  requires: [IEditorTracker, INotebookTracker, ILabShell],
  activate: (
    app,
    fileEditorTracker: IEditorTracker,
    notebookTracker: INotebookTracker,
    labShell: ILabShell
  ) => {
    const widgetTypes: IWidgetTypeOptions<IDocumentWidget>[] = [
      {
        name: 'notebook',
        tracker: notebookTracker,
        adapter: NotebookAdapter,
        entrypoint: CommandEntryPoint.CellContextMenu,
        get_id(widget: IDocumentWidget): string {
          // TODO can we use id instead of content.id?
          return widget.content.id
        },
        context_menu  : {
          selector: '.jp-Notebook .jp-CodeCell .jp-Editor',
          // position context menu entries after 10th but before 11th default entry
          // this lets it be before "Clear outputs" which is the last entry of the
          // CodeCell contextmenu and plays nicely with the first notebook entry
          // ('Clear all outputs') thus should stay as the last one.
          // see https://github.com/blink1073/jupyterlab/blob/3592afd328116a588e3307b4cdd9bcabc7fe92bb/packages/notebook-extension/src/index.ts#L802
          // TODO: PR bumping rank of clear all outputs instead?
          // adding a very small number (epsilon) places the group just after 10th entry
          rank_group: 10 + Number.EPSILON,
          // the group size is increased by one to account for separator,
          // and by another one to prevent exceeding 11th rank by epsilon.
          // TODO hardcoded space for 2 commands only!
          rank_group_size: 2 + 2,
          callback(manager) {
            manager.add_context_separator(0);
          }
        }
      },
      {
        name: 'file_editor',
        tracker: fileEditorTracker,
        adapter: FileEditorAdapter,
        entrypoint: CommandEntryPoint.FileEditorContextMenu,
        get_id(widget: IDocumentWidget): string {
          return widget.id
        },
        context_menu: {
          selector: '.jp-FileEditor',
        }
      }
    ];
    return new WidgetAdapterManager(
      labShell,
      widgetTypes
    );
  },
  provides: ILSPAdapterManager,
  autoStart: true
};

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
  ...default_features
];

/**
 * Export the plugins as default.
 */
export default plugins;
