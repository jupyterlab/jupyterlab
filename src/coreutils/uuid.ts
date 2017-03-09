// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * Get a random hex string (not a formal UUID).
 *
 * @param length - The length of the hex string.
 */
export
function uuid(length: number=32): string {
  let s = new Array<string>(length);
  let hexDigits = '0123456789abcdef';
  let nChars = hexDigits.length;
  for (let i = 0; i < length; i++) {
    s[i] = hexDigits.charAt(Math.floor(Math.random() * nChars));
  }
  return s.join('');
}
