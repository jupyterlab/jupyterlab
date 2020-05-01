// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';

import { Text } from '@jupyterlab/coreutils';

import { LabIcon } from '@jupyterlab/ui-components';

import { IDataConnector } from '@jupyterlab/statedb';

import { ReadonlyJSONObject, JSONObject, JSONArray } from '@lumino/coreutils';

import { IDisposable } from '@lumino/disposable';

import { Message, MessageLoop } from '@lumino/messaging';

import { Signal } from '@lumino/signaling';

import { Completer } from './widget';
import { DummyConnector } from './dummyconnector';

/**
 * A class added to editors that can host a completer.
 */
const COMPLETER_ENABLED_CLASS: string = 'jp-mod-completer-enabled';

/**
 * A class added to editors that have an active completer.
 */
const COMPLETER_ACTIVE_CLASS: string = 'jp-mod-completer-active';

/**
 * A completion handler for editors.
 */
export class CompletionHandler implements IDisposable {
  /**
   * Construct a new completion handler for a widget.
   */
  constructor(options: CompletionHandler.IOptions) {
    this.completer = options.completer;
    this.completer.selected.connect(this.onCompletionSelected, this);
    this.completer.visibilityChanged.connect(this.onVisibilityChanged, this);
    this._connector = options.connector;
  }

  /**
   * The completer widget managed by the handler.
   */
  readonly completer: Completer;

  /**
   * The data connector used to populate completion requests.
   *
   * #### Notes
   * The only method of this connector that will ever be called is `fetch`, so
   * it is acceptable for the other methods to be simple functions that return
   * rejected promises.
   */
  get connector(): IDataConnector<
    CompletionHandler.IReply,
    void,
    CompletionHandler.IRequest
  > {
    if ('responseType' in this._connector) {
      return new DummyConnector();
    }
    return this._connector as IDataConnector<
      CompletionHandler.IReply,
      void,
      CompletionHandler.IRequest
    >;
  }
  set connector(
    connector: IDataConnector<
      CompletionHandler.IReply,
      void,
      CompletionHandler.IRequest
    >
  ) {
    this._connector = connector;
  }

  /**
   * The editor used by the completion handler.
   */
  get editor(): CodeEditor.IEditor | null {
    return this._editor;
  }
  set editor(newValue: CodeEditor.IEditor | null) {
    if (newValue === this._editor) {
      return;
    }

    let editor = this._editor;

    // Clean up and disconnect from old editor.
    if (editor && !editor.isDisposed) {
      const model = editor.model;

      editor.host.classList.remove(COMPLETER_ENABLED_CLASS);
      editor.host.classList.remove(COMPLETER_ACTIVE_CLASS);
      model.selections.changed.disconnect(this.onSelectionsChanged, this);
      model.value.changed.disconnect(this.onTextChanged, this);
    }

    // Reset completer state.
    this.completer.reset();
    this.completer.editor = newValue;

    // Update the editor and signal connections.
    editor = this._editor = newValue;
    if (editor) {
      const model = editor.model;

      this._enabled = false;
      model.selections.changed.connect(this.onSelectionsChanged, this);
      model.value.changed.connect(this.onTextChanged, this);
      // On initial load, manually check the cursor position.
      this.onSelectionsChanged();
    }
  }

  /**
   * Get whether the completion handler is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources used by the handler.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * Invoke the handler and launch a completer.
   */
  invoke(): void {
    MessageLoop.sendMessage(this, CompletionHandler.Msg.InvokeRequest);
  }

  /**
   * Process a message sent to the completion handler.
   */
  processMessage(msg: Message): void {
    switch (msg.type) {
      case CompletionHandler.Msg.InvokeRequest.type:
        this.onInvokeRequest(msg);
        break;
      default:
        break;
    }
  }

  /**
   * Get the state of the text editor at the given position.
   */
  protected getState(
    editor: CodeEditor.IEditor,
    position: CodeEditor.IPosition
  ): Completer.ITextState {
    return {
      text: editor.model.value.text,
      lineHeight: editor.lineHeight,
      charWidth: editor.charWidth,
      line: position.line,
      column: position.column
    };
  }

