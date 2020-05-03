// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import { removeMath, replaceMath } from '../src';

describe('jupyter-ui', () => {
  describe('removeMath()', () => {
    it('should split the text into text and math', () => {
      const input = 'hello, $ /alpha $, there';
      const { text, math } = removeMath(input);
      expect(text).toBe('hello, @@0@@, there');
      expect(math).toEqual(['$ /alpha $']);
    });

    it('should handle code spans', () => {
      const input = '`$foo` and `$bar` are variables';
      const { text, math } = removeMath(input);
      expect(text).toBe(input);
      expect(math).toEqual([]);
    });

    it('should handle math markers', () => {
      const input = ' @@0@@ hello, $ /alpha $, there';
      const { text, math } = removeMath(input);
      expect(text).toBe(' @@0@@ hello, @@1@@, there');
      expect(math).toEqual(['@@0@@', '$ /alpha $']);
    });

    it('should handle unbalanced braces', () => {
      const input = 'hello, $ /alpha { $, there';
      const { text, math } = removeMath(input);
      expect(text).toBe('hello, @@0@@, there');
      expect(math).toEqual(['$ /alpha { $']);
    });

    it('should handle balanced braces', () => {
      const input = 'hello, $ /alpha { } $, there';
      const { text, math } = removeMath(input);
      expect(text).toBe('hello, @@0@@, there');
      expect(math).toEqual(['$ /alpha { } $']);
    });

    it('should handle math blocks', () => {
      const input = 'hello, $$\nfoo\n$$, there';
      const { text, math } = removeMath(input);
      expect(text).toBe('hello, @@0@@, there');
      expect(math).toEqual(['$$\nfoo\n$$']);
    });

    it('should handle begin statements', () => {
      const input = 'hello, \\begin{align} \\end{align}, there';
      const { text, math } = removeMath(input);
      expect(text).toBe('hello, @@0@@, there');
      expect(math).toEqual(['\\begin{align} \\end{align}']);
    });

    it('should handle `\\(` delimiters in GFM', () => {
      const input = `
      \`\`\`
        Some \\(text
        \'\'\'
        **bold**
        ## header
      `;
      const { text, math } = removeMath(input);
      expect(text).toBe(input);
      expect(math).toEqual([]);
    });

    it('should handle `\\\\(` delimiters for math', () => {
      const input = `hello, \\\\\(
          /alpha
      \\\\\), there`;
      const { text, math } = removeMath(input);
      expect(text).toBe('hello, @@0@@, there');
      expect(math).toEqual(['\\\\(\n          /alpha\n      \\\\)']);
    });

    it('should handle `\\\\[` delimiters for math', () => {
      const input = `hello, \\\\\[
          /alpha
      \\\\\], there`;
      const { text, math } = removeMath(input);
      expect(text).toBe('hello, @@0@@, there');
      expect(math).toEqual(['\\\\[\n          /alpha\n      \\\\]']);
    });
  });

  describe('replaceMath()', () => {
    it('should recombine text split with removeMath', () => {
      const input = 'hello, $ /alpha $, there';
      const { text, math } = removeMath(input);
      expect(replaceMath(text, math)).toBe(input);
    });
  });
});
