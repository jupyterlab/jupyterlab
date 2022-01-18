import { CompletionHandler } from './handler';
import {IConnectorProxy} from './tokens'
export class ConnectorProxy implements IConnectorProxy {
  constructor(connectorMap: ConnectorProxy.IConnectorMap) {
    this._connectorMap = connectorMap;
  }

  public async fetch(
    request: CompletionHandler.IRequest
  ): Promise<Array<{[id:string]: CompletionHandler.ICompletionItemsReply}>> {
    let promises: Promise<{[id:string]: CompletionHandler.ICompletionItemsReply}>[] = [];
    for (const [id, connector] of this._connectorMap.entries()) {
      let promise = connector
        .fetch(request)
        .then(reply => ({[id]: reply }));
      promises.push(promise.catch(p => p));
    }
    const combinedPromise = Promise.all(promises);
    return combinedPromise;
  }

  private _connectorMap: ConnectorProxy.IConnectorMap;
}

export namespace ConnectorProxy {
  export type IConnectorMap = Map<
    string,
    CompletionHandler.ICompletionItemsConnector
  >;
}
