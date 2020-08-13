import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette } from '@jupyterlab/apputils';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { Token } from '@lumino/coreutils';

import { LanguageServerManager } from './manager';


// TODO: make use of it for jump target selection (requires to be added to package.json)?
// import 'codemirror/addon/hint/show-hint.css';
// import 'codemirror/addon/hint/show-hint';
import '../style/index.css';

import { ICompletionManager } from '@jupyterlab/completer';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { NotebookAdapter } from './adapters/jupyterlab/notebook';
import { FileEditorAdapter } from './adapters/jupyterlab/file_editor';
import {
  ContextCommandManager,
  file_editor_adapters,
  FileEditorCommandManager,
  notebook_adapters,
  NotebookCommandManager
} from './command_manager';
import IPaths = JupyterFrontEnd.IPaths;
import { IStatusBar } from '@jupyterlab/statusbar';
import { LSPStatus } from './adapters/jupyterlab/components/statusbar';
import {
  IDocumentWidget,
  DocumentRegistry
} from '@jupyterlab/docregistry/lib/registry';
import { DocumentConnectionManager } from './connection_manager';
import { TLanguageServerConfigurations } from './tokens';
import { IFeature } from "./feature";
import { JUMP_PLUGIN } from "./features/jump_to";


export interface IFeatureOptions {
    feature: IFeature;
    /** ids of the features this feature wants to disable;
    use it to override the default feature implementations with your custom implementation
    (e.g. a custom completer from Kite)  */
    supersedes?: string[];
}

export interface ILSPFeatureManager {
  register(options: IFeatureOptions): void;
}

class FeatureManager implements ILSPFeatureManager{

  features: Array<IFeature> = [];
  constructor(
    private command_managers: Array<ContextCommandManager> = []
  ) {

  }


  register(options: IFeatureOptions): void {
    for (let option of options.supersedes) {
      this.features = this.features.filter(feature => feature.id != option)
    }
    this.features.push(options.feature)

    for (let command_manager of this.command_managers) {
      command_manager.add(options.feature.commands);
    }
  }
}

export class LSPExtension {
  connection_manager: DocumentConnectionManager;
  language_server_manager: LanguageServerManager;
  settings: ISettingRegistry.ISettings;
  feature_manager: FeatureManager;

