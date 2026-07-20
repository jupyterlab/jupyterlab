// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { removeMath, replaceMath } from '@jupyterlab/rendermime';

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

    it('should handle fenced code blocks', () => {
      const input = '```\n$foo\n$bar\n```';
      const { text, math } = removeMath(input);
      expect(text).toBe(input);
      expect(math).toEqual([]);
    });

    it('should handle tilde fenced code blocks', () => {
      const input = '~~~\n$foo\n$bar\n~~~';
      const { text, math } = removeMath(input);
      expect(text).toBe(input);
      expect(math).toEqual([]);
    });

    it('should handle long fenced code blocks', () => {
      const input = '````\n$foo\n$bar\n```\n``````';
      const { text, math } = removeMath(input);
      expect(text).toBe(input);
      expect(math).toEqual([]);
    });

    it('should handle fenced code blocks with info string', () => {
      const input = '```R\ndata[data$foo > 1 & data$bar < 2,]\n```';
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

    describe('dollarInlineMath option', () => {
      it('should treat single `$` as inline math by default', () => {
        const input = 'You owe me $5 and $10.';
        const { text, math } = removeMath(input);
        expect(math).toEqual(['$5 and $']);
        expect(text).toBe('You owe me @@0@@10.');
      });

      it('should leave single `$` literal when dollarInlineMath is false', () => {
        const input = 'You owe me $5 and $10.';
        const { text, math } = removeMath(input, { dollarInlineMath: false });
        expect(math).toEqual([]);
        expect(text).toBe(input);
      });

      it('should still recognize `$$` display math when dollarInlineMath is false', () => {
        const input = 'total $$x = 5$$ end';
        const { text, math } = removeMath(input, { dollarInlineMath: false });
        expect(math).toEqual(['$$x = 5$$']);
        expect(text).toBe('total @@0@@ end');
      });
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