  /**
   * Handle a completion selected signal from the completion widget.
   */
  protected onCompletionSelected(completer: Completer, val: string): void {
    const model = completer.model;
    const editor = this._editor;
    if (!editor || !model) {
      return;
    }

    const patch = model.createPatch(val);

    if (!patch) {
      return;
    }

    const { start, end, value } = patch;
    editor.model.value.remove(start, end);
    editor.model.value.insert(start, value);
  }

  /**
   * Handle `invoke-request` messages.
   */
  protected onInvokeRequest(msg: Message): void {
    // If there is no completer model, bail.
    if (!this.completer.model) {
      return;
    }

    // If a completer session is already active, bail.
    if (this.completer.model.original) {
      return;
    }

    const editor = this._editor;
    if (editor) {
      this._makeRequest(editor.getCursorPosition()).catch(reason => {
        console.warn('Invoke request bailed', reason);
      });
    }
  }

  /**
   * Handle selection changed signal from an editor.
   *
   * #### Notes
   * If a sub-class reimplements this method, then that class must either call
   * its super method or it must take responsibility for adding and removing
   * the completer completable class to the editor host node.
   *
   * Despite the fact that the editor widget adds a class whenever there is a
   * primary selection, this method checks independently for two reasons:
   *
   * 1. The editor widget connects to the same signal to add that class, so
   *    there is no guarantee that the class will be added before this method
   *    is invoked so simply checking for the CSS class's existence is not an
   *    option. Secondarily, checking the editor state should be faster than
   *    querying the DOM in either case.
   * 2. Because this method adds a class that indicates whether completer
   *    functionality ought to be enabled, relying on the behavior of the
   *    `jp-mod-has-primary-selection` to filter out any editors that have
   *    a selection means the semantic meaning of `jp-mod-completer-enabled`
   *    is obscured because there may be cases where the enabled class is added
   *    even though the completer is not available.
   */
  protected onSelectionsChanged(): void {
    const model = this.completer.model;
    const editor = this._editor;

    if (!editor) {
      return;
    }

    const host = editor.host;

    // If there is no model, return.
    if (!model) {
      this._enabled = false;
      host.classList.remove(COMPLETER_ENABLED_CLASS);
      return;
    }

    // If we are currently performing a subset match,
    // return without resetting the completer.
    if (model.subsetMatch) {
      return;
    }

    const position = editor.getCursorPosition();
    const line = editor.getLine(position.line);
    if (!line) {
      this._enabled = false;
      model.reset(true);
      host.classList.remove(COMPLETER_ENABLED_CLASS);
      return;
    }

    const { start, end } = editor.getSelection();

    // If there is a text selection, return.
    if (start.column !== end.column || start.line !== end.line) {
      this._enabled = false;
      model.reset(true);
      host.classList.remove(COMPLETER_ENABLED_CLASS);
      return;
    }

    // If the part of the line before the cursor is white space, return.
    if (line.slice(0, position.column).match(/^\s*$/)) {
      this._enabled = false;
      model.reset(true);
      host.classList.remove(COMPLETER_ENABLED_CLASS);
      return;
    }

    // Enable completion.
    if (!this._enabled) {
      this._enabled = true;
      host.classList.add(COMPLETER_ENABLED_CLASS);
    }

    // Dispatch the cursor change.
    model.handleCursorChange(this.getState(editor, editor.getCursorPosition()));
  }

  /**
   * Handle a text changed signal from an editor.
   */
  protected onTextChanged(): void {
    const model = this.completer.model;
    if (!model || !this._enabled) {
      return;
    }

    // If there is a text selection, no completion is allowed.
    const editor = this.editor;
    if (!editor) {
      return;
    }
    const { start, end } = editor.getSelection();
    if (start.column !== end.column || start.line !== end.line) {
      return;
    }

    // Dispatch the text change.
    model.handleTextChange(this.getState(editor, editor.getCursorPosition()));
  }

  /**
   * Handle a visibility change signal from a completer widget.
   */
  protected onVisibilityChanged(completer: Completer): void {
    // Completer is not active.
    if (completer.isDisposed || completer.isHidden) {
      if (this._editor) {
        this._editor.host.classList.remove(COMPLETER_ACTIVE_CLASS);
        this._editor.focus();
      }
      return;
    }

    // Completer is active.
    if (this._editor) {
      this._editor.host.classList.add(COMPLETER_ACTIVE_CLASS);
    }
  }

