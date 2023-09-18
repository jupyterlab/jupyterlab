// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';
import { IRenderMime } from '@jupyterlab/rendermime';
import { Session } from '@jupyterlab/services';
import { SourceChange } from '@jupyter/ydoc';
import { Token } from '@lumino/coreutils';
import { ISignal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import { CompletionHandler } from './handler';
import { Completer } from './widget';

/**
 * The type of completion request.
 */
export enum CompletionTriggerKind {
  Invoked = 1,
  TriggerCharacter = 2,
  TriggerForIncompleteCompletions = 3
}

/**
 * The context which will be passed to the completion provider.
 */
export interface ICompletionContext {
  /**
   * The widget (notebook, console, code editor) which invoked
   * the completer
   */
  widget: Widget;

  /**
   * The current editor.
   */
  editor?: CodeEditor.IEditor | null;

  /**
   * The session extracted from widget for convenience.
   */
  session?: Session.ISessionConnection | null;

  /**
   * The sanitizer used to sanitize untrusted html inputs.
   */
  sanitizer?: IRenderMime.ISanitizer;
}

/**
 * The interface to implement a completion provider.
 */
export interface ICompletionProvider<
  T extends
    CompletionHandler.ICompletionItem = CompletionHandler.ICompletionItem
> {
  /**
   * Unique identifier of the provider
   */
  readonly identifier: string;

  /**
   * Rank used to order completion results from different completion providers.
   *
   * #### Note: The default providers (CompletionProvider:context and
   * CompletionProvider:kernel) use a rank of ≈500. If you want to give
   * priority to your provider, use a rank of 1000 or above.
   *
   * The rank is optional for backwards compatibility. If the rank is `undefined`,
   * it will assign a rank of [1, 499] making the provider available but with a
   * lower priority.
   */
  readonly rank?: number;

  /**
   * Renderer for provider's completions (optional).
   */
  readonly renderer?: Completer.IRenderer | null;

  /**
   * Is completion provider applicable to specified context?
   * @param request - the completion request text and details
   * @param context - additional information about context of completion request
   */
  isApplicable(context: ICompletionContext): Promise<boolean>;

  /**
   * Fetch completion requests.
   *
   * @param request - the completion request text and details
   * @param context - additional information about context of completion request
   * @param trigger - Who triggered the request (optional).
   */
  fetch(
    request: CompletionHandler.IRequest,
    context: ICompletionContext,
    trigger?: CompletionTriggerKind
  ): Promise<CompletionHandler.ICompletionItemsReply<T>>;

  /**
   * This method is called to customize the model of a completer widget.
   * If it is not provided, the default model will be used.
   *
   * @param context - additional information about context of completion request
   * @returns The completer model
   */
  modelFactory?(context: ICompletionContext): Promise<Completer.IModel>;

  /**
   * Given an incomplete (unresolved) completion item, resolve it by adding
   * all missing details, such as lazy-fetched documentation.
   *
   * @param completionItem - the completion item to resolve
   * @param context - The context of the completer
   * @param patch - The text which will be injected if the completion item is
   * selected.
   */
  resolve?(
    completionItem: T,
    context: ICompletionContext,
    patch?: Completer.IPatch | null
  ): Promise<T>;

  /**
   * If users enable `autoCompletion` in setting, this method is
   * called on text changed event of `CodeMirror` to check if the
   * completion items should be shown.
   *
   * @param  completerIsVisible - Current visibility status of the
   *  completer widget
   * @param  changed - changed text.
   * @param  context - The context of the completer (optional).
   */
  shouldShowContinuousHint?(
    completerIsVisible: boolean,
    changed: SourceChange,
    context?: ICompletionContext
  ): boolean;
}

/**
 * Describes how an inline completion provider was triggered.
 * @alpha
 */
export enum InlineCompletionTriggerKind {
  /**
   * Completion was triggered explicitly by a user gesture.
   * Return multiple completion items to enable cycling through them.
   */
  Invoke = 0,
  /**
   * Completion was triggered automatically while editing.
   * It is sufficient to return a single completion item in this case.
   */
  Automatic = 1
}

/**
 * The context which will be passed to the inline completion provider.
 * @alpha
 */
export interface IInlineCompletionContext {
  /**
   * The widget (notebook, console, code editor) which invoked
   * the inline completer
   */
  widget: Widget;

  /**
   * The session extracted from widget for convenience.
   */
  session?: Session.ISessionConnection | null;

  triggerKind: InlineCompletionTriggerKind;

  // selectedCompletionInfo?: ISelectedCompletionInfo;
}

/**
 * LSP 3.18-compliant inline completion API subset.
 */
interface IInlineCompletionItemLSP {
  /**
   * The text to replace the range with. Must be set.
   * Is used both for the preview and the accept operation.
   */
  insertText: string;

  /**
   * A text that is used to decide if this inline completion should be
   * shown. When `falsy` the insertText is used.
   *
   * An inline completion is shown if the text to replace is a prefix of the
   * filter text.
   */
  filterText?: string;
}

/**
 * An inline completion item represents a text snippet that is proposed inline
 * to complete text that is being typed.
 * @alpha
 */
export interface IInlineCompletionItem extends IInlineCompletionItemLSP {
  token?: string;
  /**
   * Whether generation of `insertText` is still ongoing. If your provider supports streaming,
   * you can set this to true, which will result in the provider's `stream()` method being called
   * with `token` which has to be set for incomplete completions.
   */
  isIncomplete?: boolean;
}

export interface IInlineCompletionList<
  T extends IInlineCompletionItem = IInlineCompletionItem
> {
  /**
   * The inline completion items.
   */
  items: T[];
}

/**
 * The interface to implement an inline completion provider.
 */
export interface IInlineCompletionProvider<
  T extends IInlineCompletionItem = IInlineCompletionItem
> {
  fetch(
    request: CompletionHandler.IRequest,
    context: IInlineCompletionContext
  ): Promise<IInlineCompletionList<T>>;

  /**
   * Name of the provider to be displayed in the UI.
   */
  name: string;

  /**
   * Unique identifier, cannot change on runtime.
   */
  identifier: string;

  // TODO implement streaming support later on
  stream?(token: string): {
    done: boolean;
    response: T;
  };
}

/**
 * The exported token used to register new provider.
 */
export const ICompletionProviderManager = new Token<ICompletionProviderManager>(
  '@jupyterlab/completer:ICompletionProviderManager',
  'A service for the completion providers management.'
);

export interface ICompletionProviderManager {
  /**
   * Register a completer provider with the manager.
   *
   * @param {ICompletionProvider} provider - the provider to be registered.
   */
  registerProvider(provider: ICompletionProvider): void;

  /**
   * Register an inline completer provider with the manager.
   */
  registerInlineProvider(provider: IInlineCompletionProvider): void;

  /**
   * Invoke the completer in the widget with provided id.
   *
   * @param {string} id - the id of notebook panel, console panel or code editor.
   */
  invoke(id: string): void;

  /**
   * Activate `select` command in the widget with provided id.
   *
   * @param {string} id - the id of notebook panel, console panel or code editor.
   */
  select(id: string): void;

  /**
   * Update completer handler of a widget with new context.
   *
   * @param newCompleterContext - The completion context.
   */
  updateCompleter(newCompleterContext: ICompletionContext): Promise<void>;

  /**
   * Signal emitted when active providers list is changed.
   */
  activeProvidersChanged: ISignal<ICompletionProviderManager, void>;
}

export interface IProviderReconciliator {
  /**
   * Fetch response from multiple providers, If a provider can not return
   * the response for a completer request before timeout,
   * the result of this provider will be ignore.
   *
   * @param {CompletionHandler.IRequest} request - The completion request.
   * @param trigger - Who triggered the request (optional).
   */
  fetch(
    request: CompletionHandler.IRequest,
    trigger?: CompletionTriggerKind
  ): Promise<CompletionHandler.ICompletionItemsReply | null>;

  /**
   * TODO - document me
   */
  fetchInline(
    request: CompletionHandler.IRequest,
    trigger?: InlineCompletionTriggerKind
  ): Promise<CompletionHandler.IInlineCompletionReply[] | null>;

  /**
   * Check if completer should make request to fetch completion responses
   * on user typing. If the provider with highest rank does not have
   * `shouldShowContinuousHint` method, a default one will be used.
   *
   * @param completerIsVisible - The visible status of completer widget.
   * @param changed - CodeMirror changed argument.
   */
  shouldShowContinuousHint(
    completerIsVisible: boolean,
    changed: SourceChange
  ): Promise<boolean>;
}
