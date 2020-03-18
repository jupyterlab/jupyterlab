// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';

import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

/***
 * Information about a listed entry.
 */
export interface IListEntry {
  /**
   * The name of the extension.
   */
  name: string;
  regexp: RegExp | undefined;
  type: string | undefined;
  reason: string | undefined;
  creation_date: string | undefined;
  last_update_date: string | undefined;
}

/**
 * Listing search result structure (subset).
 *
 */
export interface IListResult {
  /**
   * The mode for the listings, can be black or white.
   */
  listMode: 'white' | 'black' | null;
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
  blacklist: IListEntry[];

  /**
   * A collection of white listed extensions.
   */
  whitelist: IListEntry[];
}

export interface IListingApi {
  blacklist_uris: string[];
  whitelist_uris: string[];
  blacklist: IListEntry[];
  whitelist: IListEntry[];
}

/**
 * An object for getting listings from the server API.
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
        if (
          !(data.blacklist_uris.length > 0 && data.whitelist_uris.length > 0)
        ) {
          this._listings = {
            listMode: data.blacklist_uris.length > 0 ? 'black' : 'white',
            blacklistUris: data.blacklist_uris,
            whitelistUris: data.whitelist_uris,
            blacklist: data.blacklist,
            whitelist: data.whitelist
          };
        }
        this._listingsLoaded.emit(this._listings);
      })
      .catch(error => {
        console.error(error);
      });
  }

  get listingsLoaded(): ISignal<this, IListResult> {
    return this._listingsLoaded;
  }

  private _listings: IListResult = {
    listMode: null,
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
