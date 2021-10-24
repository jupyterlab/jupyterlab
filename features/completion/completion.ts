import { JupyterFrontEnd } from '@jupyterlab/application';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { CompletionHandler, ICompletionManager } from '@jupyterlab/completer';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { NotebookPanel } from '@jupyterlab/notebook';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ILSPCompletionThemeManager } from '@krassowski/completion-theme/lib/types';
import type * as CodeMirror from 'codemirror';

import { CodeCompletion as LSPCompletionSettings } from '../../_completion';
import { IEditorChangedData, WidgetAdapter } from '../../adapters/adapter';
import { NotebookAdapter } from '../../adapters/notebook/notebook';
import { IDocumentConnectionData } from '../../connection_manager';
import { CodeMirrorIntegration } from '../../editor_integration/codemirror';
import { FeatureSettings, IFeatureLabIntegration } from '../../feature';
import {
  AdditionalCompletionTriggerKinds,
  CompletionTriggerKind,
  ExtendedCompletionTriggerKind
} from '../../lsp';
import { ILSPAdapterManager, ILSPLogConsole } from '../../tokens';

import { LSPConnector } from './completion_handler';
import { LazyCompletionItem } from './item';
import { LSPCompleterModel } from './model';
import { ICompletionData, LSPCompletionRenderer } from './renderer';

const DOC_PANEL_SELECTOR = '.jp-Completer-docpanel';
const DOC_PANEL_PLACEHOLDER_CLASS = 'lsp-completer-placeholder';

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
      this._completionCharacters =
        this.connection.getLanguageCompletionCharacters();
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
        .catch(this.console.warn);
      return;
    }

    if (
      change.text &&
      change.text[0].length == 1 &&
      this.settings.composite.continuousHinting
    ) {
      (this.feature.labIntegration as CompletionLabIntegration)
        .invoke_completer(AdditionalCompletionTriggerKinds.AutoInvoked)
        .catch(this.console.warn);
    }
  }
}

export class CompletionLabIntegration implements IFeatureLabIntegration {
  // TODO: maybe instead of creating it each time, keep a hash map instead?
  protected current_completion_connector: LSPConnector;
  protected current_completion_handler: CompletionHandler;
  protected current_adapter: WidgetAdapter<IDocumentWidget> = null;
  protected renderer: LSPCompletionRenderer;
  private _latestActiveItem: LazyCompletionItem = null;

  constructor(
    private app: JupyterFrontEnd,
    private completionManager: ICompletionManager,
    public settings: FeatureSettings<LSPCompletionSettings>,
    private adapterManager: ILSPAdapterManager,
    private completionThemeManager: ILSPCompletionThemeManager,
    private console: ILSPLogConsole,
    private renderMimeRegistry: IRenderMimeRegistry
  ) {
    const markdown_renderer =
      this.renderMimeRegistry.createRenderer('text/markdown');
    this.renderer = new LSPCompletionRenderer({
      integrator: this,
      markdownRenderer: markdown_renderer,
      latexTypesetter: this.renderMimeRegistry.latexTypesetter,
      console: console.scope('renderer')
    });
    this.renderer.activeChanged.connect(this.active_completion_changed, this);
    this.renderer.itemShown.connect(this.resolve_and_update, this);
    // TODO: figure out a better way to disable lab integration elements (postpone initialization?)
    settings.ready
      .then(() => {
        if (!settings.composite.disable) {
          adapterManager.adapterChanged.connect(this.swap_adapter, this);
        }
      })
      .catch(console.warn);
    settings.changed.connect(() => {
      completionThemeManager.set_theme(this.settings.composite.theme);
      completionThemeManager.set_icons_overrides(
        this.settings.composite.typesMap
      );
      if (!settings.composite.disable) {
        document.body.dataset.lspCompleterLayout =
          this.settings.composite.layout;
      }
      if (this.current_completion_handler) {
        this.model.settings.caseSensitive =
          this.settings.composite.caseSensitive;
        this.model.settings.includePerfectMatches =
          this.settings.composite.includePerfectMatches;
      }
    });
  }

  protected fetchDocumentation(item: LazyCompletionItem): void {
    if (!item) {
      return;
    }
    item
      .resolve()
      .then(resolvedCompletionItem => {
        if (item.self !== this._latestActiveItem.self) {
          return;
        }
        this.set_doc_panel_placeholder(false);
        if (resolvedCompletionItem === null) {
          return;
        }
        this.refresh_doc_panel(item);
      })
      .catch(e => {
        // disabling placeholder can remove currently displayed documentation,
        // so only do that if this is really the active item!
        if (item.self === this._latestActiveItem.self) {
          this.set_doc_panel_placeholder(false);
        }
        this.console.warn(e);
      });
  }

