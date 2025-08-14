// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';
import { IRenderMime } from '@jupyterlab/rendermime';
import { Session } from '@jupyterlab/services';
import { LabIcon } from '@jupyterlab/ui-components';
import { SourceChange } from '@jupyter/ydoc';
import { JSONValue, Token } from '@lumino/coreutils';
import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ISignal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import { CompletionHandler } from './handler';
import { Completer } from './widget';
import { InlineCompleter } from './inline';

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
   *
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
   * Describes how an inline completion provider was triggered.
   */
  triggerKind: InlineCompletionTriggerKind;

  /**
   * The session extracted from widget for convenience.
   */
  session?: Session.ISessionConnection | null;
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
 * A representation of an error that occurred in completion generation.
 * @alpha
 */
export interface IInlineCompletionError {
  /**
   * The optional message which may be shown in the user interface.
   */
  message?: string;
}

/**
 * An inline completion item represents a text snippet that is proposed inline
 * to complete text that is being typed.
 * @alpha
 */
export interface IInlineCompletionItem extends IInlineCompletionItemLSP {
  /**
   * Token passed to identify the completion when streaming updates.
   */
  token?: string;

  /**
   * Whether generation of `insertText` is still ongoing. If your provider supports streaming,
   * you can set this to true, which will result in the provider's `stream()` method being called
   * with `token` which has to be set for incomplete completions.
   */
  isIncomplete?: boolean;

  /**
   * This field is marked when an error occurs during a stream or fetch request.
   */
  error?: IInlineCompletionError;
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
 * The inline completion provider information used in widget rendering.
 */
export interface IInlineCompletionProviderInfo {
  /**
   * Name of the provider to be displayed in the user interface.
   */
  readonly name: string;

  /**
   * Unique identifier, cannot change on runtime.
   *
   * The identifier is also added on data attribute of ghost text widget,
   * allowing different providers to style the ghost text differently.
   */
  readonly identifier: string;

  /**
   * The icon representing the provider in the user interface.
   */
  readonly icon?: LabIcon.ILabIcon;

  /**
   * Settings schema contributed by provider for user customization.
   */
  readonly schema?: ISettingRegistry.IProperty;
}

/**
 * The interface extensions should implement to provide inline completions.
 */
export interface IInlineCompletionProvider<
  T extends IInlineCompletionItem = IInlineCompletionItem
> extends IInlineCompletionProviderInfo {
  /**
   * The method called when user requests inline completions.
   *
   * The implicit request (on typing) vs explicit invocation are distinguished
   * by the value of `triggerKind` in the provided `context`.
   */
  fetch(
    request: CompletionHandler.IRequest,
    context: IInlineCompletionContext
  ): Promise<IInlineCompletionList<T>>;

  /**
   * Optional method called when user changes settings.
   *
   * This is only called if `schema` for settings is present.
   */
  configure?(settings: { [property: string]: JSONValue }): void;

  /**
   * Optional method to stream remainder of the `insertText`.
   */
  stream?(token: string): AsyncGenerator<{ response: T }>;
}

/**
 * Inline completer factory
 */
export interface IInlineCompleterFactory {
  factory(options: IInlineCompleterFactory.IOptions): InlineCompleter;
}

/**
 * A namespace for inline completer factory statics.
 */
export namespace IInlineCompleterFactory {
  /**
   * The subset of inline completer widget initialization options provided to the factory.
   */
  export interface IOptions {
    /**
     * The semantic parent of the completer widget, its referent editor.
     */
    editor?: CodeEditor.IEditor | null;
    /**
     * The model for the completer widget.
     */
    model?: InlineCompleter.IModel;
  }
}

/**
 * Token allowing to override (or disable) inline completer widget factory.
 */
export const IInlineCompleterFactory = new Token<IInlineCompleterFactory>(
  '@jupyterlab/completer:IInlineCompleterFactory',
  'A factory of inline completer widgets.'
);

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
   * Set inline completer factory.
   */
  setInlineCompleterFactory(factory: IInlineCompleterFactory): void;

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

  /**
   * Signal emitted when a selection is made from a completer menu.
   */
  selected: ISignal<ICompletionProviderManager, ICompleterSelection>;

  /**
   * Inline completer actions.
   */
  inline?: IInlineCompleterActions;

  /**
   * Inline providers information.
   */
  inlineProviders?: IInlineCompletionProviderInfo[];
}

export interface ICompleterSelection {
  /**
   * The text selected by the completer.
   */
  insertText: string;
}

export interface IInlineCompleterActions {
  /**
   * Invoke inline completer.
   * @experimental
   *
   * @param id - the id of notebook panel, console panel or code editor.
   */
  invoke(id: string): void;

  /**
   * Switch to next or previous completion of inline completer.
   * @experimental
   *
   * @param id - the id of notebook panel, console panel or code editor.
   * @param direction - the cycling direction
   */
  cycle(id: string, direction: 'next' | 'previous'): void;

  /**
   * Accept active inline completion.
   * @experimental
   *
   * @param id - the id of notebook panel, console panel or code editor.
   */
  accept(id: string): void;

  /**
   * Check if the inline compelter is active (showing ghost text)
   * @experimental
   *
   * @param id - the id of notebook panel, console panel or code editor.
   */
  isActive(id: string): boolean;

  /**
   * Configure the inline completer.
   * @experimental
   *
   * @param settings - the new settings values.
   */
  configure(settings: IInlineCompleterSettings): void;
}

/**
 * Inline completer user-configurable settings.
 */
export interface IInlineCompleterSettings {
  /**
   * Whether to show the inline completer widget.
   */
  showWidget: 'always' | 'onHover' | 'never';
  /**
   * Whether to show shortcuts in the inline completer widget.
   */
  showShortcuts: boolean;
  /**
   * Transition effect used when streaming tokens from model.
   */
  streamingAnimation: 'none' | 'uncover';
  /**
   * Whether to suppress the inline completer when tab completer is active.
   */
  suppressIfTabCompleterActive: boolean;
  /**
   * Minimum lines to show.
   */
  minLines: number;
  /**
   * Maximum lines to show.
   */
  maxLines: number;
  /**
   * Delay between resizing the editor after an incline completion was cancelled.
   */
  editorResizeDelay: number;
  /*
   * Reserve space for the longest of the completions candidates.
   */
  reserveSpaceForLongest: boolean;
  /**
   * Provider settings.
   */
  providers: {
    [providerId: string]: {
      enabled: boolean;
      autoFillInMiddle: boolean;
      debouncerDelay: number;
      timeout: number;
      [property: string]: JSONValue;
    };
  };
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
   * Returns a list of promises to enable showing results from
   * the provider which resolved fastest, even if other providers
   * are still generating.
   * The result may be null if the request timed out.
   */
  fetchInline(
    request: CompletionHandler.IRequest,
    trigger?: InlineCompletionTriggerKind,
    isMiddleOfLine?: boolean
  ): Promise<IInlineCompletionList<CompletionHandler.IInlineItem> | null>[];

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
