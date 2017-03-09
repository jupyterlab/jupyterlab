// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from '@phosphor/coreutils';

import * as posix
 from 'path-posix';

import * as url
  from 'url';


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
   * @param parseQueryString - If `true`, the query property will always be set
   *   to an object returned by the `querystring` module's `parse()` method.
   *   If `false`, the `query` property on the returned URL object will be an
   *   unparsed, undecoded string. Defaults to `false`.
   *
   * @param slashedDenoteHost - If `true`, the first token after the literal
   *   string `//` and preceeding the next `/` will be interpreted as the
   *   `host`.
   *   For instance, given `//foo/bar`, the result would be
   *   `{host: 'foo', pathname: '/bar'}` rather than `{pathname: '//foo/bar'}`.
   *   Defaults to `false`.
   *
   * @returns A URL object.
   */
  export
  function parse(urlStr: string, parseQueryString?: boolean, slashesDenoteHost?: boolean): IUrl {
    return url.parse(urlStr, parseQueryString, slashesDenoteHost);
  }

  /**
   * Resolve a target URL relative to a base URL in a manner similar to that
   * of a Web browser resolving an anchor tag HRE
   *
   * @param from - The Base URL being resolved against.
   *
   * @param to - The HREF URL being resolved
   *
   * @returns the resolved url.
   */
  export
  function resolve(from: string, to: string): string {
    return url.resolve(from, to);
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
     * Whether two ASCII forward-slash characters (/) are required
     * following the colon in the protocol.
     */
    slashes?: boolean;

    /**
     * The full lower-cased host portion of the URL, including the port if
     * specified.
     */
    host?: string;

    /**
     * The username and password portion of the URL.
     */
    auth?: string;

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
     * The the entire "query string" portion of the URL, including the
     * leading ASCII question mark `(?)` character.
     */
    search?: string;

    /**
     * Aaconcatenation of the pathname and search components.
     */
    path?: string;

    /**
     * Either the query string without the leading ASCII question mark
     * `(?)`, or an object returned by the `parse()` method when
     * `parseQuestyString` is `true`.
     */
    query?: string | any;

    /**
     * The "fragment" portion of the URL including the leading ASCII hash
     * `(#)` character
     */
    hash?: string;
  }
}