  active_completion_changed(
    renderer: LSPCompletionRenderer,
    active_completion: ICompletionData
  ) {
    let { item } = active_completion;
    this._latestActiveItem = item;
    if (!item.supportsResolution()) {
      if (item.isDocumentationMarkdown) {
        // TODO: remove once https://github.com/jupyterlab/jupyterlab/pull/9663 is merged and released
        this.refresh_doc_panel(item);
      }
      return;
    }

    if (item.needsResolution()) {
      this.set_doc_panel_placeholder(true);
      this.fetchDocumentation(item);
    } else if (item.isResolved()) {
      this.refresh_doc_panel(item);
    } else {
      // resolution has already started, but the re-render update could have been invalidated
      // by user action, so let's ensure the documentation will get shown this time.
      this.fetchDocumentation(item);
    }

    // also fetch completion for the previous and the next item to prevent jitter
    const index = this.current_index;
    const items = this.current_items;

    if (index - 1 >= 0) {
      const previous = items[index - 1] as LazyCompletionItem;
      this.resolve_and_update_from_item(previous?.self);
    }
    if (index + 1 < items.length) {
      const next = items[index + 1] as LazyCompletionItem;
      this.resolve_and_update_from_item(next?.self);
    }
  }

  private resolve_and_update_from_item(item: LazyCompletionItem) {
    if (!item) {
      return;
    }
    this.resolve_and_update(this.renderer, {
      item: item,
      element: item.element
    });
  }

  private resolve_and_update(
    renderer: LSPCompletionRenderer,
    active_completion: ICompletionData
  ) {
    let { item, element } = active_completion;
    if (!item.supportsResolution()) {
      this.renderer.updateExtraInfo(item, element);
      return;
    }

    if (item.isResolved()) {
      this.renderer.updateExtraInfo(item, element);
    } else {
      // supportsResolution as otherwise would short-circuit above
      item
        .resolve()
        .then(resolvedCompletionItem => {
          this.renderer.updateExtraInfo(item, element);
        })
        .catch(e => {
          this.console.warn(e);
        });
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
    let completer = this.completer;
    completer.addClass('lsp-completer');
    completer.model = new LSPCompleterModel({
      caseSensitive: this.settings.composite.caseSensitive,
      includePerfectMatches: this.settings.composite.includePerfectMatches
    });
  }

  protected get completer() {
    // TODO upstream: make completer public?
    return this.current_completion_handler.completer;
  }

  protected get model(): LSPCompleterModel {
    return this.completer.model as LSPCompleterModel;
  }

  invoke_completer(kind: ExtendedCompletionTriggerKind) {
    // TODO: ideally this would not re-trigger if list of items not isIncomplete
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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.current_completion_handler.connector =
      this.current_completion_connector;
  }

  private get current_items() {
    // TODO upstream: allow to get completionItems() without markup
    //   (note: not trivial as _markup() does filtering too)
    return this.model.completionItems();
  }

  private get current_index() {
    let completer = this.current_completion_handler.completer;

    // TODO: use public activeIndex available since 3.1
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return completer._activeIndex;
  }

  refresh_doc_panel(item: LazyCompletionItem) {
    let completer = this.current_completion_handler.completer;

    const active: CompletionHandler.ICompletionItem =
      this.current_items[this.current_index];

    if (!item || !active || active.insertText != item.insertText) {
      return;
    }

    const docPanel = completer.node.querySelector(DOC_PANEL_SELECTOR);
    docPanel.classList.remove(DOC_PANEL_PLACEHOLDER_CLASS);

    if (item.documentation) {
      // remove all children
      docPanel.textContent = '';
      // TODO upstream: renderer should take care of the documentation rendering
      //  sent PR: https://github.com/jupyterlab/jupyterlab/pull/9663

      const node = this.renderer.createDocumentationNode(item);
      docPanel.appendChild(node);

      docPanel.setAttribute('style', '');
    } else {
      docPanel.setAttribute('style', 'display: none');
    }
  }

  set_doc_panel_placeholder(enable: boolean) {
    let completer = this.current_completion_handler.completer;
    const docPanel = completer.node.querySelector(DOC_PANEL_SELECTOR);
    if (enable) {
      docPanel.setAttribute('style', '');
      docPanel.classList.add(DOC_PANEL_PLACEHOLDER_CLASS);
    } else if (docPanel.classList.contains(DOC_PANEL_PLACEHOLDER_CLASS)) {
      docPanel.setAttribute('style', 'display: none');
      docPanel.classList.remove(DOC_PANEL_PLACEHOLDER_CLASS);
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
