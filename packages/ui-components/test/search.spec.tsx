// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { fuzzySearch } from '@jupyterlab/ui-components';

describe('@jupyterlab/ui-components', () => {
  describe('fuzzySearch()', () => {
    // The search logic is in StringExt.matchSumOfDeltas, which is already
    // tested in the lumino package.
    it('should find an ASCII match in text', () => {
      const result = fuzzySearch('food', 'foo');
      expect(result).not.toBeNull();
    });

    it('should find an ASCII match in text with a space', () => {
      const result = fuzzySearch('fast food', 'foo');
      expect(result).not.toBeNull();
    });

    it('should fail to find an ASCII match in text', () => {
      const result = fuzzySearch('fast food', 'bar');
      expect(result).toBeNull();
    });

    it('should find a French match in text', () => {
      const result = fuzzySearch('Liberté, égalité, fraternité', 'erté');
      expect(result).not.toBeNull();
    });

    it('should fail to find a French match in text', () => {
      const result = fuzzySearch('Liberté, égalité, fraternité', 'ègal');
      expect(result).toBeNull();
    });

    // CJK = Chinese, Japanese, and Korean characters
    it('should find a CJK match in ASCII+CJK text', () => {
      const result = fuzzySearch('2测试', '测');
      expect(result).not.toBeNull();
    });

    it('should find a ASCII match in ASCII+CJK text', () => {
      const result = fuzzySearch('测试1.ipynb', '1');
      expect(result).not.toBeNull();
    });
  });
});
