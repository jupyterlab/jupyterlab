// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Most of the implementation below is adapted from the following repository:
// https://github.com/garycourt/murmurhash-js/blob/master/murmurhash2_gc.js
// Which has the following MIT License:
//
// Copyright (c) 2011 Gary Court
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
// to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
// and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
//  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// The implementation below uses case fallthrough as part of the algorithm.
/* eslint-disable no-fallthrough */

const m = 0x5bd1e995;
const encoder = new TextEncoder();

/**
 * Calculate the murmurhash2 for a given string and seed.
 *
 * @param str The string to calculate the Murmur2 hash for.
 * @param seed The seed.
 *
 * @returns The Murmurhash2 hash.
 */
export function murmur2(str: string, seed: number): number {
  const data = encoder.encode(str);
  let len = data.length;
  let h = seed ^ len;
  let i = 0;

  while (len >= 4) {
    let k =
      (data[i] & 0xff) |
      ((data[++i] & 0xff) << 8) |
      ((data[++i] & 0xff) << 16) |
      ((data[++i] & 0xff) << 24);

    k = (k & 0xffff) * m + ((((k >>> 16) * m) & 0xffff) << 16);
    k ^= k >>> 24;
    k = (k & 0xffff) * m + ((((k >>> 16) * m) & 0xffff) << 16);

    h = ((h & 0xffff) * m + ((((h >>> 16) * m) & 0xffff) << 16)) ^ k;

    len -= 4;
    ++i;
  }

  switch (len) {
    case 3:
      h ^= (data[i + 2] & 0xff) << 16;
    case 2:
      h ^= (data[i + 1] & 0xff) << 8;
    case 1:
      h ^= data[i] & 0xff;
      h = (h & 0xffff) * m + ((((h >>> 16) * m) & 0xffff) << 16);
  }

  h ^= h >>> 13;
  h = (h & 0xffff) * m + ((((h >>> 16) * m) & 0xffff) << 16);
  h ^= h >>> 15;

  return h >>> 0;
}
