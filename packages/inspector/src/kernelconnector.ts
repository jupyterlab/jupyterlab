// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IClientSession } from '@jupyterlab/apputils';

import { DataConnector } from '@jupyterlab/coreutils';

import { KernelMessage } from '@jupyterlab/services';

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
   * @param options - The instatiation options for the kernel connector.
   */
  constructor(options: KernelConnector.IOptions) {
    super();
    this._session = options.session;
  }

  /**
   * Fetch inspection requests.
   *
   * @param request - The inspection request text and details.
   */
  fetch(
    request: InspectionHandler.IRequest
  ): Promise<InspectionHandler.IReply> {
    const kernel = this._session.kernel;

    if (!kernel) {
      return Promise.reject(new Error('Inspection fetch requires a kernel.'));
    }

    const contents: KernelMessage.IInspectRequest = {
      code: request.text,
      cursor_pos: request.offset,
      detail_level: 0
    };

    return kernel.requestInspect(contents).then(msg => {
      const response = msg.content;

      if (response.status !== 'ok' || !response.found) {
        throw new Error('Inspection fetch failed to return successfully.');
      }

      return { data: response.data, metadata: response.metadata };
    });
  }

  private _session: IClientSession;
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
     * The session used to make API requests to the kernel.
     */
    session: IClientSession;
  }
}
