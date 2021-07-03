// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISessionContext } from '@jupyterlab/apputils';
import { KernelMessage } from '@jupyterlab/services';
import { DataConnector } from '@jupyterlab/statedb';
import { InspectionHandler } from './handler';

/**
 * The default connector for making inspection requests from the Jupyter API.
 */
export class KernelConnector extends DataConnector<
  InspectionHandler.IReply,
  void,
  InspectionHandler.IRequest
> {
  /**
   * Create a new kernel connector for inspection requests.
   *
   * @param options - The instantiation options for the kernel connector.
   */
  constructor(options: KernelConnector.IOptions) {
    super();
    this._sessionContext = options.sessionContext;
  }

  /**
   * Fetch inspection requests.
   *
   * @param request - The inspection request text and details.
   */
  fetch(
    request: InspectionHandler.IRequest
  ): Promise<InspectionHandler.IReply> {
    const kernel = this._sessionContext.session?.kernel;

    if (!kernel) {
      return Promise.reject(new Error('Inspection fetch requires a kernel.'));
    }

    const contents: KernelMessage.IInspectRequestMsg['content'] = {
      code: request.text,
      cursor_pos: request.offset,
      detail_level: 1
    };

    return kernel.requestInspect(contents).then(msg => {
      const response = msg.content;

      if (response.status !== 'ok' || !response.found) {
        throw new Error('Inspection fetch failed to return successfully.');
      }

      return { data: response.data, metadata: response.metadata };
    });
  }

  private _sessionContext: ISessionContext;
}

/**
 * A namespace for kernel connector statics.
 */
export namespace KernelConnector {
  /**
   * The instantiation options for an inspection handler.
   */
  export interface IOptions {
    /**
     * The session context used to make API requests to the kernel.
     */
    sessionContext: ISessionContext;
  }
}
