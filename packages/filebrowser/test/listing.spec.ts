// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DocumentManager } from '@jupyterlab/docmanager';
import { Context, DocumentRegistry } from '@jupyterlab/docregistry';
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

const addFile = async (dirListing: DirListing, options): Promise<void> => {
  const fileBrowserModel = dirListing.model;
  const documentManager = fileBrowserModel.manager;
  await documentManager.newUntitled(options);
};

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
        addFile(dirListing, { path: '', type: 'file' });
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

      // https://github.com/jupyterlab/jupyterlab/pull/468
      // Context Menus:

      // Right clicking on an unselected item when a context menu is open selects a new item and opens the context menu
      // A left click anywhere when there is a context menu clears the menu but keeps the selection
      // Soft Selection:

      // Unmodified mouse down an item in an existing selection is a "soft selection" for dragging or context menu
      // Mouse up on a soft selection clears other selection unless there is an active context menu
      // Drag-drop:

      // Fixes a bug when dragging multiple items - the original node text was being changed
      // Uses a file icon for all multi-item drags
    });
  });
});
