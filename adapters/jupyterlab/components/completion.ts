import { DataConnector } from '@jupyterlab/statedb';
import {
  CompletionHandler,
  ContextConnector,
  KernelConnector,
  CompletionConnector
} from '@jupyterlab/completer';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { JSONArray, JSONObject } from '@lumino/coreutils';
import { completionItemKindNames, CompletionTriggerKind } from '../../../lsp';
import * as lsProtocol from 'vscode-languageserver-protocol';
import { PositionConverter } from '../../../converter';
import { VirtualDocument } from '../../../virtual/document';
import { VirtualEditor } from '../../../virtual/editor';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import {
  IEditorPosition,
  IRootPosition,
  IVirtualPosition
} from '../../../positioning';
import { LSPConnection } from '../../../connection';
import { Session } from '@jupyterlab/services';

/*
Feedback: anchor - not clear from docs
bundle - very not clear from the docs, interface or better docs would be nice to have
 */

/**
 * A LSP connector for completion handlers.
 */
export class LSPConnector extends DataConnector<
  CompletionHandler.IReply,
  void,
  CompletionHandler.IRequest
> {
  isDisposed = false;
  private _editor: CodeEditor.IEditor;
  private _connections: Map<VirtualDocument.id_path, LSPConnection>;
  private _context_connector: ContextConnector;
  private _kernel_connector: KernelConnector;
  private _kernel_and_context_connector: CompletionConnector;
  protected options: LSPConnector.IOptions;

  virtual_editor: VirtualEditor;
  private trigger_kind: CompletionTriggerKind;
  // TODO expose this in user settings
  private suppress_auto_invoke_in = ['comment', 'string'];

  /**
   * Create a new LSP connector for completion requests.
   *
   * @param options - The instantiation options for the LSP connector.
   */
  constructor(options: LSPConnector.IOptions) {
    super();
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
    this.options = options;
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

  protected async _kernel_language(): Promise<string> {
    return (await this.options.session.kernel.info).language_info.name;
  }

  get fallback_connector() {
    return this._kernel_and_context_connector
      ? this._kernel_and_context_connector
      : this._context_connector;
  }

  transform_from_editor_to_root(position: CodeEditor.IPosition): IRootPosition {
    let cm_editor = (this._editor as CodeMirrorEditor).editor;
    let cm_start = PositionConverter.ce_to_cm(position) as IEditorPosition;
    return this.virtual_editor.transform_editor_to_root(cm_editor, cm_start);
  }

  /**
   * Fetch completion requests.
   *
   * @param request - The completion request text and details.
   */
  async fetch(
    request: CompletionHandler.IRequest
  ): Promise<CompletionHandler.IReply> {
    let editor = this._editor;

    const cursor = editor.getCursorPosition();
    const token = editor.getTokenForPosition(cursor);

    if (this.suppress_auto_invoke_in.indexOf(token.type) !== -1) {
      console.log('Suppressing completer auto-invoke in', token.type);
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

    try {
      if (this._kernel_connector && this._has_kernel) {
        // TODO: this would be awesome if we could connect to rpy2 for R suggestions in Python,
        //  but this is not the job of this extension; nevertheless its better to keep this in
        //  mind to avoid introducing design decisions which would make this impossible
        //  (for other extensions)
        const kernelLanguage = await this._kernel_language();

        if (document.language === kernelLanguage) {
          return Promise.all([
            this._kernel_connector.fetch(request),
            this.fetch_lsp(
              token,
              typed_character,
              virtual_start,
              virtual_end,
              virtual_cursor,
              document,
              position_in_token
            )
          ]).then(([kernel, lsp]) =>
            this.merge_replies(this.transform_reply(kernel), lsp, this._editor)
          );
        }
      }

      return this.fetch_lsp(
        token,
        typed_character,
        virtual_start,
        virtual_end,
        virtual_cursor,
        document,
        position_in_token
      ).catch(e => {
        console.warn('LSP: hint failed', e);
        return this.fallback_connector.fetch(request);
      });
    } catch (e) {
      console.warn('LSP: kernel completions failed', e);
      return this.fallback_connector.fetch(request);
    }
  }

  async fetch_lsp(
    token: CodeEditor.IToken,
    typed_character: string,
    start: IVirtualPosition,
    end: IVirtualPosition,
    cursor: IVirtualPosition,
    document: VirtualDocument,
    position_in_token: number
  ): Promise<CompletionHandler.IReply> {
    let connection = this._connections.get(document.id_path);

    console.log('[LSP][Completer] Fetching and Transforming');
    console.log('[LSP][Completer] Token:', token);

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
      this.trigger_kind
    )) || []) as lsProtocol.CompletionItem[];

    let prefix = token.value.slice(0, position_in_token + 1);
    let all_non_prefixed = true;
    let items: CompletionHandler.ICompletionItem[] = [];
    lspCompletionItems.forEach(match => {
      let completionItem = {
        label: match.label,
        insertText: match.insertText,
        type: match.kind ? completionItemKindNames[match.kind] : '',
        documentation: lsProtocol.MarkupContent.is(match.documentation)
          ? match.documentation.value
          : match.documentation,
        filterText: match.filterText,
        deprecated: match.deprecated,
        data: { ...match }
      };

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
      start: token.offset + (all_non_prefixed ? 1 : 0),
      end: token.offset + prefix.length,
      matches: [],
      metadata: {},
      items: { items }
    };
  }

  private transform_reply(
    reply: CompletionHandler.IReply
  ): CompletionHandler.IReply {
    console.log('[LSP][Completer] Transforming kernel reply:', reply);
    const items = new Array<CompletionHandler.ICompletionItem>();
    const metadata = reply.metadata || {};
    const types = metadata._jupyter_types_experimental as JSONArray;

    if (types) {
      types.forEach((item: JSONObject) => {
        // For some reason the _jupyter_types_experimental list has two entries
        // for each match, with one having a type of "<unknown>". Discard those
        // and use undefined to indicate an unknown type.
        const text = item.text as string;
        const type = item.type as string;
        items.push({ label: text, type });
      });
    } else {
      const matches = reply.matches;
      matches.forEach(match => {
        items.push({ label: match });
      });
    }
    return { ...reply, items: { items } };
  }

  private merge_replies(
    kernel: CompletionHandler.IReply,
    lsp: CompletionHandler.IReply,
    editor: CodeEditor.IEditor
  ): CompletionHandler.IReply {
    console.log('[LSP][Completer] Merging completions:', lsp, kernel);
    if (!kernel.items.items.length) {
      return lsp;
    }
    if (!lsp.items.items.length) {
      return kernel;
    }
    // Combine ICompletionItems across multiple IReply objects
    const aggregatedItems = lsp.items.items.concat(kernel.items.items);
    // De-dupe and filter items
    const labelSet = new Set<String>();
    const processedItems = new Array<CompletionHandler.ICompletionItem>();
    // TODO: Integrate prefix stripping?
    aggregatedItems.forEach(item => {
      if (
        labelSet.has(item.label) ||
        (item.type && item.type === '<unknown>')
      ) {
        return;
      }
      labelSet.add(item.label);
      processedItems.push(item);
    });
    // TODO: Sort items
    // Return reply with processed items.
    return { ...lsp, items: { items: processedItems } };
  }

  // TODO: Remove this
  // private merge_replies_old(
  //   kernel: CompletionHandler.IReply,
  //   lsp: CompletionHandler.IReply,
  //   editor: CodeEditor.IEditor
  // ) {
  //   // This is based on https://github.com/jupyterlab/jupyterlab/blob/f1bc02ced61881df94c49929837c49c022f5b115/packages/completer/src/connector.ts#L78
  //   // Copyright (c) Jupyter Development Team.
  //   // Distributed under the terms of the Modified BSD License.

  //   // If one is empty, return the other.
  //   if (kernel.matches.length === 0) {
  //     return lsp;
  //   } else if (lsp.matches.length === 0) {
  //     return kernel;
  //   }
  //   console.log('[LSP][Completer] Merging completions:', lsp, kernel);

  //   // Populate the result with a copy of the lsp matches.
  //   const matches = lsp.matches.slice();
  //   const types = lsp.metadata._jupyter_types_experimental as Array<IItemType>;

  //   // Cache all the lsp matches in a memo.
  //   const memo = new Set<string>(matches);
  //   const memo_types = new Map<string, string>(
  //     types.map(v => [v.text, v.type])
  //   );

  //   let prefix = '';

  //   // if the kernel used a wider range, get the previous characters to strip the prefix off,
  //   // so that both use the same range
  //   if (lsp.start > kernel.start) {
  //     const cursor = editor.getCursorPosition();
  //     const line = editor.getLine(cursor.line);
  //     prefix = line.substring(kernel.start, lsp.start);
  //     console.log('[LSP][Completer] Removing kernel prefix: ', prefix);
  //   } else if (lsp.start < kernel.start) {
  //     console.warn('[LSP][Completer] Kernel start > LSP start');
  //   }

  //   let remove_prefix = (value: string) => {
  //     if (value.startsWith(prefix)) {
  //       return value.substr(prefix.length);
  //     }
  //     return value;
  //   };

  //   // TODO push the CompletionItem suggestion with proper sorting, this is a mess
  //   let priority_matches = new Set<string>();

  //   if (kernel.metadata._jupyter_types_experimental == null) {
  //     let kernel_types = kernel.metadata._jupyter_types_experimental as Array<
  //       IItemType
  //     >;
  //     kernel_types.forEach(itemType => {
  //       let text = remove_prefix(itemType.text);
  //       if (!memo_types.has(text)) {
  //         memo_types.set(text, itemType.type);
  //         if (itemType.type !== '<unknown>') {
  //           priority_matches.add(text);
  //         }
  //       }
  //     });
  //   }

  //   // Add each context match that is not in the memo to the result.
  //   kernel.matches.forEach(match => {
  //     match = remove_prefix(match);
  //     if (!memo.has(match) && !priority_matches.has(match)) {
  //       matches.push(match);
  //     }
  //   });

  //   let final_matches: Array<string> = Array.from(priority_matches).concat(
  //     matches
  //   );
  //   let merged_types: Array<IItemType> = Array.from(
  //     memo_types.entries()
  //   ).map(([key, value]) => ({ text: key, type: value }));

  //   return {
  //     ...lsp,
  //     matches: final_matches,
  //     metadata: {
  //       _jupyter_types_experimental: merged_types
  //     }
  //   };
  // }

  with_trigger_kind(kind: CompletionTriggerKind, fn: Function) {
    try {
      this.trigger_kind = kind;
      return fn();
    } finally {
      // Return to the default state
      this.trigger_kind = CompletionTriggerKind.Invoked;
    }
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
    virtual_editor: VirtualEditor;
    /**
     * The connections to be used by the LSP connector.
     */
    connections: Map<VirtualDocument.id_path, LSPConnection>;

    session?: Session.ISessionConnection;
  }
}
