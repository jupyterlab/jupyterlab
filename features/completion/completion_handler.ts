import { CodeEditor } from '@jupyterlab/codeeditor';
import {
  CompletionConnector,
  CompletionHandler,
  ContextConnector,
  KernelConnector
} from '@jupyterlab/completer';
import { Session } from '@jupyterlab/services';
import { LabIcon } from '@jupyterlab/ui-components';
import {
  ILSPCompletionThemeManager,
  KernelKind
} from '@krassowski/completion-theme/lib/types';
import { JSONArray, JSONObject } from '@lumino/coreutils';
import * as lsProtocol from 'vscode-languageserver-types';

import { CodeCompletion as LSPCompletionSettings } from '../../_completion';
import { LSPConnection } from '../../connection';
import { PositionConverter } from '../../converter';
import { FeatureSettings } from '../../feature';
import {
  AdditionalCompletionTriggerKinds,
  CompletionItemKind,
  CompletionTriggerKind,
  ExtendedCompletionTriggerKind
} from '../../lsp';
import {
  IEditorPosition,
  IRootPosition,
  IVirtualPosition
} from '../../positioning';
import { ILSPLogConsole } from '../../tokens';
import { VirtualDocument } from '../../virtual/document';
import { IVirtualEditor } from '../../virtual/editor';

import { CompletionLabIntegration } from './completion';
import {
  ICompletionsSource,
  IExtendedCompletionItem,
  LazyCompletionItem
} from './item';

import ICompletionItemsResponseType = CompletionHandler.ICompletionItemsResponseType;

/**
 * Completion items reply from a specific source
 */
export interface ICompletionsReply
  extends CompletionHandler.ICompletionItemsReply {
  // TODO: it is not clear when the source is set here and when on IExtendedCompletionItem.
  //  it might be good to separate the two stages for both interfaces
  source: ICompletionsSource;
  items: IExtendedCompletionItem[];
}

/**
 * A LSP connector for completion handlers.
 */
