// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Text } from '@jupyterlab/coreutils';

describe('@jupyterlab/coreutils', () => {
  describe('Text', () => {
    describe('.jsIndexToCharIndex()', () => {
      it('should return the same index for ASCII text', () => {
        const text = 'hello world';
        expect(Text.jsIndexToCharIndex(0, text)).toBe(0);
        expect(Text.jsIndexToCharIndex(5, text)).toBe(5);
        expect(Text.jsIndexToCharIndex(text.length, text)).toBe(text.length);
      });

      it('should convert js index to char index with surrogate pairs', () => {
        // '𝐚' is a surrogate pair (U+1D41A), taking 2 JS indices
        const text = '𝐚bc';
        // JS indices: 0,1 = '𝐚', 2 = 'b', 3 = 'c'
        // Char indices: 0 = '𝐚', 1 = 'b', 2 = 'c'
        expect(Text.jsIndexToCharIndex(0, text)).toBe(0);
        expect(Text.jsIndexToCharIndex('𝐚'.length, text)).toBe(1); // 'b' is at char index 1
        expect(Text.jsIndexToCharIndex(text.length - 1, text)).toBe(2); // 'c' is at char index 2
      });

      it('should handle multiple surrogate pairs', () => {
        // '𝐚𝐛' has two surrogate pairs
        const text = '𝐚𝐛c';
        // JS indices: 0,1 = '𝐚', 2,3 = '𝐛', 4 = 'c'
        // Char indices: 0 = '𝐚', 1 = '𝐛', 2 = 'c'
        expect(Text.jsIndexToCharIndex(text.length - 1, text)).toBe(2);
      });
    });

    describe('.charIndexToJsIndex()', () => {
      it('should return the same index for ASCII text', () => {
        const text = 'hello world';
        expect(Text.charIndexToJsIndex(0, text)).toBe(0);
        expect(Text.charIndexToJsIndex(5, text)).toBe(5);
        expect(Text.charIndexToJsIndex(text.length, text)).toBe(text.length);
      });

      it('should convert char index to js index with surrogate pairs', () => {
        // '𝐚' is a surrogate pair (U+1D41A), taking 2 JS indices
        const text = '𝐚bc';
        // Char indices: 0 = '𝐚', 1 = 'b', 2 = 'c'
        // JS indices: 0,1 = '𝐚', 2 = 'b', 3 = 'c'
        expect(Text.charIndexToJsIndex(0, text)).toBe(0);
        expect(Text.charIndexToJsIndex(1, text)).toBe('𝐚'.length); // 'b' is at JS index 2
        expect(Text.charIndexToJsIndex(2, text)).toBe(text.length - 1); // 'c' is at JS index 3
      });

      it('should handle multiple surrogate pairs', () => {
        // '𝐚𝐛' has two surrogate pairs
        const text = '𝐚𝐛c';
        // Char indices: 0 = '𝐚', 1 = '𝐛', 2 = 'c'
        // JS indices: 0,1 = '𝐚', 2,3 = '𝐛', 4 = 'c'
        expect(Text.charIndexToJsIndex(2, text)).toBe(text.length - 1);
      });
    });

    describe('roundtrip conversion', () => {
      it('should roundtrip correctly with surrogate pairs', () => {
        const text = 'a𝐚b𝐛c';
        // Use spread to get the character count (5), not text.length which returns JS length (7)
        const charCount = [...text].length;
        for (let charIdx = 0; charIdx < charCount; charIdx++) {
          const jsIdx = Text.charIndexToJsIndex(charIdx, text);
          expect(Text.jsIndexToCharIndex(jsIdx, text)).toBe(charIdx);
        }
      });
    });
  });
});
