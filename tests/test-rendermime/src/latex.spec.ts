// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { removeMath, replaceMath } from '@jupyterlab/rendermime';

describe('jupyter-ui', () => {
  describe('removeMath()', () => {
    it('should split the text into text and math', () => {
      const input = 'hello, $ /alpha $, there';
      const { text, math } = removeMath(input);
      expect(text).to.equal('hello, @@0@@, there');
      expect(math).to.deep.equal(['$ /alpha $']);
    });

    it('should handle code spans', () => {
      const input = '`$foo` and `$bar` are variables';
      const { text, math } = removeMath(input);
      expect(text).to.equal(input);
      expect(math).to.deep.equal([]);
    });

    it('should handle math markers', () => {
      const input = ' @@0@@ hello, $ /alpha $, there';
      const { text, math } = removeMath(input);
      expect(text).to.equal(' @@0@@ hello, @@1@@, there');
      expect(math).to.deep.equal(['@@0@@', '$ /alpha $']);
    });

    it('should handle unbalanced braces', () => {
      const input = 'hello, $ /alpha { $, there';
      const { text, math } = removeMath(input);
      expect(text).to.equal('hello, @@0@@, there');
      expect(math).to.deep.equal(['$ /alpha { $']);
    });

    it('should handle balanced braces', () => {
      const input = 'hello, $ /alpha { } $, there';
      const { text, math } = removeMath(input);
      expect(text).to.equal('hello, @@0@@, there');
      expect(math).to.deep.equal(['$ /alpha { } $']);
    });

    it('should handle math blocks', () => {
      const input = 'hello, $$\nfoo\n$$, there';
      const { text, math } = removeMath(input);
      expect(text).to.equal('hello, @@0@@, there');
      expect(math).to.deep.equal(['$$\nfoo\n$$']);
    });

    it('should handle begin statements', () => {
      const input = 'hello, \\begin{align} \\end{align}, there';
      const { text, math } = removeMath(input);
      expect(text).to.equal('hello, @@0@@, there');
      expect(math).to.deep.equal(['\\begin{align} \\end{align}']);
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
      expect(text).to.equal(input);
      expect(math).to.deep.equal([]);
    });

    it('should handle `\\\\(` delimiters for math', () => {
      const input = `hello, \\\\\(
          /alpha
      \\\\\), there`;
      const { text, math } = removeMath(input);
      expect(text).to.equal('hello, @@0@@, there');
      expect(math).to.deep.equal(['\\\\(\n          /alpha\n      \\\\)']);
    });

    it('should handle `\\\\[` delimiters for math', () => {
      const input = `hello, \\\\\[
          /alpha
      \\\\\], there`;
      const { text, math } = removeMath(input);
      expect(text).to.equal('hello, @@0@@, there');
      expect(math).to.deep.equal(['\\\\[\n          /alpha\n      \\\\]']);
    });
  });

  describe('replaceMath()', () => {
    it('should recombine text split with removeMath', () => {
      const input = 'hello, $ /alpha $, there';
      const { text, math } = removeMath(input);
      expect(replaceMath(text, math)).to.equal(input);
    });
  });
});
