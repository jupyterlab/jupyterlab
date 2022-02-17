// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';
import { Token } from '@lumino/coreutils';
import { CompletionHandler } from './handler';
import { Session } from '@jupyterlab/services';
import { Completer } from './widget';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { CodeConsole } from '@jupyterlab/console';

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
   * Given an incomplete (unresolved) completion item, resolve it by adding all missing details,
   * such as lazy-fetched documentation.
   *
   * @param completion - the completion item to resolve
   */
  resolve?(completion: T, context: ICompletionContext): Promise<T>;
}

/**
 * The exported token used to register new provider.
 */
export const ICompletionProviderManager = new Token<ICompletionProviderManager>(
  '@jupyterlab/completer:ICompletionProviderManager'
);

export interface ICompletionProviderManager {
  registerProvider(provider: ICompletionProvider): void;
  setTimeout(timeout: number): void;
}

export interface IConnectorProxy {
  fetch(
    request: CompletionHandler.IRequest
  ): Promise<Array<CompletionHandler.ICompletionItemsReply | null>>;
}