  constructor(
    public app: JupyterFrontEnd,
    fileEditorTracker: IEditorTracker,
    notebookTracker: INotebookTracker,
    private setting_registry: ISettingRegistry,
    palette: ICommandPalette,
    documentManager: IDocumentManager,
    public completion_manager: ICompletionManager,
    public rendermime_registry: IRenderMimeRegistry,
    paths: IPaths,
    labShell: ILabShell,
    status_bar: IStatusBar
  ) {
    this.language_server_manager = new LanguageServerManager({});
    this.connection_manager = new DocumentConnectionManager({
      language_server_manager: this.language_server_manager
    });

    const status_bar_item = new LSPStatus();
    status_bar_item.model.language_server_manager = this.language_server_manager;
    status_bar_item.model.connection_manager = this.connection_manager;

    labShell.currentChanged.connect(() => {
      const current = labShell.currentWidget;
      if (!current) {
        return;
      }
      let adapter = null;
      if (notebookTracker.has(current)) {
        let id = (current as NotebookPanel).id;
        adapter = notebook_adapters.get(id);
      } else if (fileEditorTracker.has(current)) {
        let id = (current as IDocumentWidget<FileEditor>).content.id;
        adapter = file_editor_adapters.get(id);
      }

      if (adapter != null) {
        status_bar_item.model.adapter = adapter;
      }
    });

    status_bar.registerStatusItem(
      '@krassowski/jupyterlab-lsp:language-server-status',
      {
        item: status_bar_item,
        align: 'left',
        rank: 1,
        isActive: () =>
          labShell.currentWidget &&
          (fileEditorTracker.currentWidget || notebookTracker.currentWidget) &&
          (labShell.currentWidget === fileEditorTracker.currentWidget ||
            labShell.currentWidget === notebookTracker.currentWidget)
      }
    );

    fileEditorTracker.widgetUpdated.connect((_sender, _widget) => {
      console.log(_sender);
      console.log(_widget);
      // TODO?
      // adapter.remove();
      // connection.close();
    });

    const connect_file_editor = (
      widget: IDocumentWidget<FileEditor, DocumentRegistry.IModel>
    ) => {
      let fileEditor = widget.content;

      if (fileEditor.editor instanceof CodeMirrorEditor) {
        let adapter = new FileEditorAdapter(this, widget);
        file_editor_adapters.set(fileEditor.id, adapter);

        const disconnect = () => {
          file_editor_adapters.delete(fileEditor.id);
          widget.disposed.disconnect(disconnect);
          widget.context.pathChanged.disconnect(reconnect);
          adapter.dispose();
          if (status_bar_item.model.adapter === adapter) {
            status_bar_item.model.adapter = null;
          }
        };

        const reconnect = () => {
          disconnect();
          connect_file_editor(widget);
        };

        widget.disposed.connect(disconnect);
        widget.context.pathChanged.connect(reconnect);

        status_bar_item.model.adapter = adapter;
      }
    };

    fileEditorTracker.widgetAdded.connect((sender, widget) => {
      connect_file_editor(widget);
    });

    let command_manager = new FileEditorCommandManager(
      app,
      palette,
      fileEditorTracker,
      'file_editor'
    );

    const connect_notebook = (widget: NotebookPanel) => {
      // NOTE: assuming that the default cells content factory produces CodeMirror editors(!)
      let adapter = new NotebookAdapter(this, widget);
      notebook_adapters.set(widget.id, adapter);

      const disconnect = () => {
        notebook_adapters.delete(widget.id);
        widget.disposed.disconnect(disconnect);
        widget.context.pathChanged.disconnect(reconnect);
        adapter.dispose();
        if (status_bar_item.model.adapter === adapter) {
          status_bar_item.model.adapter = null;
        }
      };

      const reconnect = () => {
        disconnect();
        connect_notebook(widget);
      };

      widget.context.pathChanged.connect(reconnect);
      widget.disposed.connect(disconnect);

      status_bar_item.model.adapter = adapter;
    };

    notebookTracker.widgetAdded.connect(async (sender, widget) => {
      connect_notebook(widget);
    });

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
    this.feature_manager = new FeatureManager([command_manager, notebook_command_manager]);

    const updateOptions = (settings: ISettingRegistry.ISettings) => {
      const options = settings.composite;

      const languageServerSettings = (options.language_servers ||
        {}) as TLanguageServerConfigurations;
      this.connection_manager.updateServerConfigurations(
        languageServerSettings
      );
      this.settings = settings;
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
        this.settings = settings;
      })
      .catch((reason: Error) => {
        console.error(reason.message);
      });
  }
}

const PLUGIN_ID = '@krassowski/jupyterlab-lsp'

export const ILSPFeatureManager = new Token<ILSPFeatureManager>(PLUGIN_ID);


/**
 * The plugin registration information.
 */
const plugin: JupyterFrontEndPlugin<ILSPFeatureManager> = {
  id: '@krassowski/jupyterlab-lsp:plugin',
  requires: [
    IEditorTracker,
    INotebookTracker,
    ISettingRegistry,
    ICommandPalette,
    IDocumentManager,
    ICompletionManager,
    IRenderMimeRegistry,
    IPaths,
    ILabShell,
    IStatusBar
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
        ICompletionManager,
        IRenderMimeRegistry,
        IPaths,
        ILabShell,
        IStatusBar
      ])
    );
    return extension.feature_manager;
  },
  provides: ILSPFeatureManager,
  autoStart: true
};

const default_features: JupyterFrontEndPlugin<void>[] = [
  JUMP_PLUGIN
  /*
    Completion,
    Diagnostics,
    Highlights,
    Hover,
    Signature,
    JumpToDefinition,
    Rename
   */
];

const plugins: JupyterFrontEndPlugin<any>[] = [plugin, ...default_features];

/**
 * Export the plugins as default.
 */
export default plugins;
