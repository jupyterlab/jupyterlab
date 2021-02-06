import {
  CompletionConnector,
  CompletionHandler,
  ContextConnector,
  KernelConnector
} from '@jupyterlab/completer';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { JSONArray, JSONObject } from '@lumino/coreutils';
import {
  AdditionalCompletionTriggerKinds,
  CompletionItemKind,
  CompletionTriggerKind,
  ExtendedCompletionTriggerKind
} from '../../lsp';
import * as lsProtocol from 'vscode-languageserver-types';
import { VirtualDocument } from '../../virtual/document';
import { IVirtualEditor } from '../../virtual/editor';
import {
  IEditorPosition,
  IRootPosition,
  IVirtualPosition
} from '../../positioning';
import { LSPConnection } from '../../connection';
import { Session } from '@jupyterlab/services';

import { CodeCompletion as LSPCompletionSettings } from '../../_completion';
import { FeatureSettings } from '../../feature';
import { PositionConverter } from '../../converter';
import {
  ILSPCompletionThemeManager,
  KernelKind
} from '@krassowski/completion-theme/lib/types';
import { LabIcon } from '@jupyterlab/ui-components';
import { ILSPLogConsole } from '../../tokens';
import { CompletionLabIntegration } from './completion';
import ICompletionItemsResponseType = CompletionHandler.ICompletionItemsResponseType;

export class LazyCompletionItem implements CompletionHandler.ICompletionItem {
  private _documentation: string;
  private _is_documentation_markdown: boolean;
  private _requested_resolution: boolean;
  private _resolved: boolean;
  /**
   * Self-reference to make sure that the instance for will remain accessible
   * after any copy operation (whether via spread syntax or Object.assign)
   * performed by the JupyterLab completer internals.
   */
  public self: LazyCompletionItem;

  get isDocumentationMarkdown(): boolean {
    return this._is_documentation_markdown;
  }

  constructor(
    /**
     * User facing completion.
     * If insertText is not set, this will be inserted.
     */
    public label: string,
    /**
     * Type of this completion item.
     */
    public type: string,
    /**
     * LabIcon object for icon to be rendered with completion type.
     */
    public icon: LabIcon,
    private match: lsProtocol.CompletionItem,
    private connector: LSPConnector,
    private uri: string
  ) {
    this._setDocumentation(match.documentation);
    this._requested_resolution = false;
    this._resolved = false;
    this.self = this;
  }

  private _setDocumentation(documentation: string | lsProtocol.MarkupContent) {
    if (lsProtocol.MarkupContent.is(documentation)) {
      this._documentation = documentation.value;
      this._is_documentation_markdown = documentation.kind === 'markdown';
    } else {
      this._documentation = documentation;
      this._is_documentation_markdown = false;
    }
  }

  /**
   * Completion to be inserted.
   */
  get insertText(): string {
    return this.match.insertText || this.match.label;
  }

  public supportsResolution() {
    const connection = this.connector.get_connection(this.uri);

    return connection.isCompletionResolveProvider();
  }

  public needsResolution(): boolean {
    if (this.documentation) {
      return false;
    }

    if (this._resolved) {
      return false;
    }

    if (this._requested_resolution) {
      return false;
    }

    return this.supportsResolution();
  }

  public isResolved() {
    return this._resolved;
  }

  public fetchDocumentation(): void {
    if (!this.needsResolution()) {
      return;
    }

    const connection = this.connector.get_connection(this.uri);

    this._requested_resolution = true;

    connection
      .getCompletionResolve(this.match)
      .then(resolvedCompletionItem => {
        this.connector.lab_integration.set_doc_panel_placeholder(false);
        if (resolvedCompletionItem === null) {
          return;
        }
        this._setDocumentation(resolvedCompletionItem.documentation);
        this._resolved = true;
        this.connector.lab_integration.refresh_doc_panel(this);
      })
      .catch(e => {
        this.connector.lab_integration.set_doc_panel_placeholder(false);
        console.warn(e);
      });
  }

