// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

/**
 * The url for the translations service.
 */
const TRANSLATIONS_SETTINGS_URL = 'api/translations';

/**
 * Call the API extension
 *
 * @param locale API REST end point for the extension
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
export async function requestTranslationsAPI<T>(
  translationsUrl: string = '',
  locale = '',
  init: RequestInit = {},
  serverSettings: ServerConnection.ISettings | undefined = undefined
): Promise<T> {
  // Make request to Jupyter API
  const settings = serverSettings ?? ServerConnection.makeSettings();
  translationsUrl =
    translationsUrl || `${settings.appUrl}/${TRANSLATIONS_SETTINGS_URL}`;
  const translationsBase = URLExt.join(settings.baseUrl, translationsUrl);
  const requestUrl = URLExt.join(translationsBase, locale);
  if (!requestUrl.startsWith(translationsBase)) {
    throw new Error('Can only be used for translations requests');
  }
  let response: Response;
  try {
    response = await ServerConnection.makeRequest(requestUrl, init, settings);
  } catch (error) {
    throw new ServerConnection.NetworkError(error);
  }

  let data: any = await response.text();

  if (data.length > 0) {
    try {
      data = JSON.parse(data);
    } catch (error) {
      console.error('Not a JSON response body.', response);
    }
  }

  if (!response.ok) {
    throw new ServerConnection.ResponseError(response, data.message || data);
  }

  return data;
}
