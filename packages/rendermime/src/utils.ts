/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

/**
 * Convert a base64 encoded string to a Blob.
 *
 * @param base64 - The base64 encoded string.
 * @param mime - The MIME type of the data.
 * @returns A Blob object representing the data.
 */
export function b64toBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const len = binary.length;
  const buffer = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return new Blob([buffer], { type: mime });
}
