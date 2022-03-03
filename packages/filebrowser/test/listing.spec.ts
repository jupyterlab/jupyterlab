// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DocumentManager } from '@jupyterlab/docmanager';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import * as Mock from '@jupyterlab/testutils/lib/mock';
import expect from 'expect';
import { DirListing, FilterFileBrowserModel } from '../src';

// Returns the minimal args needed to create a new DirListing instance
const createOptionsForConstructor: () => DirListing.IOptions = () => ({
  model: new FilterFileBrowserModel({
    manager: new DocumentManager({
      registry: new DocumentRegistry(),
      opener: {
        open: () => {
          /* noop */
        }
      },
      manager: new Mock.ServiceManagerMock()
    })
  })
});

describe('filebrowser/listing', () => {
  describe('DirListing', () => {
    describe('#constructor', () => {
      it('should return new DirListing instance', () => {
        const options = createOptionsForConstructor();
        const dirListing = new DirListing(options);
        expect(dirListing).toBeInstanceOf(DirListing);
      });
    });
  });
});
