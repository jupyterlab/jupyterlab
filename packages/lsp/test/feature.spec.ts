/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { FeatureManager, IFeature } from '@jupyterlab/lsp';

const feature1: IFeature = {
  id: 'foo',
  capabilities: {
    textDocument: {
      rename: { dynamicRegistration: true }
    }
  }
};
const feature2: IFeature = {
  id: 'foo2',
  capabilities: {
    textDocument: {
      formatting: { dynamicRegistration: true }
    }
  }
};

describe('@jupyterlab/lsp', () => {
  describe('FeatureManager', () => {
    let manager: FeatureManager;
    beforeEach(() => {
      manager = new FeatureManager();
    });
    describe('#register', () => {
      it('should register a new feature', async () => {
        manager.register(feature1);
        expect(manager.features.length).toEqual(1);
      });
      it('should merge capabilities of features', async () => {
        manager.register(feature1);
        manager.register(feature2);
        expect(manager.features.length).toEqual(2);
        expect(manager.clientCapabilities()).toEqual({
          textDocument: {
            formatting: { dynamicRegistration: true },
            rename: { dynamicRegistration: true }
          }
        });
      });
    });
  });
});