  /**
   * Make a completion request.
   */
  private _makeRequest(position: CodeEditor.IPosition): Promise<void> {
    const editor = this.editor;

    if (!editor) {
      return Promise.reject(new Error('No active editor'));
    }

    const text = editor.model.value.text;
    const offset = Text.jsIndexToCharIndex(editor.getOffsetAt(position), text);
    const pending = ++this._pending;
    const state = this.getState(editor, position);
    const request: CompletionHandler.IRequest = { text, offset };

    if (this._isICompletionItemsConnector(this._connector)) {
      return this._connector
        .fetch(request)
        .then(reply => {
          this._validate(pending, request);
          if (!reply) {
            throw new Error(`Invalid request: ${request}`);
          }

          this._onFetchItemsReply(state, reply);
        })
        .catch(_ => {
          this._onFailure();
        });
    }

    return this._connector
      .fetch(request)
      .then(reply => {
        this._validate(pending, request);
        if (!reply) {
          throw new Error(`Invalid request: ${request}`);
        }

        this._onReply(state, reply);
      })
      .catch(_ => {
        this._onFailure();
      });
  }

  private _isICompletionItemsConnector(
    connector:
      | IDataConnector<
          CompletionHandler.IReply,
          void,
          CompletionHandler.IRequest
        >
      | CompletionHandler.ICompletionItemsConnector
  ): connector is CompletionHandler.ICompletionItemsConnector {
    return (
      (connector as CompletionHandler.ICompletionItemsConnector)
        .responseType === CompletionHandler.ICompletionItemsResponseType
    );
  }

  private _validate(pending: number, request: CompletionHandler.IRequest) {
    if (this.isDisposed) {
      throw new Error('Handler is disposed');
    }
    // If a newer completion request has created a pending request, bail.
    if (pending !== this._pending) {
      throw new Error('A newer completion request is pending');
    }
  }

  /**
   * Updates model with text state and current cursor position.
   */
  private _updateModel(
    state: Completer.ITextState,
    start: number,
    end: number
  ): Completer.IModel | null {
    const model = this.completer.model;
    const text = state.text;

    if (!model) {
      return null;
    }

    // Update the original request.
    model.original = state;
    // Update the cursor.
    model.cursor = {
      start: Text.charIndexToJsIndex(start, text),
      end: Text.charIndexToJsIndex(end, text)
    };
    return model;
  }

  /**
   * Receive a completion reply from the connector.
   *
   * @param state - The state of the editor when completion request was made.
   *
   * @param reply - The API response returned for a completion request.
   */
  private _onReply(
    state: Completer.ITextState,
    reply: CompletionHandler.IReply
  ): void {
    const model = this._updateModel(state, reply.start, reply.end);
    if (!model) {
      return;
    }

    // Dedupe the matches.
    const matches: string[] = [];
    const matchSet = new Set(reply.matches || []);

    if (reply.matches) {
      matchSet.forEach(match => {
        matches.push(match);
      });
    }

    // Extract the optional type map. The current implementation uses
    // _jupyter_types_experimental which provide string type names. We make no
    // assumptions about the names of the types, so other kernels can provide
    // their own types.
    // Even though the `metadata` field is required, it has historically not
    // been used. Defensively check if it exists.
    const metadata = reply.metadata || {};
    const types = metadata._jupyter_types_experimental as JSONArray;
    const typeMap: Completer.TypeMap = {};

    if (types) {
      types.forEach((item: JSONObject) => {
        // For some reason the _jupyter_types_experimental list has two entries
        // for each match, with one having a type of "<unknown>". Discard those
        // and use undefined to indicate an unknown type.
        const text = item.text as string;
        const type = item.type as string;

        if (matchSet.has(text) && type !== '<unknown>') {
          typeMap[text] = type;
        }
      });
    }

    // Update the options, including the type map.
    model.setOptions(matches, typeMap);
  }

