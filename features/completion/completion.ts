import { CompletionTriggerKind } from '../../lsp';
import * as CodeMirror from 'codemirror';
import { CodeMirrorIntegration } from '../../editor_integration/codemirror';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { IEditorChangedData, WidgetAdapter } from '../../adapters/adapter';
import { LSPConnector } from './completion_handler';
import { ICompletionManager } from '@jupyterlab/completer';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { NotebookPanel } from '@jupyterlab/notebook';
import { FeatureSettings, IFeatureLabIntegration } from '../../feature';

import { CodeCompletion as LSPCompletionSettings } from '../../_completion';
import { IDocumentConnectionData } from '../../connection_manager';
import { ILSPAdapterManager } from '../../tokens';
import { NotebookAdapter } from '../../adapters/notebook/notebook';
import { ILSPCompletionThemeManager } from '@krassowski/completion-theme/lib/types';

export class CompletionCM extends CodeMirrorIntegration {
  private _completionCharacters: string[];
  // TODO chek if this works if yest then remove settings from options
  settings: FeatureSettings<LSPCompletionSettings>;

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
      this.settings.composite.continuousHinting
    ) {
      (this.feature.labIntegration as CompletionLabIntegration)
        .invoke_completer(CompletionTriggerKind.Invoked)
        .catch(console.warn);
      return;
    }

    let last_character = this.extract_last_character(change);
    if (this.completionCharacters.indexOf(last_character) > -1) {
      this.virtual_editor.console.log(
        'Will invoke completer after',
        last_character
      );
      (this.feature.labIntegration as CompletionLabIntegration)
        .invoke_completer(CompletionTriggerKind.TriggerCharacter)
        .catch(console.warn);
    }
  }
}

export class CompletionLabIntegration implements IFeatureLabIntegration {
  // TODO: maybe instead of creating it each time, keep a hash map instead?
  protected current_completion_connector: LSPConnector;
  protected current_completion_handler: ICompletionManager.ICompletableAttributes;
  protected current_adapter: WidgetAdapter<IDocumentWidget> = null;

  constructor(
    private app: JupyterFrontEnd,
    private completionManager: ICompletionManager,
    public settings: FeatureSettings<LSPCompletionSettings>,
    private adapterManager: ILSPAdapterManager,
    private completionThemeManager: ILSPCompletionThemeManager
  ) {
    adapterManager.adapterChanged.connect(this.swap_adapter, this);
    settings.changed.connect(() => {
      completionThemeManager.set_theme(this.settings.composite.theme);
    });
  }

  private swap_adapter(
    manager: ILSPAdapterManager,
    adapter: WidgetAdapter<IDocumentWidget>
  ) {
    if (this.current_adapter) {
      // disconnect signals from the old adapter
      this.current_adapter.activeEditorChanged.disconnect(
        this.set_connector,
        this
      );
      this.current_adapter.adapterConnected.disconnect(
        this.connect_completion,
        this
      );
    }
    this.current_adapter = adapter;
    // connect the new adapter
    if (this.current_adapter.isConnected) {
      this.connect_completion(this.current_adapter);
      this.set_connector(adapter, { editor: adapter.activeEditor });
    }
    // connect signals to the new adapter
    this.current_adapter.activeEditorChanged.connect(this.set_connector, this);
    this.current_adapter.adapterConnected.connect(
      this.connect_completion,
      this
    );
  }

  connect_completion(
    adapter: WidgetAdapter<IDocumentWidget>,
    data?: IDocumentConnectionData
  ) {
    let editor = adapter.activeEditor;
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
    this.current_completion_connector.trigger_kind = kind;

    if (this.adapterManager.currentAdapter instanceof NotebookAdapter) {
      command = 'completer:invoke-notebook';
    } else {
      command = 'completer:invoke-file';
    }
    return this.app.commands.execute(command).then(() => {
      this.current_completion_connector.trigger_kind =
        CompletionTriggerKind.Invoked;
    });
  }

  set_connector(
    adapter: WidgetAdapter<IDocumentWidget>,
    editor_changed: IEditorChangedData
  ) {
    if (!this.current_completion_handler) {
      // workaround for current_completion_handler not being there yet
      this.connect_completion(adapter);
    }
    this.set_completion_connector(adapter, editor_changed.editor);
    this.current_completion_handler.editor = editor_changed.editor;
    this.current_completion_handler.connector = this.current_completion_connector;
  }

  private set_completion_connector(
    adapter: WidgetAdapter<IDocumentWidget>,
    editor: CodeEditor.IEditor
  ) {
    if (this.current_completion_connector) {
      delete this.current_completion_connector;
    }
    this.current_completion_connector = new LSPConnector({
      editor: editor,
      icons_manager: this.completionThemeManager,
      connections: this.current_adapter.connection_manager.connections,
      virtual_editor: this.current_adapter.virtual_editor,
      settings: this.settings,
      // it might or might not be a notebook panel (if it is not, the sessionContext and session will just be undefined)
      session: (this.current_adapter.widget as NotebookPanel)?.sessionContext
        ?.session
    });
  }
}