export class LSPConnector
  implements CompletionHandler.ICompletionItemsConnector
{
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

  get kernel_completions_first(): boolean {
    return this.options.settings.composite.kernelCompletionsFirst;
  }

  protected get use_lsp_completions(): boolean {
    return (
      this.options.settings.composite.disableCompletionsFrom.indexOf('LSP') ==
      -1
    );
  }

  protected get use_kernel_completions(): boolean {
    return (
      this.options.settings.composite.disableCompletionsFrom.indexOf(
        'Kernel'
      ) == -1
    );
  }

  protected get suppress_continuous_hinting_in(): string[] {
    return this.options.settings.composite.suppressContinuousHintingIn;
  }

  protected get suppress_trigger_character_in(): string[] {
    return this.options.settings.composite.suppressTriggerCharacterIn;
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

    if (this.trigger_kind == AdditionalCompletionTriggerKinds.AutoInvoked) {
      if (this.suppress_continuous_hinting_in.indexOf(token.type) !== -1) {
        this.console.debug('Suppressing completer auto-invoke in', token.type);
        this.trigger_kind = CompletionTriggerKind.Invoked;
        return;
      }
    } else if (this.trigger_kind == CompletionTriggerKind.TriggerCharacter) {
      if (this.suppress_trigger_character_in.indexOf(token.type) !== -1) {
        this.console.debug('Suppressing completer auto-invoke in', token.type);
        this.trigger_kind = CompletionTriggerKind.Invoked;
        return;
      }
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

    let virtual_start =
      virtual_editor.root_position_to_virtual_position(start_in_root);
    let virtual_end =
      virtual_editor.root_position_to_virtual_position(end_in_root);
    let virtual_cursor =
      virtual_editor.root_position_to_virtual_position(cursor_in_root);
    const lsp_promise: Promise<CompletionHandler.ICompletionItemsReply> = this
      .use_lsp_completions
      ? this.fetch_lsp(
          token,
          typed_character,
          virtual_start,
          virtual_end,
          virtual_cursor,
          document,
          position_in_token
        )
      : Promise.resolve(null);

    let promise: Promise<CompletionHandler.ICompletionItemsReply> = null;

    try {
      const kernelTimeout = this._kernel_timeout;

      if (
        this.use_kernel_completions &&
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

        if (
          document.language.toLocaleLowerCase() === kernelLanguage.toLowerCase()
        ) {
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
          ]).then(([kernel, lsp]) => {
            let replies = [];
            if (kernel != null) {
              replies.push(this.transform_reply(kernel));
            }
            if (lsp != null) {
              replies.push(lsp);
            }
            return this.merge_replies(replies, this._editor);
          });
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
  ): Promise<ICompletionsReply> {
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
    let items: IExtendedCompletionItem[] = [];
    lspCompletionItems.forEach(match => {
      let kind = match.kind ? CompletionItemKind[match.kind] : '';

      // Update prefix values
      let text = match.insertText ? match.insertText : match.label;

      // declare prefix presence if needed and update it
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
      // add prefix if needed
      else if (token.type === 'string' && prefix.includes('/')) {
        // special case for path completion in strings, ensuring that:
        //     '/Com<tab> → '/Completion.ipynb
        // when the returned insert text is `Completion.ipynb` (the token here is `'/Com`)
        // developed against pyls and pylsp server, may not work well in other cases
        const parts = prefix.split('/');
        if (
          text.toLowerCase().startsWith(parts[parts.length - 1].toLowerCase())
        ) {
          let pathPrefix = parts.slice(0, -1).join('/') + '/';
          match.insertText = pathPrefix + match.insertText;
          // for label removing the prefix quote if present
          if (pathPrefix.startsWith("'") || pathPrefix.startsWith('"')) {
            pathPrefix = pathPrefix.substr(1);
          }
          match.label = pathPrefix + match.label;
          all_non_prefixed = false;
        }
      }

      let completionItem = new LazyCompletionItem(
        kind,
        this.icon_for(kind),
        match,
        this,
        document.uri
      );

      items.push(completionItem);
    });
    this.console.debug('Transformed');
    // required to make the repetitive trigger characters like :: or ::: work for R with R languageserver,
    // see https://github.com/jupyter-lsp/jupyterlab-lsp/issues/436
    let prefix_offset = token.value.length;
    // completion of dictionaries for Python with jedi-language-server was
    // causing an issue for dic['<tab>'] case; to avoid this let's make
    // sure that prefix.length >= prefix.offset
    if (all_non_prefixed && prefix_offset > prefix.length) {
      prefix_offset = prefix.length;
    }

    let response = {
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
      items: items,
      source: {
        name: 'LSP',
        priority: 2
      }
    };
    if (response.start > response.end) {
      console.warn(
        'Response contains start beyond end; this should not happen!',
        response
      );
    }

    return response;
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

  private transform_reply(reply: CompletionHandler.IReply): ICompletionsReply {
    this.console.log('Transforming kernel reply:', reply);
    let items: IExtendedCompletionItem[];
    const metadata = reply.metadata || {};
    const types = metadata._jupyter_types_experimental as JSONArray;

    if (types) {
      items = types.map((item: JSONObject) => {
        return {
          label: item.text as string,
          insertText: item.text as string,
          type: item.type === '<unknown>' ? undefined : (item.type as string),
          icon: this.icon_for(item.type as string),
          sortText: this.kernel_completions_first ? 'a' : 'z'
        };
      });
    } else {
      items = reply.matches.map(match => {
        return {
          label: match,
          insertText: match,
          sortText: this.kernel_completions_first ? 'a' : 'z'
        };
      });
    }
    return {
      start: reply.start,
      end: reply.end,
      source: {
        name: 'Kernel',
        priority: 1,
        fallbackIcon: this.icon_for('Kernel')
      },
      items
    };
  }

  protected merge_replies(
    replies: ICompletionsReply[],
    editor: CodeEditor.IEditor
  ): ICompletionsReply {
    this.console.debug('Merging completions:', replies);

    replies = replies.filter(reply => {
      if (reply instanceof Error) {
        this.console.warn(
          `Caught ${reply.source.name} completions error`,
          reply
        );
        return false;
      }
      // ignore if no matches
      if (!reply.items.length) {
        return false;
      }
      // otherwise keep
      return true;
    });

    replies.sort((a, b) => b.source.priority - a.source.priority);

    this.console.debug('Sorted replies:', replies);

    const minEnd = Math.min(...replies.map(reply => reply.end));

    // if any of the replies uses a wider range, we need to align them
    // so that all responses use the same range
    const minStart = Math.min(...replies.map(reply => reply.start));
    const maxStart = Math.max(...replies.map(reply => reply.start));

    if (minStart != maxStart) {
      const cursor = editor.getCursorPosition();
      const line = editor.getLine(cursor.line);

      replies = replies.map(reply => {
        // no prefix to strip, return as-is
        if (reply.start == maxStart) {
          return reply;
        }
        let prefix = line.substring(reply.start, maxStart);
        this.console.debug(`Removing ${reply.source.name} prefix: `, prefix);
        return {
          ...reply,
          items: reply.items.map(item => {
            item.insertText = item.insertText.startsWith(prefix)
              ? item.insertText.substr(prefix.length)
              : item.insertText;
            return item;
          })
        };
      });
    }

    const insertTextSet = new Set<string>();
    const processedItems = new Array<IExtendedCompletionItem>();

    for (const reply of replies) {
      reply.items.forEach(item => {
        // trimming because:
        // IPython returns 'import' and 'import '; while the latter is more useful,
        // user should not see two suggestions with identical labels and nearly-identical
        // behaviour as they could not distinguish the two either way
        let text = item.insertText.trim();
        if (insertTextSet.has(text)) {
          return;
        }
        insertTextSet.add(text);
        // extra processing (adding icon/source name) is delayed until
        // we are sure that the item will be kept (as otherwise it could
        // lead to processing hundreds of suggestions - e.g. from numpy
        // multiple times if multiple sources provide them).
        let processedItem = item as IExtendedCompletionItem;
        processedItem.source = reply.source;
        if (!processedItem.icon) {
          processedItem.icon = reply.source.fallbackIcon;
        }
        processedItems.push(processedItem);
      });
    }

    // Return reply with processed items.
    this.console.debug('Merged: ', processedItems);
    return {
      start: maxStart,
      end: minEnd,
      source: null,
      items: processedItems
    };
  }

  list(query: string | undefined): Promise<{
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
