import {
  AdditionalCompletionTriggerKinds,
  CompletionTriggerKind,
  ExtendedCompletionTriggerKind
} from '../../lsp';
import * as CodeMirror from 'codemirror';
import { CodeMirrorIntegration } from '../../editor_integration/codemirror';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { IEditorChangedData, WidgetAdapter } from '../../adapters/adapter';
import { LazyCompletionItem, LSPConnector } from './completion_handler';
import { CompletionHandler, ICompletionManager } from '@jupyterlab/completer';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { NotebookPanel } from '@jupyterlab/notebook';
import { FeatureSettings, IFeatureLabIntegration } from '../../feature';

import { CodeCompletion as LSPCompletionSettings } from '../../_completion';
import { IDocumentConnectionData } from '../../connection_manager';
import { ILSPAdapterManager, ILSPLogConsole } from '../../tokens';
import { NotebookAdapter } from '../../adapters/notebook/notebook';
import { ILSPCompletionThemeManager } from '@krassowski/completion-theme/lib/types';
import { LSPCompletionRenderer } from './renderer';
import { IRenderMime, IRenderMimeRegistry } from '@jupyterlab/rendermime';

export class CompletionCM extends CodeMirrorIntegration {
  private _completionCharacters: string[];

  get settings() {
    return super.settings as FeatureSettings<LSPCompletionSettings>;
  }

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

    // note: trigger character completion need to be have a higher priority than auto-invoked completion
    // because the latter does not work for on-dot completion due to suppression of trivial suggestions
    // see gh430
    let last_character = this.extract_last_character(change);
    if (this.completionCharacters.indexOf(last_character) > -1) {
      this.virtual_editor.console.log(
        'Will invoke completer after',
        last_character
      );
      (this.feature.labIntegration as CompletionLabIntegration)
        .invoke_completer(CompletionTriggerKind.TriggerCharacter)
        .catch(console.warn);
      return;
    }

    if (
      change.text &&
      change.text[0].length == 1 &&
      this.settings.composite.continuousHinting
    ) {
      (this.feature.labIntegration as CompletionLabIntegration)
        .invoke_completer(AdditionalCompletionTriggerKinds.AutoInvoked)
        .catch(console.warn);
    }
  }
}

export class CompletionLabIntegration implements IFeatureLabIntegration {
  // TODO: maybe instead of creating it each time, keep a hash map instead?
  protected current_completion_connector: LSPConnector;
  protected current_completion_handler: CompletionHandler;
  protected current_adapter: WidgetAdapter<IDocumentWidget> = null;
  protected renderer: LSPCompletionRenderer;
  private markdown_renderer: IRenderMime.IRenderer;

  constructor(
    private app: JupyterFrontEnd,
    private completionManager: ICompletionManager,
    public settings: FeatureSettings<LSPCompletionSettings>,
    private adapterManager: ILSPAdapterManager,
    private completionThemeManager: ILSPCompletionThemeManager,
    private console: ILSPLogConsole,
    private renderMimeRegistry: IRenderMimeRegistry
  ) {
    this.renderer = new LSPCompletionRenderer({ integrator: this });
    this.renderer.activeChanged.connect(this.active_completion_changed, this);
    adapterManager.adapterChanged.connect(this.swap_adapter, this);
    settings.changed.connect(() => {
      completionThemeManager.set_theme(this.settings.composite.theme);
      completionThemeManager.set_icons_overrides(
        this.settings.composite.typesMap
      );
    });

    this.markdown_renderer = this.renderMimeRegistry.createRenderer(
      'text/markdown'
    );
  }

  active_completion_changed(
    renderer: LSPCompletionRenderer,
    item: LazyCompletionItem
  ) {
    if (item.needsResolution()) {
      item.fetchDocumentation();
    } else if (item.isResolved()) {
      this.refresh_doc_panel(item);
    }
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
    this.current_completion_handler = this.completionManager.register(
      {
        connector: this.current_completion_connector,
        editor: editor,
        parent: adapter.widget
      },
      this.renderer
    ) as CompletionHandler;
  }

  invoke_completer(kind: ExtendedCompletionTriggerKind) {
    let command: string;
    this.current_completion_connector.trigger_kind = kind;

    if (this.adapterManager.currentAdapter instanceof NotebookAdapter) {
      command = 'completer:invoke-notebook';
    } else {
      command = 'completer:invoke-file';
    }
    return this.app.commands.execute(command).catch(() => {
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
    // @ts-ignore
    this.current_completion_handler.connector = this.current_completion_connector;
  }

  refresh_doc_panel(item: LazyCompletionItem) {
    // TODO upstream: make completer public?
    let completer = this.current_completion_handler.completer;

    // TODO upstream: allow to get completionItems() without markup
    //   (note: not trivial as _markup() does filtering too)
    const items = completer.model.completionItems();

    // TODO upstream: Completer will have getActiveItem()
    // @ts-ignore
    const index = completer._activeIndex;
    const active: CompletionHandler.ICompletionItem = items[index];

    if (active.insertText != item.insertText) {
      return;
    }

    if (item.documentation) {
      let docPanel = completer.node.querySelector('.jp-Completer-docpanel');

      // TODO upstream: renderer should take care of the documentation rendering
      //  sent PR: https://github.com/jupyterlab/jupyterlab/pull/9663
      if (item.isDocumentationMarkdown) {
        this.markdown_renderer
          .renderModel({
            data: {
              'text/markdown': item.documentation
            },
            trusted: false,
            metadata: {},
            setData(options: IRenderMime.IMimeModel.ISetDataOptions) {}
          })
          .catch(this.console.warn);
        // remove all children
        docPanel.textContent = '';
        docPanel.appendChild(this.markdown_renderer.node);
      } else {
        docPanel.textContent = item.documentation;
      }
      docPanel.setAttribute('style', '');
    }
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
      themeManager: this.completionThemeManager,
      connections: this.current_adapter.connection_manager.connections,
      virtual_editor: this.current_adapter.virtual_editor,
      settings: this.settings,
      labIntegration: this,
      // it might or might not be a notebook panel (if it is not, the sessionContext and session will just be undefined)
      session: (this.current_adapter.widget as NotebookPanel)?.sessionContext
        ?.session,
      console: this.console
    });
  }
}
