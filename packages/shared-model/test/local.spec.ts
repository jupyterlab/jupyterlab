// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { LocalCellJupyterMetadata } from './../src';

describe('@jupyterlab/shared-model', () => {
  describe('local', () => {
    it('should return create a local metadata', () => {
      const m = new LocalCellJupyterMetadata();
      expect(m.source_hidden).toBe(false);
    });
  });
});