  /**
   * Receive completion items from provider.
   *
   * @param state - The state of the editor when completion request was made.
   *
   * @param reply - The API response returned for a completion request.
   */
  private _onFetchItemsReply(
    state: Completer.ITextState,
    reply: CompletionHandler.ICompletionItemsReply
  ) {
    const model = this._updateModel(state, reply.start, reply.end);
    if (!model) {
      return;
    }
    if (model.setCompletionItems) {
      model.setCompletionItems(reply.items);
    }
  }

  /**
   * If completion request fails, reset model and fail silently.
   */
  private _onFailure() {
    const model = this.completer.model;

    if (model) {
      model.reset(true);
    }
  }

  private _connector:
    | IDataConnector<CompletionHandler.IReply, void, CompletionHandler.IRequest>
    | CompletionHandler.ICompletionItemsConnector;
  private _editor: CodeEditor.IEditor | null = null;
  private _enabled = false;
  private _pending = 0;
  private _isDisposed = false;
}

/**
 * A namespace for cell completion handler statics.
 */
export namespace CompletionHandler {
  /**
   * The instantiation options for cell completion handlers.
   */
  export interface IOptions {
    /**
     * The completion widget the handler will connect to.
     */
    completer: Completer;

    /**
     * The data connector used to populate completion requests.
     * Use the connector with ICompletionItemsReply for enhanced completions.
     * #### Notes
     * The only method of this connector that will ever be called is `fetch`, so
     * it is acceptable for the other methods to be simple functions that return
     * rejected promises.
     */
    connector:
      | IDataConnector<IReply, void, IRequest>
      | CompletionHandler.ICompletionItemsConnector;
  }

  /**
   * Type alias for ICompletionItem list.
   * Implementers of this interface should be responsible for
   * deduping and sorting the items in the list.
   */
  export type ICompletionItems = ReadonlyArray<ICompletionItem>;

  /**
   * Completion item object based off of LSP CompletionItem.
   * Compared to the old kernel completions interface, this enhances the completions UI to support:
   * - differentiation between inserted text and user facing text
   * - documentation for each completion item to be displayed adjacently
   * - deprecation styling
   * - custom icons
   * and other potential new features.
   */
  export interface ICompletionItem {
    /**
     * User facing completion.
     * If insertText is not set, this will be inserted.
     */
    label: string;

    /**
     * Completion to be inserted.
     */
    insertText?: string;

    /**
     * Type of this completion item.
     */
    type?: string;

    /**
     * LabIcon object for icon to be rendered with completion type.
     */
    icon?: LabIcon;

    /**
     * A human-readable string with additional information
     * about this item, like type or symbol information.
     */
    documentation?: string;

    /**
     * Indicates if the item is deprecated.
     */
    deprecated?: boolean;
  }

  export type ICompletionItemsConnector = IDataConnector<
    CompletionHandler.ICompletionItemsReply,
    void,
    CompletionHandler.IRequest
  > &
    CompletionHandler.ICompleterConnecterResponseType;

  /**
   * A reply to a completion items fetch request.
   */
  export interface ICompletionItemsReply {
    /**
     * The starting index for the substring being replaced by completion.
     */
    start: number;
    /**
     * The end index for the substring being replaced by completion.
     */
    end: number;
    /**
     * A list of completion items.
     */
    items: CompletionHandler.ICompletionItems;
  }

  export interface ICompleterConnecterResponseType {
    responseType: typeof ICompletionItemsResponseType;
  }

  export const ICompletionItemsResponseType = 'ICompletionItemsReply' as const;

  /**
   * A reply to a completion request.
   */
  export interface IReply {
    /**
     * The starting index for the substring being replaced by completion.
     */
    start: number;

    /**
     * The end index for the substring being replaced by completion.
     */
    end: number;

    /**
     * A list of matching completion strings.
     */
    matches: ReadonlyArray<string>;

    /**
     * Any metadata that accompanies the completion reply.
     */
    metadata: ReadonlyJSONObject;
  }

  /**
   * The details of a completion request.
   */
  export interface IRequest {
    /**
     * The cursor offset position within the text being completed.
     */
    offset: number;

    /**
     * The text being completed.
     */
    text: string;
  }

  /**
   * A namespace for completion handler messages.
   */
  export namespace Msg {
    /* tslint:disable */
    /**
     * A singleton `'invoke-request'` message.
     */
    export const InvokeRequest = new Message('invoke-request');
    /* tslint:enable */
  }
}
