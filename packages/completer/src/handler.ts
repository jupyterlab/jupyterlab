// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CellChange,
  FileChange,
  ISharedBaseCell,
  ISharedFile,
  ISharedText,
  SourceChange
} from '@jupyter/ydoc';
import {
  CodeEditor,
  COMPLETER_ACTIVE_CLASS,
  COMPLETER_ENABLED_CLASS,
  COMPLETER_LINE_BEGINNING_CLASS
} from '@jupyterlab/codeeditor';
import { Text } from '@jupyterlab/coreutils';
import { IDataConnector } from '@jupyterlab/statedb';
import { LabIcon } from '@jupyterlab/ui-components';
import { IDisposable } from '@lumino/disposable';
import { Message, MessageLoop } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';

import type { TransactionSpec } from '@codemirror/state';
import type { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { InlineCompleter } from './inline';
import {
  CompletionTriggerKind,
  IInlineCompletionItem,
  IInlineCompletionList,
  IInlineCompletionProviderInfo,
  InlineCompletionTriggerKind,
  IProviderReconciliator
} from './tokens';
import { Completer } from './widget';

/**
 * A completion handler for editors.
 */
export class CompletionHandler implements IDisposable {
  /**
   * Construct a new completion handler for a widget.
   */
  constructor(options: CompletionHandler.IOptions) {
    this.completer = options.completer;
    this.inlineCompleter = options.inlineCompleter;
    this.completer.selected.connect(this.onCompletionSelected, this);
    this.completer.visibilityChanged.connect(this.onVisibilityChanged, this);
    this._reconciliator = options.reconciliator;
  }

  /**
   * The completer widget managed by the handler.
   */
  readonly completer: Completer;
  readonly inlineCompleter: InlineCompleter | undefined;

  set reconciliator(reconciliator: IProviderReconciliator) {
    this._reconciliator = reconciliator;
  }

  /**
   * The editor used by the completion handler.
   */
  get editor(): CodeEditor.IEditor | null | undefined {
    return this._editor;
  }
  set editor(newValue: CodeEditor.IEditor | null | undefined) {
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
      model.sharedModel.changed.disconnect(this._onSharedModelChanged, this);
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
      // We expect the model to be an editor, a file editor, or a cell.
      const sharedModel = model.sharedModel as
        | ISharedText
        | ISharedFile
        | ISharedBaseCell;
      // For cells and files the `changed` signal is not limited to text,
      // but also fires on changes to metadata, outputs, execution count,
      // and state changes, hence we need to filter the change type.
      sharedModel.changed.connect(this._onSharedModelChanged, this);
      // On initial load, manually check the cursor position.
      this.onSelectionsChanged();
      if (this.inlineCompleter) {
        this.inlineCompleter.editor = editor;
      }
    }
  }

  /**
   * Get whether the completion handler is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Enable/disable continuous hinting mode.
   */
  set autoCompletion(value: boolean) {
    this._autoCompletion = value;
  }

  get autoCompletion(): boolean {
    return this._autoCompletion;
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
   * Invoke the inline completer on explicit user request.
   */
  invokeInline(): void {
    const editor = this._editor;
    if (editor) {
      this._makeInlineRequest(
        editor.getCursorPosition(),
        InlineCompletionTriggerKind.Invoke
      ).catch(reason => {
        console.warn('Inline invoke request bailed', reason);
      });
    }
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
      text: editor.model.sharedModel.getSource(),
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
    const cursorBeforeChange = editor.getOffsetAt(editor.getCursorPosition());
    // Update the document and the cursor position in the same transaction
    // to ensure consistency in listeners to document changes.
    // Note: it also ensures a single change is stored by the undo manager.
    const transactions: TransactionSpec = {
      changes: { from: start, to: end, insert: value }
    };
    if (cursorBeforeChange <= end && cursorBeforeChange >= start) {
      transactions.selection = { anchor: start + value.length };
    }
    (editor as CodeMirrorEditor).editor.dispatch(transactions);
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
      this._makeRequest(
        editor.getCursorPosition(),
        CompletionTriggerKind.Invoked
      ).catch(reason => {
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

    const inlineModel = this.inlineCompleter?.model;
    if (inlineModel) {
      // Dispatch selection change.
      inlineModel.handleSelectionChange(editor.getSelection());
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
    const { start, end } = editor.getSelection();

    // If there is a text selection, return.
    if (start.column !== end.column || start.line !== end.line) {
      this._enabled = false;
      model.reset(true);
      host.classList.remove(COMPLETER_ENABLED_CLASS);
      return;
    }

    // If line is empty or the cursor doesn't have any characters before
    // it besides whitespace, add line beginning class
    // so that completer can stay enabled, but tab
    // in codemirror can still be triggered.
    if (!line || end.column === 0) {
      host.classList.add(COMPLETER_LINE_BEGINNING_CLASS);
    } else if (line && line.slice(0, position.column).match(/^\s*$/)) {
      host.classList.add(COMPLETER_LINE_BEGINNING_CLASS);
    } else {
      host.classList.remove(COMPLETER_LINE_BEGINNING_CLASS);
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
  protected async onTextChanged(
    str: ISharedText,
    changed: SourceChange
  ): Promise<void> {
    if (!this._enabled) {
      return;
    }

    const model = this.completer.model;
    const editor = this.editor;
    if (!editor) {
      return;
    }
    if (
      model &&
      this._autoCompletion &&
      this._reconciliator.shouldShowContinuousHint &&
      (await this._reconciliator.shouldShowContinuousHint(
        this.completer.isVisible,
        changed
      ))
    ) {
      void this._makeRequest(
        editor.getCursorPosition(),
        CompletionTriggerKind.TriggerCharacter
      );
    }

    const inlineModel = this.inlineCompleter?.model;
    if (inlineModel) {
      // Dispatch the text change to inline completer
      // (this happens before request is sent)
      inlineModel.handleTextChange(changed);
      if (this._continuousInline) {
        void this._makeInlineRequest(
          editor.getCursorPosition(),
          InlineCompletionTriggerKind.Automatic
        );
      }
    }

    if (model) {
      // If there is a text selection, no completion is allowed.
      const { start, end } = editor.getSelection();
      if (start.column !== end.column || start.line !== end.line) {
        return;
      }
      // Dispatch the text change.
      model.handleTextChange(this.getState(editor, editor.getCursorPosition()));
    }
  }

  /**
   * Handle a visibility change signal from a completer widget.
   */
  protected onVisibilityChanged(completer: Completer): void {
    // Completer is not active.
    if (completer.isDisposed || completer.isHidden) {
      this._tabCompleterActive = false;
      if (this._editor) {
        this._editor.host.classList.remove(COMPLETER_ACTIVE_CLASS);
        this._editor.focus();
      }
      return;
    }

    // Completer is active.
    this._tabCompleterActive = true;
    this._editor?.host.classList.add(COMPLETER_ACTIVE_CLASS);
  }

  /**
   * Handle a text shared model change signal from an editor.
   */
  private async _onSharedModelChanged(
    str: ISharedText,
    changed: SourceChange | CellChange | FileChange
  ): Promise<void> {
    if (changed.sourceChange) {
      await this.onTextChanged(str, changed);
    }
  }

  /**
   * Make a completion request.
   */
  private _makeRequest(
    position: CodeEditor.IPosition,
    trigger: CompletionTriggerKind
  ): Promise<void> {
    const editor = this.editor;

    if (!editor) {
      return Promise.reject(new Error('No active editor'));
    }

    const request = this._composeRequest(editor, position);
    const state = this.getState(editor, position);
    return this._reconciliator
      .fetch(request, trigger)
      .then(reply => {
        if (!reply) {
          return;
        }

        const model = this._updateModel(state, reply.start, reply.end);
        if (!model) {
          return;
        }

        if (
          this.completer.suppressIfInlineCompleterActive &&
          this.inlineCompleter?.isActive
        ) {
          return;
        }

        if (model.setCompletionItems) {
          model.setCompletionItems(reply.items);
        }
      })
      .catch(p => {
        /* Fails silently. */
      });
  }

  private async _makeInlineRequest(
    position: CodeEditor.IPosition,
    trigger: InlineCompletionTriggerKind
  ) {
    const editor = this.editor;

    if (!editor) {
      return Promise.reject(new Error('No active editor'));
    }
    if (!this.inlineCompleter) {
      return Promise.reject(new Error('No inline completer'));
    }

    const line = editor.getLine(position.line);
    if (
      trigger === InlineCompletionTriggerKind.Automatic &&
      (typeof line === 'undefined' ||
        line.slice(0, position.column).match(/^\s*$/))
    ) {
      // In Automatic mode we only auto-trigger on the end of line (and not on the beginning).
      // Increase the counter to avoid out-of date replies when pressing Backspace quickly.
      this._fetchingInline += 1;
      return;
    }

    let isMiddleOfLine = false;

    if (typeof line !== 'undefined' && position.column < line.length) {
      isMiddleOfLine = true;
    }

    const request = this._composeRequest(editor, position);

    const model = this.inlineCompleter.model;
    if (!model) {
      return;
    }
    model.cursor = position;

    const current = ++this._fetchingInline;
    const promises = this._reconciliator.fetchInline(
      request,
      trigger,
      isMiddleOfLine
    );
    let cancelled = false;

    const completed = new Set<
      Promise<IInlineCompletionList<CompletionHandler.IInlineItem> | null>
    >();
    for (const promise of promises) {
      promise
        .then(result => {
          if (cancelled || !result || !result.items) {
            return;
          }
          if (current !== this._fetchingInline) {
            return;
          }
          completed.add(promise);
          if (completed.size === 1) {
            if (
              this.inlineCompleter?.suppressIfTabCompleterActive &&
              this._tabCompleterActive
            ) {
              cancelled = true;
              return;
            }
            model.setCompletions(result);
          } else {
            model.appendCompletions(result);
          }
        })
        .catch(e => {
          // Emit warning for debugging.
          console.warn(e);
        })
        .finally(() => {
          // Mark the provider promise as completed.
          completed.add(promise);
          // Let the model know that we are awaiting for fewer providers now.
          const remaining = promises.length - completed.size;
          model.notifyProgress({
            pendingProviders: remaining,
            totalProviders: promises.length
          });
        });
    }
  }
  private _fetchingInline = 0;

  private _composeRequest(
    editor: CodeEditor.IEditor,
    position: CodeEditor.IPosition
  ): CompletionHandler.IRequest {
    const text = editor.model.sharedModel.getSource();
    const mimeType = editor.model.mimeType;
    const offset = Text.jsIndexToCharIndex(editor.getOffsetAt(position), text);
    return { text, offset, mimeType };
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

  private _reconciliator: IProviderReconciliator;
  private _editor: CodeEditor.IEditor | null | undefined = null;
  private _enabled = false;
  private _isDisposed = false;
  private _autoCompletion = false;
  private _continuousInline = true;
  private _tabCompleterActive = false;
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
     * The inline completer widget; when absent inline completion is disabled.
     */
    inlineCompleter?: InlineCompleter;

    /**
     * The reconciliator that will fetch and merge completions from active providers.
     */
    reconciliator: IProviderReconciliator;
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

    /**
     * Method allowing to update fields asynchronously.
     */
    resolve?: (
      patch?: Completer.IPatch
    ) => Promise<CompletionHandler.ICompletionItem>;
  }

  /**
   * Connector for completion items.
   *
   * @deprecated since v4 to add a new source of completions, register a completion provider;
   *   to customise how completions get merged, provide a custom reconciliator.
   */
  export type ICompletionItemsConnector = IDataConnector<
    CompletionHandler.ICompletionItemsReply,
    void,
    CompletionHandler.IRequest
  >;

  /**
   * A reply to a completion items fetch request.
   */
  export interface ICompletionItemsReply<
    T extends
      CompletionHandler.ICompletionItem = CompletionHandler.ICompletionItem
  > {
    /**
     * The starting index for the substring being replaced by completion.
     */
    start: number;
    /**
     * The end index for the substring being replaced by completion.
     */
    end: number;
    /**
     * A list of completion items. default to CompletionHandler.ICompletionItems
     */
    items: Array<T>;
  }

  /**
   * Stream event type.
   */
  export enum StraemEvent {
    opened,
    update,
    closed
  }

  export interface IInlineItem extends IInlineCompletionItem {
    /**
     * The source provider information.
     */
    provider: IInlineCompletionProviderInfo;
    /**
     * Signal emitted when the item gets updated by streaming.
     */
    stream: ISignal<IInlineItem, StraemEvent>;
    /**
     * Most recent streamed token if any.
     */
    lastStreamed?: string;
    /**
     * Whether streaming is in progress.
     */
    streaming: boolean;
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

    /**
     * The MIME type under the cursor.
     */
    mimeType?: string;
  }

  /**
   * A namespace for completion handler messages.
   */
  export namespace Msg {
    /**
     * A singleton `'invoke-request'` message.
     */
    export const InvokeRequest = new Message('invoke-request');
  }
}
