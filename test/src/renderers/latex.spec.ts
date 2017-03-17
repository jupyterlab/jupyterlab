// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  removeMath, replaceMath, typeset
} from '@jupyterlab/rendermime';


describe('jupyter-ui', () => {

  describe('removeMath()', () => {

    it('should split the text into text and math', () => {
      let input = 'hello, $ /alpha $, there';
      let { text, math } = removeMath(input);
      expect(text).to.be('hello, @@0@@, there');
      expect(math).to.eql(['$ /alpha $'])
    });

    it('should handle code spans', () => {
      let input = '`$foo` and `$bar` are variables';
      let { text, math } = removeMath(input);
      expect(text).to.be(input);
      expect(math).to.eql([]);
    });

    it('should handle math markers', () => {
      let input = ' @@0@@ hello, $ /alpha $, there';
      let { text, math } = removeMath(input);
      expect(text).to.be(' @@0@@ hello, @@1@@, there');
      expect(math).to.eql([ '@@0@@', '$ /alpha $' ])
    });

    it('should handle unbalanced braces', () => {
      let input = 'hello, $ /alpha { $, there';
      let { text, math } = removeMath(input);
      expect(text).to.be('hello, @@0@@, there');
      expect(math).to.eql(['$ /alpha { $' ])
    });

    it('should handle balanced braces', () => {
      let input = 'hello, $ /alpha { } $, there';
      let { text, math } = removeMath(input);
      expect(text).to.be('hello, @@0@@, there');
      expect(math).to.eql(['$ /alpha { } $' ])
    });

    it('should handle math blocks', () => {
      let input = 'hello, $$\nfoo\n$$, there';
      let { text, math } = removeMath(input);
      expect(text).to.be('hello, @@0@@, there');
      expect(math).to.eql(['$$\nfoo\n$$' ])
    });

    it('should handle begin statements', () => {
      let input = 'hello, \\begin{align} \\end{align}, there';
      let { text, math } = removeMath(input);
      expect(text).to.be('hello, @@0@@, there');
      expect(math).to.eql(['\\begin{align} \\end{align}'])
    });

    it('should handle `\\(` delimiters in GFM', () => {
      let input = `
      \`\`\`
        Some \\(text
        \'\'\'
        **bold**
        ## header
      `;
      let { text, math } = removeMath(input);
      expect(text).to.be(input);
      expect(math).to.eql([]);
    });

    it('should handle `\\\\\(` delimiters for math', () => {
      let input = `hello, \\\\\(
          /alpha
      \\\\\), there`;
      let { text, math } = removeMath(input);
      expect(text).to.be('hello, @@0@@, there');
      expect(math).to.eql(['\\\\(\n          /alpha\n      \\\\)']);
    });

    it('should handle `\\\\\[` delimiters for math', () => {
      let input = `hello, \\\\\[
          /alpha
      \\\\\], there`;
      let { text, math } = removeMath(input);
      expect(text).to.be('hello, @@0@@, there');
      expect(math).to.eql(['\\\\[\n          /alpha\n      \\\\]']);
    });

  });

  describe('replaceMath()', () => {

    it('should recombine text split with removeMath', () => {
      let input = 'hello, $ /alpha $, there';
      let { text, math } = removeMath(input);
      expect(replaceMath(text, math)).to.be(input);
    });

  });

  describe('typeset()', () => {

    it('should be a no-op if MathJax is not defined', () => {
      typeset(document.body);
    });

  });

});
