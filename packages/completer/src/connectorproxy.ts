import { ICompletionContext, ICompletionProvider } from '.';
import { CompletionHandler } from './handler';
import { IConnectorProxy } from './tokens';

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
    let promises: Promise<CompletionHandler.ICompletionItemsReply | null>[] = [];
    for (const provider of this._providers) {
      let promise: Promise<CompletionHandler.ICompletionItemsReply | null>;
      promise = provider.fetch(request, this._context).then(reply => {
        const items = reply.items.map(el => ({
          ...el,
          provider: provider.identifier
        }));
        return { ...reply, items };
      });

      const timeoutPromise = new Promise<CompletionHandler.ICompletionItemsReply | null>(
        resolve => {
          return setTimeout(() => resolve(null), this._timeout);
        }
      );
      promise = Promise.race([promise, timeoutPromise]);
      promises.push(promise.catch(p => p));
    }
    const combinedPromise = Promise.all(promises);
    return combinedPromise;
  }

  private _providers: Array<ICompletionProvider>;
  private _context: ICompletionContext;
  private _timeout: number;
}

export namespace ConnectorProxy {
  export type IConnectorMap = Map<
    string,
    CompletionHandler.ICompletionItemsConnector
  >;
}
