// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';
import { Token } from '@lumino/coreutils';
import { CompletionHandler } from './handler';
import { Session } from '@jupyterlab/services';
import { Completer } from './widget';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { CodeConsole } from '@jupyterlab/console';
import { IObservableString } from '@jupyterlab/observables';
import { ConsolePanel } from '@jupyterlab/console';
import { NotebookPanel } from '@jupyterlab/notebook';
import { FileEditor } from '@jupyterlab/fileeditor';

export namespace CompleterCommandIDs {
  export const invoke = 'completer:invoke';

  export const invokeConsole = 'completer:invoke-console';

  export const invokeNotebook = 'completer:invoke-notebook';

  export const invokeFile = 'completer:invoke-file';

  export const select = 'completer:select';

  export const selectConsole = 'completer:select-console';

  export const selectNotebook = 'completer:select-notebook';

  export const selectFile = 'completer:select-file';
}

/**
 * The context which will be passed to the `fetch` function
 * of a provider.
 */
export interface ICompletionContext {
  /**
   * The widget (notebook, console, code editor) which invoked
   * the completer
   */
  widget?: IDocumentWidget | CodeConsole;

  /**
   * The current editor.
   */
  editor?: CodeEditor.IEditor | null;

  /**
   * The session extracted from widget for convenience.
   */
  session?: Session.ISessionConnection | null;
}

/**
 * The interface to implement a completer provider.
 */
export interface ICompletionProvider<
  T extends CompletionHandler.ICompletionItem = CompletionHandler.ICompletionItem
> {
  /**
   * Unique identifier of the provider
   */
  readonly identifier: string;

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
   */
  fetch(
    request: CompletionHandler.IRequest,
    context: ICompletionContext
  ): Promise<CompletionHandler.ICompletionItemsReply<T>>;

  /**
   * Renderer for provider's completions (optional).
   */
  readonly renderer: Completer.IRenderer | null | undefined;

  /**
   * Given an incomplete (unresolved) completion item, resolve it by adding
   * all missing details, such as lazy-fetched documentation.
   *
   * @param completion - the completion item to resolve
   * @param context - The context of the completer
   * @param path - The text which will be injected if the completion item is
   * selected.
   */
  resolve?(
    completionItem: T,
    context: ICompletionContext,
    patch?: Completer.IPatch | null
  ): Promise<T>;

  /**
   * If users enable `continuousHinting` in setting, this method is
   * called on text changed event of `CodeMirror` to check if the
   * completion items should be shown.
   *
   * @param  completerIsVisible - Current visibility status of the
   *  completer widget0
   * @param  changed - changed text.
   */
  shouldShowContinuousHint?(
    completerIsVisible: boolean,
    changed: IObservableString.IChangedArgs
  ): boolean;
}

/**
 * The exported token used to register new provider.
 */
export const ICompletionProviderManager = new Token<ICompletionProviderManager>(
  '@jupyterlab/completer:ICompletionProviderManager'
);

export interface ICompletionProviderManager {
  /**
   * Register a completer provider with the manager.
   *
   * @param {ICompletionProvider} provider - the provider to be registered.
   */
  registerProvider(provider: ICompletionProvider): void;

  /**
   * Activate completer providers for a notebook.
   */
  attachNotebookPanel(panel: NotebookPanel): Promise<void>;

  /**
   * Activate completer providers for a code editor.
   */
  attachEditor(
    widget: IDocumentWidget<FileEditor>,
    sessionManager: Session.IManager
  ): Promise<void>;

  /**
   * Activate completer providers for a console panel.
   */
  attachConsole(consolePanel: ConsolePanel): Promise<void>;

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
}

export interface IConnectorProxy {
  /**
   * Fetch response from multiple providers, If a provider can not return
   * the response for a completer request before timeout,
   * the result of this provider will be ignore.
   *
   * @param {CompletionHandler.IRequest} request - The completion request.
   */
  fetch(
    request: CompletionHandler.IRequest
  ): Promise<Array<CompletionHandler.ICompletionItemsReply | null>>;

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
    changed: IObservableString.IChangedArgs
  ): boolean;
}
