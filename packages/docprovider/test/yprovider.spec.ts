// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { WebsocketProviderWithLocks } from '../src';

describe('@jupyterlab/docprovider', () => {
  describe('docprovider', () => {
    it('should have a type', () => {
      expect(WebsocketProviderWithLocks).not.toBeUndefined();
    });
  });
});
