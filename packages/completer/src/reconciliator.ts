// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { SourceChange } from '@jupyter-notebook/ydoc';
import { CompletionHandler } from './handler';
import {
  ICompletionContext,
  ICompletionProvider,
  IProviderReconciliator
} from './tokens';
import { Completer } from './widget';

/**
 * The connector which is used to fetch responses from multiple providers.
 */
export class ProviderReconciliator implements IProviderReconciliator {
  /**
   * Creates an instance of ProviderReconciliator.
   */
  constructor(options: ProviderReconciliator.IOptions) {
    this._providers = options.providers;
    this._context = options.completerContext;
    this._timeout = options.timeout;
  }

  /**
   * Fetch response from multiple providers, If a provider can not return
   * the response for a completer request before timeout,
   * the result of this provider will be ignored.
   *
   * @param {CompletionHandler.IRequest} request - The completion request.
   */
  public async fetch(
    request: CompletionHandler.IRequest
  ): Promise<CompletionHandler.ICompletionItemsReply | null> {
    const current = ++this._fetching;
    let promises: Promise<CompletionHandler.ICompletionItemsReply | null>[] =
      [];
    for (const provider of this._providers) {
      let promise: Promise<CompletionHandler.ICompletionItemsReply | null>;
      promise = provider.fetch(request, this._context).then(reply => {
        if (current !== this._fetching) {
          return Promise.reject(void 0);
        }
        const items = reply.items.map(el => ({
          ...el,
          resolve: this._resolveFactory(provider, el)
        }));
        return { ...reply, items };
      });

      const timeoutPromise =
        new Promise<CompletionHandler.ICompletionItemsReply | null>(resolve => {
          return setTimeout(() => resolve(null), this._timeout);
        });
      promise = Promise.race([promise, timeoutPromise]);
      promises.push(promise);
    }
    const combinedPromise = Promise.all(promises);
    return this._mergeCompletions(combinedPromise);
  }

  private async _mergeCompletions(
    promises: Promise<(CompletionHandler.ICompletionItemsReply | null)[]>
  ): Promise<CompletionHandler.ICompletionItemsReply | null> {
    const replies = await promises;
    let items: CompletionHandler.ICompletionItem[] = [];
    let start = 0;
    let end = 0;
    let skip = false;

    // TODO implement reconciliation
    for (const data of replies) {
      if (data) {
        items = items.concat(data.items);
        if (!skip) {
          start = data.start;
          end = data.end;
          skip = true;
        }
      }
    }
    return {
      start,
      end,
      items
    };
  }

  /**
   * Check if completer should make request to fetch completion responses
   * on user typing. If the provider with highest rank does not have
   * `shouldShowContinuousHint` method, a default one will be used.
   *
   * @param completerIsVisible - The visible status of completer widget.
   * @param changed - CodeMirror changed argument.
   */
  public shouldShowContinuousHint(
    completerIsVisible: boolean,
    changed: SourceChange
  ): boolean {
    if (this._providers[0].shouldShowContinuousHint) {
      return this._providers[0].shouldShowContinuousHint(
        completerIsVisible,
        changed
      );
    }
    return this._defaultShouldShowContinuousHint(completerIsVisible, changed);
  }

  private _defaultShouldShowContinuousHint(
    completerIsVisible: boolean,
    changed: SourceChange
  ): boolean {
    return (
      !completerIsVisible &&
      (changed.sourceChange == null ||
        changed.sourceChange.some(
          delta => delta.insert != null && delta.insert.length > 0
        ))
    );
  }

  private _resolveFactory = (
    provider: ICompletionProvider,
    el: CompletionHandler.ICompletionItem
  ) =>
    provider.resolve
      ? (patch?: Completer.IPatch) =>
          provider.resolve!(el, this._context, patch)
      : undefined;

  /**
   * List of available providers.
   */
  private _providers: Array<ICompletionProvider>;

  /**
   * Current completer context.
   */
  private _context: ICompletionContext;

  /**
   * Timeout for the fetch request.
   */
  private _timeout: number;

  /**
   * Counter to reject current provider response if a new fetch request is created.
   */
  private _fetching = 0;
}

export namespace ProviderReconciliator {
  export interface IOptions {
    /**
     * Completion context that will be used in the `fetch` method of provider.
     */
    completerContext: ICompletionContext;
    /**
     * List of completion providers, assumed to contain at least one provider.
     */
    providers: ICompletionProvider[];
    /**
     * How long should we wait for each of the providers to resolve `fetch` promise
     */
    timeout: number;
  }
}
