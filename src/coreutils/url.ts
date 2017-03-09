// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from '@phosphor/coreutils';

import * as posix
 from 'path-posix';


/**
 * The namespace for URL-related functions.
 */
export
namespace URLExt {
  /**
   * Parse a url into a URL object.
   *
   * @param urlString - The URL string to parse.
   *
   * @returns A URL object.
   */
  export
  function parse(url: string): IUrl {
    if (typeof document !== 'undefined') {
      let a = document.createElement('a');
      return a;
    }
    throw Error('Cannot parse a URL without a document object');
  }

  /**
   * Resolve a target URL relative to a base URL.
   *
   * @param from - The Base URL being resolved against.
   *
   * @param to - The HREF URL being resolved
   *
   * @returns the resolved url.
   */
  export
  function resolve(from: string, to: string): string {
    return posix.resolve(from, to);
  }

  /**
   * Join a sequence of url components and normalizes as in node `path.join`.
   *
   * @param parts - The url components.
   *
   * @returns the joined url.
   */
  export
  function join(...parts: string[]): string {
    return posix.join(...parts);
  }

  /**
   * Encode the components of a multi-segment url.
   *
   * @param url - The url to encode.
   *
   * @returns the encoded url.
   *
   * #### Notes
   * Preserves the `'/'` separators.
   * Should not include the base url, since all parts are escaped.
   */
  export
  function encodeParts(url: string): string {
    // Normalize and join, split, encode, then join.
    url = join(url);
    let parts = url.split('/').map(encodeURIComponent);
    return join(...parts);
  }

  /**
   * Return a serialized object string suitable for a query.
   *
   * @param object - The source object.
   *
   * @returns an encoded url query.
   *
   * #### Notes
   * From [stackoverflow](http://stackoverflow.com/a/30707423).
   */
  export
  function objectToQueryString(value: JSONObject): string {
    return '?' + Object.keys(value).map(key =>
      encodeURIComponent(key) + '=' + encodeURIComponent(String(value[key]))
    ).join('&');
  }

  /**
   * Test whether the url is a local url.
   */
  export
  function isLocal(url: string): boolean {
    return !parse(url).protocol && url.indexOf('//') !== 0;
  }

  /**
   * The interface for a URL object
   */
  export interface IUrl {
    /**
     * The full URL string that was parsed with both the protocol and host
     * components converted to lower-case.
     */
    href?: string;

    /**
     * Identifies the URL's lower-cased protocol scheme.
     */
    protocol?: string;

    /**
     * The full lower-cased host portion of the URL, including the port if
     * specified.
     */
    host?: string;

    /**
     * The lower-cased host name portion of the host component without the
     * port included.
     */
    hostname?: string;

    /**
     * The numeric port portion of the host component.
     */
    port?: string;

    /**
     * The entire path section of the URL.
     */
    pathname?: string;

    /**
     * The "fragment" portion of the URL including the leading ASCII hash
     * `(#)` character
     */
    hash?: string;
  }
}
