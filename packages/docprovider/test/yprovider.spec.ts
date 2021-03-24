// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DOC_PROVIDER_TYPE } from '../src';

describe('@jupyterlab/docprovider', () => {
  describe('docprovider', () => {
    it('should have a type', () => {
      expect(DOC_PROVIDER_TYPE).toBe('ws_yjs');
    });
  });
});
