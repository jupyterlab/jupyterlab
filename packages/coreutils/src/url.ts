// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { PartialJSONObject } from '@lumino/coreutils';
import { posix } from 'path';
import urlparse from 'url-parse';

/**
 * The namespace for URL-related functions.
 */
export namespace URLExt {
  /**
   * Parse a url into a URL object.
   *
   * @param url - The URL string to parse.
   *
   * @returns A URL object.
   */
  export function parse(url: string): IUrl {
    if (typeof document !== 'undefined' && document) {
      const a = document.createElement('a');
      a.href = url;
      return a;
    }
    return urlparse(url);
  }

  /**
   * Parse URL and retrieve hostname
   *
   * @param url - The URL string to parse
   *
   * @returns a hostname string value
   */
  export function getHostName(url: string): string {
    return urlparse(url).hostname;
  }
  /**
   * Normalize a url.
   */
  export function normalize(url: string): string;
  export function normalize(url: undefined): undefined;
  export function normalize(url: string | undefined): string | undefined;
  export function normalize(url: string | undefined): string | undefined {
    return url && parse(url).toString();
  }

  /**
   * Join a sequence of url components and normalizes as in node `path.join`.
   *
   * @param parts - The url components.
   *
   * @returns the joined url.
   */
  export function join(...parts: string[]): string {
    let u = urlparse(parts[0], {});
    // Schema-less URL can be only parsed as relative to a base URL
    // see https://github.com/unshiftio/url-parse/issues/219#issuecomment-1002219326
    const isSchemaLess = u.protocol === '' && u.slashes;
    if (isSchemaLess) {
      u = urlparse(parts[0], 'https:' + parts[0]);
    }
    const prefix = `${isSchemaLess ? '' : u.protocol}${u.slashes ? '//' : ''}${
      u.auth
    }${u.auth ? '@' : ''}${u.host}`;
    // If there was a prefix, then the first path must start at the root.
    const path = posix.join(
      `${!!prefix && u.pathname[0] !== '/' ? '/' : ''}${u.pathname}`,
      ...parts.slice(1)
    );
    return `${prefix}${path === '.' ? '' : path}`;
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
  export function encodeParts(url: string): string {
    return join(...url.split('/').map(encodeURIComponent));
  }

  /**
   * Return a serialized object string suitable for a query.
   *
   * @param value The source object.
   *
   * @returns an encoded url query.
   *
   * #### Notes
   * Modified version of [stackoverflow](http://stackoverflow.com/a/30707423).
   */
  export function objectToQueryString(value: PartialJSONObject): string {
    const keys = Object.keys(value).filter(key => key.length > 0);

    if (!keys.length) {
      return '';
    }

    return (
      '?' +
      keys
        .map(key => {
          const content = encodeURIComponent(String(value[key]));

          return key + (content ? '=' + content : '');
        })
        .join('&')
    );
  }

  /**
   * Return a parsed object that represents the values in a query string.
   */
  export function queryStringToObject(value: string): {
    [key: string]: string | undefined;
  } {
    return value
      .replace(/^\?/, '')
      .split('&')
      .reduce(
        (acc, val) => {
          const [key, value] = val.split('=');

          if (key.length > 0) {
            acc[key] = decodeURIComponent(value || '');
          }

          return acc;
        },
        {} as { [key: string]: string }
      );
  }

  /**
   * Test whether the url is a local url.
   *
   * @param allowRoot - Whether the paths starting at Unix-style filesystem root (`/`) are permitted.
   *
   * #### Notes
   * This function returns `false` for any fully qualified url, including
   * `data:`, `file:`, and `//` protocol URLs.
   */
  export function isLocal(url: string, allowRoot: boolean = false): boolean {
    const { protocol } = parse(url);

    return (
      (!protocol || url.toLowerCase().indexOf(protocol) !== 0) &&
      (allowRoot ? url.indexOf('//') !== 0 : url.indexOf('/') !== 0)
    );
  }

  /**
   * Parse a data URI into its components.
   *
   * @param dataURI - The data URI to parse (e.g., "data:image/png;base64,iVBORw0KG...")
   *
   * @returns Parsed components or null if invalid
   *
   * #### Notes
   * This function parses data URIs according to RFC 2397 and the WHATWG specification.
   * Format: data:[<mediatype>][;base64],<data>
   * Default MIME type is "text/plain;charset=US-ASCII" per the specification.
   */
  export function parseDataURI(dataURI: string): {
    mimeType: string;
    isBase64: boolean;
    data: string;
  } | null {
    try {
      // Verify it has the data: protocol
      if (!dataURI.startsWith('data:')) {
        return null;
      }

      // Find the comma that separates metadata from data
      const commaIndex = dataURI.indexOf(',');
      if (commaIndex === -1) {
        return null;
      }

      // Extract metadata (everything between 'data:' and ',')
      const metadata = dataURI.slice(5, commaIndex);
      const data = dataURI.slice(commaIndex + 1);

      // Check if data is base64-encoded
      const isBase64 = metadata.endsWith(';base64');

      // Extract MIME type (remove ;base64 suffix if present)
      let mimeType = isBase64 ? metadata.slice(0, -7) : metadata;

      // Default MIME type per RFC 2397
      if (!mimeType) {
        mimeType = 'text/plain;charset=US-ASCII';
      }

      return { mimeType, isBase64, data };
    } catch (error) {
      console.error('Error parsing data URI:', error);
      return null;
    }
  }

  /**
   * Convert a data URI to a Blob.
   *
   * @param dataURI - The data URI to convert (e.g., "data:image/png;base64,iVBORw0KG...")
   *
   * @returns A Blob object or null if conversion fails
   *
   * #### Notes
   * This function handles both base64-encoded and percent-encoded data URIs.
   * - Base64 data: Uses modern Uint8Array.fromBase64() if available, falls back to atob()
   * - Non-base64 data: Percent-decoded (reserved characters per RFC 3986)
   * - For binary data like images, base64 encoding is required
   */
  export function dataURItoBlob(dataURI: string): Blob | null {
    try {
      const parsed = parseDataURI(dataURI);
      if (!parsed) {
        return null;
      }

      const { mimeType, isBase64, data } = parsed;

      if (isBase64) {
        // Use modern Uint8Array.fromBase64() if available (baseline 2025)
        // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/fromBase64
        // Typescript 5.5 does not recognize fromBase64, so we cast to any
        if (typeof (Uint8Array as any).fromBase64 === 'function') {
          try {
            const array = (Uint8Array as any).fromBase64(data);
            return new Blob([array], { type: mimeType });
          } catch (e) {
            // Fall through to legacy method if modern API fails
          }
        }

        // Legacy fallback using atob() for older browsers
        // TODO: use core-js or another polyfill?
        const byteString = atob(data);
        const array = new Uint8Array(byteString.length);

        for (let i = 0; i < byteString.length; i++) {
          array[i] = byteString.charCodeAt(i);
        }

        return new Blob([array], { type: mimeType });
      } else {
        // Percent-decode the data (reserved characters are percent-encoded per RFC 3986)
        const decoded = decodeURIComponent(data);
        return new Blob([decoded], { type: mimeType });
      }
    } catch (error) {
      console.error('Error converting data URI to Blob:', error);
      return null;
    }
  }

  /**
   * The interface for a URL object
   */
  export interface IUrl {
    /**
     * The full URL string that was parsed with both the protocol and host
     * components converted to lower-case.
     */
    href: string;

    /**
     * Identifies the URL's lower-cased protocol scheme.
     */
    protocol: string;

    /**
     * The full lower-cased host portion of the URL, including the port if
     * specified.
     */
    host: string;

    /**
     * The lower-cased host name portion of the host component without the
     * port included.
     */
    hostname: string;

    /**
     * The numeric port portion of the host component.
     */
    port: string;

    /**
     * The entire path section of the URL.
     */
    pathname: string;

    /**
     * The "fragment" portion of the URL including the leading ASCII hash
     * `(#)` character
     */
    hash: string;

    /**
     * The search element, including leading question mark (`'?'`), if any,
     * of the URL.
     */
    search?: string;
  }
}
