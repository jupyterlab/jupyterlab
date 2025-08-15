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

/**
 * Calculates the size of a Base64-encoded media string in megabytes.
 *
 * @param base64 - The base64 encoded string.
 * @returns The size in MB.
 */
export function mediaSizeMB(base64: string): number {
  const sizeInBytes =
    base64.length * (3 / 4) -
    (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
  return sizeInBytes / (1024 * 1024);
}
