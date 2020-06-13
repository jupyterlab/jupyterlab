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

import { LanguageServerManager } from './manager';

import { FileEditorJumper } from '@krassowski/jupyterlab_go_to_definition/lib/jumpers/fileeditor';
import { NotebookJumper } from '@krassowski/jupyterlab_go_to_definition/lib/jumpers/notebook';

// TODO: make use of it for jump target selection (requires to be added to package.json)?
// import 'codemirror/addon/hint/show-hint.css';
// import 'codemirror/addon/hint/show-hint';
import '../style/index.css';

import { ICompletionManager } from '@jupyterlab/completer';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { NotebookAdapter } from './adapters/jupyterlab/notebook';
import { FileEditorAdapter } from './adapters/jupyterlab/file_editor';
import { lsp_features } from './adapters/jupyterlab/jl_adapter';
import { IFeatureCommand } from './adapters/codemirror/feature';
import {
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

const lsp_commands: Array<IFeatureCommand> = [].concat(
  ...lsp_features.map(feature => feature.commands)
);

/**
 * The plugin registration information.
 */
const plugin: JupyterFrontEndPlugin<void> = {
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
  activate: (
    app: JupyterFrontEnd,
    fileEditorTracker: IEditorTracker,
    notebookTracker: INotebookTracker,
    settingRegistry: ISettingRegistry,
    palette: ICommandPalette,
    documentManager: IDocumentManager,
    completion_manager: ICompletionManager,
    rendermime_registry: IRenderMimeRegistry,
    paths: IPaths,
    labShell: ILabShell,
    status_bar: IStatusBar
  ) => {
    const language_server_manager = new LanguageServerManager({});
    const connection_manager = new DocumentConnectionManager({
      language_server_manager
    });

    const status_bar_item = new LSPStatus();
    status_bar_item.model.language_server_manager = language_server_manager;
    status_bar_item.model.connection_manager = connection_manager;

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
        let jumper = new FileEditorJumper(widget, documentManager);
        let adapter = new FileEditorAdapter(
          widget,
          jumper,
          app,
          completion_manager,
          rendermime_registry,
          connection_manager
        );
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
    command_manager.add(lsp_commands);

    const connect_notebook = (widget: NotebookPanel) => {
      // NOTE: assuming that the default cells content factory produces CodeMirror editors(!)
      let jumper = new NotebookJumper(widget, documentManager);
      let adapter = new NotebookAdapter(
        widget,
        jumper,
        app,
        completion_manager,
        rendermime_registry,
        connection_manager
      );
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
      lsp_commands.length + 2
    );
    notebook_command_manager.add_context_separator(0);
    notebook_command_manager.add(lsp_commands);

    function updateOptions(settings: ISettingRegistry.ISettings): void {
      // let options = settings.composite;
      // Object.keys(options).forEach((key) => {
      //  if (key === 'modifier') {
      //    // let modifier = options[key] as KeyModifier;
      //    CodeMirrorExtension.modifierKey = modifier;
      //  }
      // });
    }

    settingRegistry
      .load(plugin.id)
      .then(settings => {
        updateOptions(settings);
        settings.changed.connect(() => {
          updateOptions(settings);
        });
      })
      .catch((reason: Error) => {
        console.error(reason.message);
      });
  },
  autoStart: true
};

/**
 * Export the plugin as default.
 */
export default plugin;
