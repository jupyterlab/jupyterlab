// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IClientSession } from '@jupyterlab/apputils';

import { DataConnector } from '@jupyterlab/coreutils';

import { KernelMessage, Session } from '@jupyterlab/services';

import { CompletionHandler } from './handler';

/**
 * A kernel connector for completion handlers.
 */
export class KernelConnector extends DataConnector<
  CompletionHandler.IReply,
  void,
  CompletionHandler.IRequest
> {
  /**
   * Create a new kernel connector for completion requests.
   *
   * @param options - The instatiation options for the kernel connector.
   */
  constructor(options: KernelConnector.IOptions) {
    super();
    this._session = options.session;
  }

  /**
   * Fetch completion requests.
   *
   * @param request - The completion request text and details.
   */
  fetch(
    request: CompletionHandler.IRequest
  ): Promise<CompletionHandler.IReply> {
    const kernel = this._session.kernel;

    if (!kernel) {
      return Promise.reject(new Error('No kernel for completion request.'));
    }

    const contents: KernelMessage.ICompleteRequest = {
      code: request.text,
      cursor_pos: request.offset
    };

    return kernel.requestComplete(contents).then(msg => {
      const response = msg.content;

      if (response.status !== 'ok') {
        throw new Error('Completion fetch failed to return successfully.');
      }

      return {
        start: response.cursor_start,
        end: response.cursor_end,
        matches: response.matches,
        metadata: response.metadata
      };
    });
  }

  private _session: IClientSession | Session.ISession;
}

/**
 * A namespace for kernel connector statics.
 */
export namespace KernelConnector {
  /**
   * The instantiation options for cell completion handlers.
   */
  export interface IOptions {
    /**
     * The session used by the kernel connector.
     */
    session: IClientSession | Session.ISession;
  }
}