  /**
   * A human-readable string with additional information
   * about this item, like type or symbol information.
   */
  get documentation(): string {
    if (!this.connector.should_show_documentation) {
      return null;
    }
    if (this._documentation) {
      return this._documentation;
    }
    return null;
  }

  /**
   * Indicates if the item is deprecated.
   */
  get deprecated(): boolean {
    if (this.match.deprecated) {
      return this.match.deprecated;
    }
    return (
      this.match.tags &&
      this.match.tags.some(
        tag => tag == lsProtocol.CompletionItemTag.Deprecated
      )
    );
  }
}

/**
 * A LSP connector for completion handlers.
 */
export class LSPConnector
  implements CompletionHandler.ICompletionItemsConnector {
  isDisposed = false;
  private _editor: CodeEditor.IEditor;
  private _connections: Map<VirtualDocument.uri, LSPConnection>;
  private _context_connector: ContextConnector;
  private _kernel_connector: KernelConnector;
  private _kernel_and_context_connector: CompletionConnector;
  private console: ILSPLogConsole;

  // signal that this is the new type connector (providing completion items)
  responseType = ICompletionItemsResponseType;

  virtual_editor: IVirtualEditor<CodeEditor.IEditor>;
  trigger_kind: ExtendedCompletionTriggerKind;
  lab_integration: CompletionLabIntegration;
  items: CompletionHandler.ICompletionItems;

  protected get suppress_auto_invoke_in(): string[] {
    return this.options.settings.composite.suppressInvokeIn;
  }

  get should_show_documentation(): boolean {
    return this.options.settings.composite.showDocumentation;
  }

  /**
   * Create a new LSP connector for completion requests.
   *
   * @param options - The instantiation options for the LSP connector.
   */
  constructor(protected options: LSPConnector.IOptions) {
    this._editor = options.editor;
    this._connections = options.connections;
    this.virtual_editor = options.virtual_editor;
    this._context_connector = new ContextConnector({ editor: options.editor });
    if (options.session) {
      let kernel_options = { editor: options.editor, session: options.session };
      this._kernel_connector = new KernelConnector(kernel_options);
      this._kernel_and_context_connector = new CompletionConnector(
        kernel_options
      );
    }
    this.lab_integration = options.labIntegration;
    this.console = options.console;
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._connections = null;
    this.virtual_editor = null;
    this._context_connector = null;
    this._kernel_connector = null;
    this._kernel_and_context_connector = null;
    this.options = null;
    this._editor = null;
    this.isDisposed = true;
  }

  protected get _has_kernel(): boolean {
    return this.options.session?.kernel != null;
  }

  protected get _is_kernel_idle(): boolean {
    return this.options.session?.kernel?.status == 'idle';
  }

  protected get _should_wait_for_busy_kernel(): boolean {
    return this.lab_integration.settings.composite.waitForBusyKernel;
  }

  protected async _kernel_language(): Promise<string> {
    return (await this.options.session.kernel.info).language_info.name;
  }

  protected get _kernel_timeout(): number {
    return this.lab_integration.settings.composite.kernelResponseTimeout;
  }

  get fallback_connector() {
    return this._kernel_and_context_connector
      ? this._kernel_and_context_connector
      : this._context_connector;
  }

  protected transform_from_editor_to_root(
    position: CodeEditor.IPosition
  ): IRootPosition {
    let editor_position = PositionConverter.ce_to_cm(
      position
    ) as IEditorPosition;
    return this.virtual_editor.transform_from_editor_to_root(
      this._editor,
      editor_position
    );
  }

  /**
   * Fetch completion requests.
   *
   * @param request - The completion request text and details.
   */
  async fetch(
    request: CompletionHandler.IRequest
  ): Promise<CompletionHandler.ICompletionItemsReply> {
    let editor = this._editor;

    const cursor = editor.getCursorPosition();
    const token = editor.getTokenForPosition(cursor);

    if (this.suppress_auto_invoke_in.indexOf(token.type) !== -1) {
      this.console.log('Suppressing completer auto-invoke in', token.type);
      return;
    }

    const start = editor.getPositionAt(token.offset);
    const end = editor.getPositionAt(token.offset + token.value.length);

    let position_in_token = cursor.column - start.column - 1;
    const typed_character = token.value[cursor.column - start.column - 1];

    let start_in_root = this.transform_from_editor_to_root(start);
    let end_in_root = this.transform_from_editor_to_root(end);
    let cursor_in_root = this.transform_from_editor_to_root(cursor);

    let virtual_editor = this.virtual_editor;

    // find document for position
    let document = virtual_editor.document_at_root_position(start_in_root);

    let virtual_start = virtual_editor.root_position_to_virtual_position(
      start_in_root
    );
    let virtual_end = virtual_editor.root_position_to_virtual_position(
      end_in_root
    );
    let virtual_cursor = virtual_editor.root_position_to_virtual_position(
      cursor_in_root
    );

    const lsp_promise = this.fetch_lsp(
      token,
      typed_character,
      virtual_start,
      virtual_end,
      virtual_cursor,
      document,
      position_in_token
    );
    let promise: Promise<CompletionHandler.ICompletionItemsReply> = null;

    try {
      const kernelTimeout = this._kernel_timeout;

      if (
        this._kernel_connector &&
        this._has_kernel &&
        (this._is_kernel_idle || this._should_wait_for_busy_kernel) &&
        kernelTimeout != 0
      ) {
        // TODO: this would be awesome if we could connect to rpy2 for R suggestions in Python,
        //  but this is not the job of this extension; nevertheless its better to keep this in
        //  mind to avoid introducing design decisions which would make this impossible
        //  (for other extensions)

        // TODO: should it be cashed?
        const kernelLanguage = await this._kernel_language();

        if (document.language === kernelLanguage) {
          let default_kernel_promise = this._kernel_connector.fetch(request);
          let kernel_promise: Promise<CompletionHandler.IReply>;

          if (kernelTimeout == -1) {
            kernel_promise = default_kernel_promise;
          } else {
            // implement timeout for the kernel response using Promise.race:
            // an empty completion result will resolve after the timeout
            // if actual kernel response does not beat it to it
            kernel_promise = Promise.race([
              default_kernel_promise,
              new Promise<CompletionHandler.IReply>(resolve => {
                return setTimeout(
                  () =>
                    resolve({
                      start: null,
                      end: null,
                      matches: [],
                      metadata: null
                    }),
                  kernelTimeout
                );
              })
            ]);
          }

          promise = Promise.all([
            kernel_promise.catch(p => p),
            lsp_promise.catch(p => p)
          ]).then(([kernel, lsp]) =>
            this.merge_replies(this.transform_reply(kernel), lsp, this._editor)
          );
        }
      }
      if (!promise) {
        promise = lsp_promise.catch(e => {
          this.console.warn('hint failed', e);
          return this.fallback_connector
            .fetch(request)
            .then(this.transform_reply);
        });
      }
    } catch (e) {
      this.console.warn('kernel completions failed', e);
      promise = this.fallback_connector
        .fetch(request)
        .then(this.transform_reply);
    }

    this.console.debug('All promises set up and ready.');
    return promise.then(reply => {
      reply = this.suppress_if_needed(reply, token, cursor);
      this.items = reply.items;
      this.trigger_kind = CompletionTriggerKind.Invoked;
      return reply;
    });
  }

  public get_connection(uri: string) {
    return this._connections.get(uri);
  }

  async fetch_lsp(
    token: CodeEditor.IToken,
    typed_character: string,
    start: IVirtualPosition,
    end: IVirtualPosition,
    cursor: IVirtualPosition,
    document: VirtualDocument,
    position_in_token: number
  ): Promise<CompletionHandler.ICompletionItemsReply> {
    let connection = this.get_connection(document.uri);

    this.console.debug('Fetching');
    this.console.debug('Token:', token, start, end);

    const trigger_kind =
      this.trigger_kind == AdditionalCompletionTriggerKinds.AutoInvoked
        ? CompletionTriggerKind.Invoked
        : this.trigger_kind;

    let lspCompletionItems = ((await connection.getCompletion(
      cursor,
      {
        start,
        end,
        text: token.value
      },
      document.document_info,
      false,
      typed_character,
      trigger_kind
    )) || []) as lsProtocol.CompletionItem[];

    this.console.debug('Transforming');
    let prefix = token.value.slice(0, position_in_token + 1);
    let all_non_prefixed = true;
    let items: CompletionHandler.ICompletionItem[] = [];
    lspCompletionItems.forEach(match => {
      let kind = match.kind ? CompletionItemKind[match.kind] : '';
      let completionItem = new LazyCompletionItem(
        match.label,
        kind,
        this.icon_for(kind),
        match,
        this,
        document.uri
      );

      // Update prefix values
      let text = match.insertText ? match.insertText : match.label;
      if (text.toLowerCase().startsWith(prefix.toLowerCase())) {
        all_non_prefixed = false;
        if (prefix !== token.value) {
          if (text.toLowerCase().startsWith(token.value.toLowerCase())) {
            // given a completion insert text "display_table" and two test cases:
            // disp<tab>data →  display_table<cursor>data
            // disp<tab>lay  →  display_table<cursor>
            // we have to adjust the prefix for the latter (otherwise we would get display_table<cursor>lay),
            // as we are constrained NOT to replace after the prefix (which would be "disp" otherwise)
            prefix = token.value;
          }
        }
      }

      items.push(completionItem);
    });
    this.console.debug('Transformed');
    // required to make the repetitive trigger characters like :: or ::: work for R with R languageserver,
    // see https://github.com/krassowski/jupyterlab-lsp/issues/436
    const prefix_offset = token.value.length;

    return {
      // note in the ContextCompleter it was:
      // start: token.offset,
      // end: token.offset + token.value.length,
      // which does not work with "from statistics import <tab>" as the last token ends at "t" of "import",
      // so the completer would append "mean" as "from statistics importmean" (without space!);
      // (in such a case the typedCharacters is undefined as we are out of range)
      // a different workaround would be to prepend the token.value prefix:
      // text = token.value + text;
      // but it did not work for "from statistics <tab>" and lead to "from statisticsimport" (no space)
      start: token.offset + (all_non_prefixed ? prefix_offset : 0),
      end: token.offset + prefix.length,
      items: items
    };
  }

  protected icon_for(type: string): LabIcon {
    if (!this.options.settings.composite.theme) {
      return undefined;
    }
    if (typeof type === 'undefined') {
      type = KernelKind;
    }
    return (this.options.themeManager.get_icon(type) as LabIcon) || undefined;
  }

  private transform_reply(
    reply: CompletionHandler.IReply
  ): CompletionHandler.ICompletionItemsReply {
    this.console.log('Transforming kernel reply:', reply);
    let items: CompletionHandler.ICompletionItem[];
    const metadata = reply.metadata || {};
    const types = metadata._jupyter_types_experimental as JSONArray;

    if (types) {
      items = types.map((item: JSONObject) => {
        return {
          label: item.text as string,
          insertText: item.text as string,
          type: item.type as string,
          icon: this.icon_for(item.type as string)
        };
      });
    } else {
      items = reply.matches.map(match => {
        return {
          label: match,
          insertText: match,
          icon: this.icon_for('Kernel')
        };
      });
    }
    return { start: reply.start, end: reply.end, items };
  }

  private merge_replies(
    kernel: CompletionHandler.ICompletionItemsReply,
    lsp: CompletionHandler.ICompletionItemsReply,
    editor: CodeEditor.IEditor
  ): CompletionHandler.ICompletionItemsReply {
    this.console.debug('Merging completions:', lsp, kernel);

    if (kernel instanceof Error) {
      this.console.warn('Caught kernel completions error', kernel);
    }
    if (lsp instanceof Error) {
      this.console.warn('Caught LSP completions error', lsp);
    }

    if (kernel instanceof Error || !kernel.items.length) {
      return lsp;
    }
    if (lsp instanceof Error || !lsp.items.length) {
      return kernel;
    }

    let prefix = '';

    // if the kernel used a wider range, get the previous characters to strip the prefix off,
    // so that both use the same range
    if (lsp.start > kernel.start) {
      const cursor = editor.getCursorPosition();
      const line = editor.getLine(cursor.line);
      prefix = line.substring(kernel.start, lsp.start);
      this.console.debug('Removing kernel prefix: ', prefix);
    } else if (lsp.start < kernel.start) {
      this.console.warn('Kernel start > LSP start');
    }

    // combine completions, de-duping by insertText; LSP completions will show up first, kernel second.
    const aggregatedItems = lsp.items.concat(
      kernel.items.map(item => {
        return {
          ...item,
          insertText: item.insertText.startsWith(prefix)
            ? item.insertText.substr(prefix.length)
            : item.insertText
        };
      })
    );
    const insertTextSet = new Set<string>();
    const processedItems = new Array<CompletionHandler.ICompletionItem>();

    aggregatedItems.forEach(item => {
      if (insertTextSet.has(item.insertText)) {
        return;
      }
      insertTextSet.add(item.insertText);
      processedItems.push(item);
    });
    // TODO: Sort items
    // Return reply with processed items.
    this.console.debug('Merged: ', { ...lsp, items: processedItems });
    return { ...lsp, items: processedItems };
  }

  list(
    query: string | undefined
  ): Promise<{
    ids: CompletionHandler.IRequest[];
    values: CompletionHandler.ICompletionItemsReply[];
  }> {
    return Promise.resolve(undefined);
  }

  remove(id: CompletionHandler.IRequest): Promise<any> {
    return Promise.resolve(undefined);
  }

  save(id: CompletionHandler.IRequest, value: void): Promise<any> {
    return Promise.resolve(undefined);
  }

  private suppress_if_needed(
    reply: CompletionHandler.ICompletionItemsReply,
    token: CodeEditor.IToken,
    cursor_at_request: CodeEditor.IPosition
  ) {
    if (!this._editor.hasFocus()) {
      this.console.debug(
        'Ignoring completion response: the corresponding editor lost focus'
      );
      return {
        start: reply.start,
        end: reply.end,
        items: []
      };
    }

    const cursor_now = this._editor.getCursorPosition();

    // if the cursor advanced in the same line, the previously retrieved completions may still be useful
    // if the line changed or cursor moved backwards then no reason to keep the suggestions
    if (
      cursor_at_request.line != cursor_now.line ||
      cursor_now.column < cursor_at_request.column
    ) {
      this.console.debug(
        'Ignoring completion response: cursor has receded or changed line'
      );
      return {
        start: reply.start,
        end: reply.end,
        items: []
      };
    }

    if (this.trigger_kind == AdditionalCompletionTriggerKinds.AutoInvoked) {
      if (
        // do not auto-invoke if no match found
        reply.start == reply.end ||
        // do not auto-invoke if only one match found and this match is exactly the same as the current token
        (reply.items.length === 1 && reply.items[0].insertText === token.value)
      ) {
        return {
          start: reply.start,
          end: reply.end,
          items: []
        };
      }
    }
    return reply;
  }
}

/**
 * A namespace for LSP connector statics.
 */
export namespace LSPConnector {
  /**
   * The instantiation options for cell completion handlers.
   */
  export interface IOptions {
    /**
     * The editor used by the LSP connector.
     */
    editor: CodeEditor.IEditor;
    virtual_editor: IVirtualEditor<CodeEditor.IEditor>;
    /**
     * The connections to be used by the LSP connector.
     */
    connections: Map<VirtualDocument.id_path, LSPConnection>;

    settings: FeatureSettings<LSPCompletionSettings>;

    labIntegration: CompletionLabIntegration;

    themeManager: ILSPCompletionThemeManager;

    session?: Session.ISessionConnection;

    console: ILSPLogConsole;
  }
}
