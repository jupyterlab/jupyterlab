// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DocumentManager } from '@jupyterlab/docmanager';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { signalToPromises } from '@jupyterlab/testutils';
import * as Mock from '@jupyterlab/testutils/lib/mock';
import { Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import expect from 'expect';
import { simulate } from 'simulate-event';
import { DirListing, FilterFileBrowserModel } from '../src';

const ITEM_CLASS_SELECTOR = '.jp-DirListing-item';
const SELECTED_CLASS = 'jp-mod-selected';

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

class TestDirListing extends DirListing {
  updated = new Signal<this, void>(this);
  onUpdateRequest(...args: any[]) {
    super.onUpdateRequest.apply(this, args);
    this.updated.emit();
  }
}

describe('filebrowser/listing', () => {
  describe('DirListing', () => {
    describe('#constructor', () => {
      it('should return new DirListing instance', () => {
        const options = createOptionsForConstructor();
        const dirListing = new DirListing(options);
        expect(dirListing).toBeInstanceOf(DirListing);
      });
    });

    describe('context menu', () => {
      let dirListing: TestDirListing;

      beforeEach(() => {
        // Create the widget and mount it to the DOM
        dirListing = new TestDirListing(createOptionsForConstructor());
        Widget.attach(dirListing, document.body);
      });

      afterEach(() => {
        Widget.detach(dirListing);
      });

      // Regression test. See pull request https://github.com/jupyterlab/jupyterlab/pull/3234
      it('right clicking on an item selects it before opening the context menu', async () => {
        const [fileDrivenUpdate, mouseDrivenUpdate] = signalToPromises(
          dirListing.updated,
          2
        );
        const fileBrowserModel = dirListing.model;
        const documentManager = fileBrowserModel.manager;
        await documentManager.newUntitled({
          path: '',
          type: 'file'
        });
        await fileDrivenUpdate;
        const itemNode = dirListing.node.querySelector(
          ITEM_CLASS_SELECTOR
        ) as Element;
        expect(itemNode.classList).not.toContain(SELECTED_CLASS);
        simulate(itemNode, 'mousedown', {
          button: 2
        });
        await mouseDrivenUpdate;
        expect(itemNode.classList).toContain(SELECTED_CLASS);
      });
    });
  });
});
