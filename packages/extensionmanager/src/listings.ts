// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';

import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

/** *
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
 * Listing search result type.
 *
 * - The mode for the listings, can be black or white.
 * - A collection of URIs for black or white listings, depending
 * on the mode.
 * - A collection of black or white listed extensions, depending
 * on the mode.
 *
 */
export type ListResult = null | {
  mode: 'white' | 'black' | 'default' | 'invalid';
  uris: string[];
  entries: IListEntry[];
};

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
        this._listings = {
          mode: 'default',
          uris: [],
          entries: []
        };
        if (data.blacklist_uris.length > 0 && data.whitelist_uris.length > 0) {
          console.warn('Simultaneous black and white list are not allowed.');
          this._listings = {
            mode: 'invalid',
            uris: [],
            entries: []
          };
        } else if (
          data.blacklist_uris.length > 0 ||
          data.whitelist_uris.length > 0
        ) {
          this._listings = {
            mode: data.blacklist_uris.length > 0 ? 'black' : 'white',
            uris:
              data.blacklist_uris.length > 0
                ? data.blacklist_uris
                : data.whitelist_uris,
            entries:
              data.blacklist_uris.length > 0 ? data.blacklist : data.whitelist
          };
        }
        this._listingsLoaded.emit(this._listings);
      })
      .catch(error => {
        console.error(error);
      });
  }

  get listingsLoaded(): ISignal<this, ListResult> {
    return this._listingsLoaded;
  }

  private _listings: ListResult = null;

  /**
   */
  private _listingsLoaded = new Signal<this, ListResult>(this);
}

/**
 * Call the listings API REST handler.
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
