// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { WebSocketProviderWithLocks } from '../src';

describe('@jupyterlab/docprovider', () => {
  describe('docprovider', () => {
    it('should have a type', () => {
      expect(WebSocketProviderWithLocks).not.toBeUndefined();
    });
  });
});
