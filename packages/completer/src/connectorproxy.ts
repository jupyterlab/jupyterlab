import { IObservableString } from '@jupyterlab/observables';
import { CompletionHandler } from './handler';
import {
  ICompletionContext,
  ICompletionProvider,
  IConnectorProxy
} from './tokens';
import { Completer } from './widget';

/**
 * The connector which is used to fetch responses from multiple providers.
 */
export class ConnectorProxy implements IConnectorProxy {
  /**
   * Creates an instance of ConnectorProxy. The `context` and `timeout` parameter
   * is stored and will be used in the `fetch` method of provider.
   */
  constructor(
    completerContext: ICompletionContext,
    providers: Array<ICompletionProvider>,
    timeout: number
  ) {
    this._providers = providers;
    this._context = completerContext;
    this._timeout = timeout;
  }

  /**
   * Fetch response from multiple providers, If a provider can not return
   * the response for a completer request before timeout,
   * the result of this provider will be ignore.
   *
   * @param {CompletionHandler.IRequest} request - The completion request.
   */
  public async fetch(
    request: CompletionHandler.IRequest
  ): Promise<Array<CompletionHandler.ICompletionItemsReply | null>> {
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
    return combinedPromise;
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
    changed: IObservableString.IChangedArgs
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
    changed: IObservableString.IChangedArgs
  ): boolean {
    return (
      !completerIsVisible &&
      changed.type !== 'remove' &&
      changed.value.trim().length > 0
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

export namespace ConnectorProxy {
  export type IConnectorMap = Map<
    string,
    CompletionHandler.ICompletionItemsConnector
  >;
}
