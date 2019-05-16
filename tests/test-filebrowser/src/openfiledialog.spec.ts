// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { toArray } from '@phosphor/algorithm';

import { DocumentManager, IDocumentManager } from '@jupyterlab/docmanager';
import { DocumentRegistry, TextModelFactory } from '@jupyterlab/docregistry';
import {
  getExistingDirectory,
  getOpenFiles,
  FilterFileBrowserModel
} from '@jupyterlab/filebrowser';
import { ServiceManager } from '@jupyterlab/services';
import { expect } from 'chai';
import {
  acceptDialog,
  dismissDialog
  // waitForDialog,
  // sleep
} from '@jupyterlab/testutils';
// import { simulate } from 'simulate-event';

describe('@jupyterlab/filebrowser', () => {
  let manager: IDocumentManager;
  let serviceManager: ServiceManager.IManager;
  let registry: DocumentRegistry;

  before(async () => {
    const opener: DocumentManager.IWidgetOpener = {
      open: widget => {
        /* no op */
      }
    };

    registry = new DocumentRegistry({
      textModelFactory: new TextModelFactory()
    });
    serviceManager = new ServiceManager({ standby: 'never' });
    manager = new DocumentManager({
      registry,
      opener,
      manager: serviceManager
    });

    const contents = serviceManager.contents;
    await contents.newUntitled({ type: 'directory' });
    await contents.newUntitled({ type: 'file' });
    await contents.newUntitled({ type: 'notebook' });
  });

  describe('FilterFileBrowserModel', () => {
    describe('#constructor()', () => {
      it('should construct a new filtered file browser model', () => {
        let model = new FilterFileBrowserModel({ manager });
        expect(model).to.be.an.instanceof(FilterFileBrowserModel);
      });

      it('should accept filter option', () => {
        let model = new FilterFileBrowserModel({
          manager,
          filter: model => false
        });
        expect(model).to.be.an.instanceof(FilterFileBrowserModel);
      });
    });

    describe('#items()', () => {
      it('should list all elements if no filter is defined', async () => {
        let model = new FilterFileBrowserModel({ manager });
        await model.cd();

        const items = toArray(model.items());
        expect(items.length).equal(4);
      });

      it('should list all directories whatever the filter', async () => {
        let model = new FilterFileBrowserModel({
          manager,
          filter: model => false
        });
        await model.cd();

        const items = toArray(model.items());
        expect(items.length).equal(2);
        expect(items[0].type).equal('directory');
        expect(items[1].type).equal('directory');
      });

      it('should respect the filter', async () => {
        let model = new FilterFileBrowserModel({
          manager,
          filter: model => model.type === 'notebook'
        });
        await model.cd();

        const items = toArray(model.items());
        expect(items.length).equal(3);
        expect(items[0].type).equal('directory');
        expect(items[1].type).equal('directory');
        expect(items[2].type).equal('notebook');
      });
    });
  });

  describe('getOpenFiles()', () => {
    it('should create a dialog', async () => {
      let dialog = getOpenFiles({
        manager
      });

      await dismissDialog();

      const result = await dialog;

      expect(result.button.accept).false;
      expect(result.value).null;
    });

    it('should accept options', async () => {
      const node = document.createElement('div');

      document.body.appendChild(node);

      let dialog = getOpenFiles({
        manager,
        title: 'Select a notebook',
        host: node,
        filter: value => value.type === 'notebook'
      });

      await acceptDialog();

      const result = await dialog;

      expect(result.button.accept).true;
      let items = result.value;
      expect(items.length).equal(1);

      document.body.removeChild(node);
    });

    // it('should return one selected file', async () => {
    //   const node = document.createElement('div');

    //   document.body.appendChild(node);

    //   let dialog = getOpenFiles({
    //     manager,
    //     title: 'Select a notebook',
    //     host: node,
    //     filter: value => value.type === 'notebook'
    //   });

    //   await waitForDialog();

    //   let counter = 0;
    //   let listing = node.getElementsByClassName('jp-DirListing-content')[0];
    //   let items = listing.getElementsByTagName('li');
    //   // Wait for the directory listing to be populated
    //   while (items.length === 0 && counter < 100) {
    //     await sleep(10);
    //     items = listing.getElementsByTagName('li');
    //     counter++;
    //   }

    //   if (items.length > 0) {
    //     // Emulate notebook selection
    //     simulate(items.item(2), 'mousedown');
    //   }

    //   await acceptDialog();
    //   let result = await dialog;
    //   let files = result.value;
    //   expect(files.length).equal(1);
    //   expect(files[0].type).equal('notebook');

    //   document.body.removeChild(node);
    // });

    it('should return current path if nothing is selected', async () => {
      let dialog = getOpenFiles({
        manager
      });

      await acceptDialog();

      const result = await dialog;
      const items = result.value;

      expect(items.length).equal(1);
      expect(items[0].type).equal('directory');
      expect(items[0].path).equal('');
    });
  });

  describe('getExistingDirectory()', () => {
    it('should create a dialog', async () => {
      let dialog = getExistingDirectory({
        manager
      });

      await dismissDialog();

      const result = await dialog;

      expect(result.button.accept).false;
      expect(result.value).null;
    });

    it('should accept options', async () => {
      const node = document.createElement('div');

      document.body.appendChild(node);

      let dialog = getExistingDirectory({
        manager,
        title: 'Select a folder',
        host: node
      });

      await acceptDialog();

      const result = await dialog;

      expect(result.button.accept).true;
      expect(result.value.length).equal(1);

      document.body.removeChild(node);
    });

    // it('should return one selected directory', async () => {
    //   expect('').true;
    // });

    it('should return current path if nothing is selected', async () => {
      let dialog = getOpenFiles({
        manager
      });

      await acceptDialog();

      const result = await dialog;
      const items = result.value;

      expect(items.length).equal(1);
      expect(items[0].type).equal('directory');
      expect(items[0].path).equal('');
    });
  });
});
