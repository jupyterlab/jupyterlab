// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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

/**
 * An object for searching an List registry.
 *
 */
export class Lister {
  /**
   * Create a Lister object.
   *
   * @param blackListUri The URI of the list registry to use.
   * @param whiteListUri The URI of the CDN to use for fetching full package data.
   */
  constructor(
    blackListUri = 'http://localhost:8888/listings/blacklist.json',
    whiteListUri = 'http://localhost:8888/listings/whitelist.json'
  ) {
    this.blackListUri = blackListUri;
    this.whiteListUri = whiteListUri;
  }

  /**
   * Get the black list.
   *
   * @param page The page of results to fetch.
   * @param pageination The pagination size to use. See registry API documentation for acceptable values.
   */
  getBlackList(): Promise<IListResult> {
    const uri = new URL('', this.blackListUri);
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
    const uri = new URL('', this.whiteListUri);
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
  blackListUri: string;

  /**
   * The URI of the white listing registry to use.
   */
  whiteListUri: string;
}

/**
 *
 */
export function isWhiteListed(name: string): boolean {
  /**
   * A list of whitelisted NPM orgs.
   */
  const whitelist = ['jupyterlab', 'jupyter-widgets'];
  const parts = name.split('/');
  const first = parts[0];
  return (
    parts.length > 1 && // Has a first part
    !!first && // with a finite length
    first[0] === '@' && // corresponding to an org name
    whitelist.indexOf(first.slice(1)) !== -1 // in the org whitelist.
  );
}
