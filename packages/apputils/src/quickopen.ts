// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import {
  IQuickOpenOptions,
  IQuickOpenProvider,
  IQuickOpenResponse
} from './tokens';

/**
 * Default implementation of the quick open provider that uses the server endpoint.
 */
export class DefaultQuickOpenProvider implements IQuickOpenProvider {
  /**
   * Fetch contents from the server endpoint.
   */
  async fetchContents(options: IQuickOpenOptions): Promise<IQuickOpenResponse> {
    const { path, excludes, depth } = options;
    const queryParams = excludes.map(
      exclude => 'excludes=' + encodeURIComponent(exclude)
    );

    if (depth !== undefined && depth !== Infinity) {
      queryParams.push('depth=' + depth);
    }

    const query = queryParams.join('&');

    const settings = ServerConnection.makeSettings();
    const fullUrl =
      URLExt.join(settings.baseUrl, 'lab', 'api', 'files') +
      '?' +
      query +
      '&path=' +
      encodeURIComponent(path);
    const response = await ServerConnection.makeRequest(
      fullUrl,
      { method: 'GET' },
      settings
    );
    if (response.status !== 200) {
      throw new ServerConnection.ResponseError(response);
    }
    return await response.json();
  }
}
