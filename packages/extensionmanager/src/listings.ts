// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';

import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

/**
 * Listing search result structure (subset).
 *
 */
export interface IListResult {
  /**
   * A collection of back listed extensions.
   */
  blacklist: string[];

  /**
   * A collection of white listed extensions.
   */
  whitelist: string[];

  /**
   * Timestamp of the search result creation.
   */
  time: string;
}

export interface IListingApi {
  listings: {
    blacklist_uri: string;
    whitelist_uri: string;
    builtin_blacklist: string[];
    builtin_whitelist: string[];
  };
}

/**
 * An object for searching an List registry.
 *
 */
export class Lister {
  /**
   * Create a Lister object.
   */
  constructor() {
    requestAPI<IListingApi>(
      '@jupyterlab/extensionmanager-extension/listings.json'
    )
      .then(data => {
        this.blackListUri = data.listings.blacklist_uri;
        this.whiteListUri = data.listings.whitelist_uri;
        this._listingUrisLoaded.emit(void 0);
      })
      .catch(error => {
        console.error(error);
      });
  }

  get listingUrisLoaded(): ISignal<Lister, void> {
    return this._listingUrisLoaded;
  }

  /**
   * Get the black list.
   *
   * @param page The page of results to fetch.
   * @param pageination The pagination size to use. See registry API documentation for acceptable values.
   */
  getBlackList(): Promise<IListResult> {
    const uri = new URL(this.blackListUri);
    return fetch(uri.toString()).then((response: Response) => {
      if (response.ok) {
        return response.json();
      }
      return [];
    });
  }

  /**
   * Get the white list.
   *
   * @param page The page of results to fetch.
   * @param pageination The pagination size to use. See registry API documentation for acceptable values.
   */
  getWhiteList(): Promise<IListResult> {
    const uri = new URL(this.whiteListUri);
    return fetch(uri.toString()).then((response: Response) => {
      if (response.ok) {
        return response.json();
      }
      return [];
    });
  }

  /**
   * The URI of the black listing registry to use.
   */
  private blackListUri: string;

  /**
   * The URI of the white listing registry to use.
   */
  private whiteListUri: string;

  /**
   */
  private _listingUrisLoaded = new Signal<Lister, void>(this);
}

/**
 * Call the API extension
 *
 * @param endPoint API REST end point for the extension
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
async function requestAPI<T>(
  endPoint: string = '',
  init: RequestInit = {}
): Promise<T> {
  // Make request to Jupyter API
  const settings = ServerConnection.makeSettings();
  const requestUrl = URLExt.join(
    settings.baseUrl,
    settings.appUrl,
    'api/listings/',
    endPoint
  );
  let response: Response;
  try {
    response = await ServerConnection.makeRequest(requestUrl, init, settings);
  } catch (error) {
    throw new ServerConnection.NetworkError(error);
  }
  const data = await response.json();
  if (!response.ok) {
    throw new ServerConnection.ResponseError(response, data.message);
  }
  return data;
}
