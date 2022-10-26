/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { UserManager } from '@jupyterlab/services';
import { DocumentChange, YDocument } from '@jupyterlab/shared-models';
import { WebsocketProvider as YWebsocketProvider } from 'y-websocket';
import { IDocumentProvider, IDocumentProviderFactory } from './tokens';

/**
 * A class to provide Yjs synchronization over WebSocket.
 *
 * We specify custom messages that the server can interpret. For reference please look in yjs_ws_server.
 *
 */
export class WebSocketProvider
  extends YWebsocketProvider
  implements IDocumentProvider
{
  /**
   * Construct a new WebSocketProvider
   *
   * @param options The instantiation options for a WebSocketProvider
   */
  constructor(options: WebSocketProvider.IOptions) {
    super(options.url, options.path, options.model.ydoc, {
      awareness: options.model.awareness
    });

    const awareness = options.model.awareness;
    const user = options.user;
    const userChanged = () => {
      awareness.setLocalStateField('user', user.identity);
    };
    if (user.isReady) {
      userChanged();
    }
    user.ready.then(userChanged).catch(e => console.error(e));
    user.userChanged.connect(userChanged);
  }
}

/**
 * A namespace for WebSocketProvider statics.
 */
export namespace WebSocketProvider {
  /**
   * The instantiation options for a WebSocketProvider.
   */
  export interface IOptions
    extends IDocumentProviderFactory.IOptions<YDocument<DocumentChange>> {
    /**
     * The server URL
     */
    url: string;

    /**
     * The user data
     */
    user: UserManager.IManager;
  }
}
