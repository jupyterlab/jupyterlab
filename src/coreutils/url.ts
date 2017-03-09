// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from '@phosphor/coreutils';


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
   * Join a sequence of url components and normalizes as in node `path.join`.
   *
   * @param parts - The url components.
   *
   * @returns the joined url.
   */
  export
  function join(...parts: string[]): string {
    let url = '';
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === '') {
        continue;
      }
      if (url.length > 0 && url[url.length - 1] !== '/') {
        url = url + '/' + parts[i];
      } else {
        url = url + parts[i];
      }
    }
    url = url.replace(/\/\/+/, '/');

    // Handle a protocol in the first part.
    if (parts[0] && parts[0].indexOf('//') !== -1) {
      url = url.replace('/', '//');
    }
    return url;
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
    return join(...uri.split('/').map(encodeURIComponent));
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


    /**
     * The search element, including leading question mark (`'?'`), if any,
     * of the URL.
     */
    search?: string;
  }
}
