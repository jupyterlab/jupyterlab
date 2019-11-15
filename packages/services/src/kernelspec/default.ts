// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { KernelSpec } from './kernelspec';
import { ServerConnection } from '../serverconnection';
import { URLExt } from '@jupyterlab/coreutils';
import { validateSpecModels } from './validate';

/**
 * The url for the kernelspec service.
 */
const KERNELSPEC_SERVICE_URL = 'api/kernelspecs';

export namespace DefaultKernelSpec {
  /**
   * Fetch all of the kernel specs.
   *
   * @param settings - The optional server settings.
   * @param useCache - Whether to use the cache. If false, always request.
   *
   * @returns A promise that resolves with the kernel specs.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernelspecs).
   */
  export function getSpecs(
    settings: ServerConnection.ISettings = ServerConnection.makeSettings(),
    useCache = true
  ): Promise<KernelSpec.ISpecModels> {
    if (useCache && Private.specs[settings.baseUrl]) {
      return Private.specs[settings.baseUrl];
    }

    let url = URLExt.join(settings.baseUrl, KERNELSPEC_SERVICE_URL);
    let promise = Private.requestSpecs(url, settings);
    Private.specs[settings.baseUrl] = promise;
    return promise;
  }
}

namespace Private {
  /**
   * A module private store of kernel specs by base url.
   */
  export const specs: {
    [key: string]: Promise<KernelSpec.ISpecModels>;
  } = Object.create(null);

  /**
   * Fetch all of the kernel specs.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernelspecs).
   */

  export async function requestSpecs(
    url: string,
    settings: ServerConnection.ISettings
  ): Promise<KernelSpec.ISpecModels> {
    const response = await ServerConnection.makeRequest(url, {}, settings);
    if (response.status !== 200) {
      throw new ServerConnection.ResponseError(response);
    }
    const data = await response.json();
    return validateSpecModels(data);
  }
}
