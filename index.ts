import { ILabShell, JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { ICommandPalette } from '@jupyterlab/apputils';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';
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
import { ContextCommandManager, FileEditorCommandManager, NotebookCommandManager } from './command_manager';
import { IStatusBar } from '@jupyterlab/statusbar';
import { LSPStatus } from './components/statusbar';
import { DocumentConnectionManager } from './connection_manager';
import {
  AdapterRegistration,
  ILSPAdapterManager,
  ILSPFeatureManager,
  PLUGIN_ID,
  TLanguageServerConfigurations
} from './tokens';
import { IFeature } from './feature';
import { JUMP_PLUGIN } from './features/jump_to';
import { COMPLETION_PLUGIN } from "./features/completion";
import { WidgetAdapter } from "./adapters/jupyterlab/jl_adapter";
import { SIGNATURE_PLUGIN } from "./features/signature";
import { IDocumentWidget } from "@jupyterlab/docregistry";
import { HOVER_PLUGIN } from "./features/hover";
import { RENAME_PLUGIN } from "./features/rename";
import { HIGHLIGHTS_PLUGIN } from "./features/highlights";
import { DIAGNOSTICS_PLUGIN } from "./features/diagnostics";
import IPaths = JupyterFrontEnd.IPaths;


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
    for (let option of options.supersedes) {
      this.features = this.features.filter(feature => feature.id != option);
    }
    this.features.push(options.feature);

    for (let command_manager of this.command_managers) {
      command_manager.add(options.feature.commands);
    }
  }
}


export type AdaptersMap<T extends WidgetAdapter<IDocumentWidget>> = Map<string, T>;
export const file_editor_adapters: AdaptersMap<FileEditorAdapter> = new Map();
export const notebook_adapters: AdaptersMap<NotebookAdapter> = new Map();

export class WidgetAdapterManager implements ILSPAdapterManager {
  adapterChanged: Signal<WidgetAdapterManager, WidgetAdapter<IDocumentWidget>>
  adapterDisposed: Signal<WidgetAdapterManager, WidgetAdapter<IDocumentWidget>>
  currentAdapter: WidgetAdapter<IDocumentWidget>

  constructor(private labShell: ILabShell, private fileEditorTracker: IEditorTracker, private notebookTracker: INotebookTracker) {
    this.adapterChanged = new Signal(this);
    this.adapterDisposed = new Signal(this);
    labShell.currentChanged.connect(this.onLabFocusChanged, this);
  }

  protected onLabFocusChanged() {
    const current = this.labShell.currentWidget;
    if (!current) {
      return;
    }
    let adapter = null;
    if (this.notebookTracker.has(current)) {
      let id = (current as NotebookPanel).id;
      adapter = notebook_adapters.get(id);
    } else if (this.fileEditorTracker.has(current)) {
      let id = (current as IDocumentWidget<FileEditor>).content.id;
      adapter = file_editor_adapters.get(id);
    }

    if (adapter != null) {
      this.adapterChanged.emit(adapter);
    }
  }

