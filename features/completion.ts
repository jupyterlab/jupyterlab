import { CompletionTriggerKind } from '../lsp';
import * as CodeMirror from 'codemirror';
import { CodeMirrorIntegration } from '../editor_integration/codemirror';
import { JupyterFrontEnd, JupyterFrontEndPlugin } from "@jupyterlab/application";
import {  IEditorChangedData, WidgetAdapter } from "../adapters/jupyterlab/jl_adapter";
import { LSPConnector } from "./completion_handler";
import { ICompletionManager } from "@jupyterlab/completer";
import { CodeEditor } from "@jupyterlab/codeeditor";
import { IDocumentWidget } from "@jupyterlab/docregistry";
import { NotebookPanel } from "@jupyterlab/notebook";
import { FeatureSettings, IFeatureLabIntegration } from "../feature";
import { ISettingRegistry } from "@jupyterlab/settingregistry";

import { LSPCompletionSettings } from '../_completion';
import { IDocumentConnectionData } from "../connection_manager";
import { ILSPAdapterManager, ILSPFeatureManager, PLUGIN_ID } from "../tokens";
import { NotebookAdapter } from "../adapters/jupyterlab/notebook";


export class CompletionCM extends CodeMirrorIntegration {
  private _completionCharacters: string[];
  // TODO chek if this works if yest then remove seetings from options
  settings: FeatureSettings<LSPCompletionSettings>

  get completionCharacters() {
    if (
      this._completionCharacters == null ||
      !this._completionCharacters.length
    ) {
      this._completionCharacters = this.connection.getLanguageCompletionCharacters();
    }
    return this._completionCharacters;
  }

  // public handleCompletion(completions: lsProtocol.CompletionItem[]) {
  // TODO: populate the (already displayed) completions list if the completions timed out initially?
  // }

  afterChange(change: CodeMirror.EditorChange): void {
    // TODO: maybe the completer could be kicked off in the handleChange() method directly; signature help still
    //  requires an up-to-date virtual document on the LSP side, so we need to wait for sync.
    if (
      change.text &&
      change.text[0].length == 1 &&
      (this.settings.composite.continuousHinting)
    ) {
      (this.feature.labIntegration as CompletionLabIntegration).invoke_completer(
        CompletionTriggerKind.Invoked
      ).catch(console.warn);
      return;
    }

    let last_character = this.extract_last_character(change);
    if (this.completionCharacters.indexOf(last_character) > -1) {
      this.virtual_editor.console.log(
        'Will invoke completer after',
        last_character
      );
      (this.feature.labIntegration as CompletionLabIntegration).invoke_completer(
        CompletionTriggerKind.TriggerCharacter
      ).catch(console.warn);
    }
  }
}

export class CompletionLabIntegration implements IFeatureLabIntegration {
  // TODO: maybe instead of creating it each time, keep a hash map instead?
  protected current_completion_connector: LSPConnector;
  protected current_completion_handler: ICompletionManager.ICompletableAttributes;
  protected current_adapter: WidgetAdapter<IDocumentWidget> = null;

  constructor(
    private app: JupyterFrontEnd, private completionManager: ICompletionManager,
    public settings: FeatureSettings<LSPCompletionSettings>,
    private adapterManager: ILSPAdapterManager
  ) {
    // disconnect old adapter, connect new adapter
    adapterManager.adapterChanged.connect(this.swap_adapter, this)
  }

  private swap_adapter(manager: ILSPAdapterManager, adapter: WidgetAdapter<IDocumentWidget>) {
    if (this.current_adapter) {
      this.current_adapter.activeEditorChanged.disconnect(this.set_connector)
      this.current_adapter.adapterConnected.disconnect(this.connect_completion)
    }
    this.current_adapter = adapter;
    this.current_adapter.activeEditorChanged.connect(this.set_connector, this)
    this.current_adapter.adapterConnected.connect(this.connect_completion, this);
  }

  connect_completion(adapter: WidgetAdapter<IDocumentWidget>, data: IDocumentConnectionData) {
    let editor = adapter.activeEditor
    if (editor == null) {
      return;
    }
    this.set_completion_connector(adapter, editor);
    this.current_completion_handler = this.completionManager.register({
      connector: this.current_completion_connector,
      editor: editor,
      parent: adapter.widget
    });
  }

  invoke_completer(kind: CompletionTriggerKind) {
    let command: string;

    if (this.adapterManager.currentAdapter instanceof NotebookAdapter) {
      command = 'completer:invoke-notebook'
    } else {
      command = 'completer:invoke-file';
    }
    return this.app.commands.execute(command);
  }

  set_connector(adapter: WidgetAdapter<IDocumentWidget>, editor_changed: IEditorChangedData) {
    this.set_completion_connector(adapter, editor_changed.editor);
    this.current_completion_handler.editor = editor_changed.editor;
    this.current_completion_handler.connector = this.current_completion_connector;
  }

  private set_completion_connector(adapter: WidgetAdapter<IDocumentWidget>, editor: CodeEditor.IEditor) {
    if (this.current_completion_connector) {
      delete this.current_completion_connector;
    }
    this.current_completion_connector = new LSPConnector({
      editor: editor,
      connections: this.current_adapter.connection_manager.connections,
      virtual_editor: this.current_adapter.virtual_editor,
      settings: this.settings,
      // it might or might not be a notebook panel (if it is not, the sessionContext and session will just be undefined)
      session: (this.current_adapter.widget as NotebookPanel)?.sessionContext?.session
    });
  }
}

const FEATURE_ID = PLUGIN_ID + ':completion';


export const COMPLETION_PLUGIN: JupyterFrontEndPlugin<void> = {
  id: FEATURE_ID,
  requires: [
    ILSPFeatureManager,
    ISettingRegistry,
    ICompletionManager,
    ILSPAdapterManager,
  ],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    featureManager: ILSPFeatureManager,
    settingRegistry: ISettingRegistry,
    completionManager: ICompletionManager,
    adapterManager: ILSPAdapterManager
  ) => {
    const settings = new FeatureSettings(settingRegistry, FEATURE_ID)
    const labIntegration = new CompletionLabIntegration(app, completionManager, settings, adapterManager);

    console.log(featureManager)
    featureManager.register({
      feature: {
        editorIntegrationFactory: new Map([
          ['CodeMirrorEditor', CompletionCM]
        ]),
        id: FEATURE_ID,
        name: 'LSP Completion',
        labIntegration: labIntegration,
        settings: settings
      }
    });
  }
};
