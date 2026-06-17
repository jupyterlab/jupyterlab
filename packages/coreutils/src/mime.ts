/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import mimeDb from 'mime-db';

/**
 * Utilities for working with MIME types
 */

/**
 * Get the preferred file extension for a given MIME type.
 *
 * @param mimeType - The MIME type (e.g., 'image/png', 'audio/mpeg')
 * @returns The file extension without a dot (e.g., 'png', 'mp3'), or 'bin' if unknown
 *
 * #### Notes
 * Uses the mime-db package to look up extensions for MIME types.
 * Returns the first extension if multiple are available.
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const entry = mimeDb[mimeType];
  if (entry && entry.extensions && entry.extensions.length > 0) {
    return entry.extensions[0];
  }
  return 'bin';
}

/**
 * Get a base filename for a given MIME type.
 *
 * @param mimeType - The MIME type (e.g., 'image/png', 'audio/mpeg')
 * @returns A base name like 'image', 'audio', 'video', or 'file'
 */
export function getBaseNameFromMimeType(mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    return 'image';
  } else if (mimeType.startsWith('audio/')) {
    return 'audio';
  } else if (mimeType.startsWith('video/')) {
    return 'video';
  }
  return 'file';
}