  register(options: AdapterRegistration) {
    let { id, adapter, type, re_connector } = options;
    let widget = options.adapter.widget;

    let map: AdaptersMap<any>;

    switch (type) {
      case "file-editor":
        map = file_editor_adapters;
        break;
      case "notebook":
        map = notebook_adapters;
        break;
    }

    map.set(id, adapter);

    const disconnect = () => {
      map.delete(id);
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
   return this.labShell.currentWidget &&
    (this.fileEditorTracker.currentWidget || this.notebookTracker.currentWidget) &&
    (this.labShell.currentWidget === this.fileEditorTracker.currentWidget ||
      this.labShell.currentWidget === this.notebookTracker.currentWidget)
  }

}

const WIDGET_ADAPTER_MANAGER: JupyterFrontEndPlugin<ILSPAdapterManager> = {
  id: PLUGIN_ID + ':ILSPWidgetAdapterManager',
  requires: [
    IEditorTracker,
    INotebookTracker,
    ILabShell,
  ],
  activate: (app, fileEditorTracker: IEditorTracker, notebookTracker: INotebookTracker, labShell: ILabShell) => {
    return new WidgetAdapterManager(labShell, fileEditorTracker, notebookTracker);
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
    fileEditorTracker: IEditorTracker,
    notebookTracker: INotebookTracker,
    private setting_registry: ISettingRegistry,
    palette: ICommandPalette,
    documentManager: IDocumentManager,
    paths: IPaths,
    status_bar: IStatusBar,
    private adapterManager: ILSPAdapterManager
  ) {
    this.language_server_manager = new LanguageServerManager({});
    this.connection_manager = new DocumentConnectionManager({
      language_server_manager: this.language_server_manager
    });


    fileEditorTracker.widgetAdded.connect((sender, widget) => {
      this.connect_file_editor(widget);
    }, this);


    notebookTracker.widgetAdded.connect(async (sender, widget) => {
      this.connect_notebook(widget);
    });

    const status_bar_item = new LSPStatus(adapterManager);
    status_bar_item.model.language_server_manager = this.language_server_manager;
    status_bar_item.model.connection_manager = this.connection_manager;

    status_bar.registerStatusItem(
      PLUGIN_ID + ':language-server-status',
      {
        item: status_bar_item,
        align: 'left',
        rank: 1,
        isActive: () => adapterManager.isAnyActive()
      }
    );

    fileEditorTracker.widgetUpdated.connect((_sender, _widget) => {
      console.log(_sender);
      console.log(_widget);
      // TODO?
      // adapter.remove();
      // connection.close();
    });

    let command_manager = new FileEditorCommandManager(
      app,
      palette,
      fileEditorTracker,
      'file_editor'
    );

    // position context menu entries after 10th but before 11th default entry
    // this lets it be before "Clear outputs" which is the last entry of the
    // CodeCell contextmenu and plays nicely with the first notebook entry
    // ('Clear all outputs') thus should stay as the last one.
    // see https://github.com/blink1073/jupyterlab/blob/3592afd328116a588e3307b4cdd9bcabc7fe92bb/packages/notebook-extension/src/index.ts#L802
    // TODO: PR bumping rank of clear all outputs instead?
    let notebook_command_manager = new NotebookCommandManager(
      app,
      palette,
      notebookTracker,
      'notebook',
      // adding a very small number (epsilon) places the group just after 10th entry
      10 + Number.EPSILON,
      // the group size is increased by one to account for separator,
      // and by another one to prevent exceeding 11th rank by epsilon.
      // TODO hardcoded space for 2 commands only!
      2 + 2
    );
    notebook_command_manager.add_context_separator(0);
    this.feature_manager = new FeatureManager([
      command_manager,
      notebook_command_manager
    ]);

    const updateOptions = (settings: ISettingRegistry.ISettings) => {
      const options = settings.composite;

      const languageServerSettings = (options.language_servers ||
        {}) as TLanguageServerConfigurations;
      this.connection_manager.updateServerConfigurations(
        languageServerSettings
      );
    };

    this.setting_registry
      .load(plugin.id)
      .then(settings => {
        // Store the initial server settings, to be sent asynchronously
        // when the servers are initialized.
        this.connection_manager.initial_configurations = (settings.composite
          .language_servers || {}) as TLanguageServerConfigurations;

        settings.changed.connect(() => {
          updateOptions(settings);
        });
      })
      .catch((reason: Error) => {
        console.error(reason.message);
      });
  }

  private connect_file_editor(widget: IDocumentWidget<FileEditor>) {
    let fileEditor = widget.content;

    if (fileEditor.editor instanceof CodeMirrorEditor) {
      let adapter = new FileEditorAdapter(this, widget);
      this.adapterManager.register({
        id: fileEditor.id,
        adapter: adapter,
        type: 'file-editor',
        re_connector: () => {
          this.connect_file_editor(widget)
        }
      })
    }
  };

  private connect_notebook(widget: NotebookPanel) {
    // NOTE: assuming that the default cells content factory produces CodeMirror editors(!)
    let adapter = new NotebookAdapter(this, widget);
    this.adapterManager.register({
      id: widget.id,
      adapter: adapter,
      type: 'notebook',
      re_connector: () => {
        this.connect_notebook(widget)
      }
    })
  };
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
        IEditorTracker,
        INotebookTracker,
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
]

/**
 * Export the plugins as default.
 */
export default plugins;
