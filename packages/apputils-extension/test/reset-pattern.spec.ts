// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { RESET_QUERY_PATTERN } from '../src/index';

describe('RESET_QUERY_PATTERN', () => {
  describe('bare reset parameter', () => {
    it.each([
      ['?reset', '?reset alone'],
      ['?reset&other=1', '?reset before another param'],
      ['?foo=bar&reset', '&reset at end'],
      ['?foo=bar&reset&baz=1', '&reset between params']
    ])('matches %s (%s)', (url: string) => {
      expect(RESET_QUERY_PATTERN.test(url)).toBe(true);
    });
  });

  describe('reset parameter with value', () => {
    it.each([
      ['?reset=1', 'numeric value'],
      ['?reset=true', 'boolean string'],
      ['?reset=yes', 'yes string'],
      ['?reset=', 'empty value'],
      ['?reset=1&other=2', 'with value before another param'],
      ['?foo=bar&reset=1', '&reset=1 at end'],
      ['?foo=bar&reset=true&baz=1', '&reset=true between params']
    ])('matches %s (%s)', (url: string) => {
      expect(RESET_QUERY_PATTERN.test(url)).toBe(true);
    });
  });

  describe('non-matching URLs', () => {
    it.each([
      ['?noreset', 'prefix before reset'],
      ['?resetAll', 'suffix after reset'],
      ['?other=reset', 'reset as a value'],
      ['/lab/tree/notebook.ipynb', 'no query string']
    ])('does not match %s (%s)', (url: string) => {
      expect(RESET_QUERY_PATTERN.test(url)).toBe(false);
    });
  });
});
