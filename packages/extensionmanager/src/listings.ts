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
   * A collection of URIs for black listings.
   */
  blacklistUris: string[];

  /**
   * A collection of URIs for white listings.
   */
  whitelistUris: string[];

  /**
   * A collection of back listed extensions.
   */
  blacklist: string[];

  /**
   * A collection of white listed extensions.
   */
  whitelist: string[];
}

export interface IListingApi {
  blacklist_uris: string[];
  whitelist_uris: string[];
  blacklist: string[];
  whitelist: string[];
}

/**
 * An object for getting listings from URIs.
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
        this._listings = {
          blacklistUris: data.blacklist_uris,
          whitelistUris: data.whitelist_uris,
          blacklist: data.blacklist,
          whitelist: data.whitelist
        };
        this._listingsLoaded.emit(this._listings);
      })
      .catch(error => {
        console.error(error);
      });
  }

  get listingsLoaded(): ISignal<this, IListResult> {
    return this._listingsLoaded;
  }

  /**
   * Get the black list.
   *
   * @param page The page of results to fetch.
   * @param pageination The pagination size to use. See registry API documentation for acceptable values.
  getBlackList(): Promise<IListResult> {
    const uri = new URL(this.blackListUri[0]);
    return fetch(uri.toString()).then((response: Response) => {
      if (response.ok) {
        return response.json();
      }
      return [];
    });
  }
   */

  /**
   * Get the white list.
   *
   * @param page The page of results to fetch.
   * @param pageination The pagination size to use. See registry API documentation for acceptable values.
  getWhiteList(): Promise<IListResult> {
    const uri = new URL(this.whiteListUris[0]);
    return fetch(uri.toString()).then((response: Response) => {
      if (response.ok) {
        return response.json();
      }
      return [];
    });
  }
   */

  private _listings: IListResult = {
    blacklistUris: [],
    whitelistUris: [],
    blacklist: [],
    whitelist: []
  };

  /**
   */
  private _listingsLoaded = new Signal<this, IListResult>(this);
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
