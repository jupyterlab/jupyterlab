// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { toArray } from '@lumino/algorithm';

import { DocumentManager, IDocumentManager } from '@jupyterlab/docmanager';
import { DocumentRegistry, TextModelFactory } from '@jupyterlab/docregistry';
import {
  FileDialog,
  FilterFileBrowserModel,
  FileBrowserModel
} from '@jupyterlab/filebrowser';
import { ServiceManager, Contents } from '@jupyterlab/services';

import { expect } from 'chai';
import {
  acceptDialog,
  dismissDialog,
  waitForDialog,
  sleep,
  framePromise
} from '@jupyterlab/testutils';
import { simulate } from 'simulate-event';

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
          filter: (model: Contents.IModel) => false
        });
        expect(model).to.be.an.instanceof(FilterFileBrowserModel);
      });
    });

    describe('#items()', () => {
      it('should list all elements if no filter is defined', async () => {
        let filteredModel = new FilterFileBrowserModel({
          manager
        });
        await filteredModel.cd();
        let model = new FileBrowserModel({ manager });
        await model.cd();

        const filteredItems = toArray(filteredModel.items());
        const items = toArray(model.items());
        expect(filteredItems.length).equal(items.length);
      });

      it('should list all directories whatever the filter', async () => {
        let filteredModel = new FilterFileBrowserModel({
          manager,
          filter: (model: Contents.IModel) => false
        });
        await filteredModel.cd();
        let model = new FileBrowserModel({ manager });
        await model.cd();

        const filteredItems = toArray(filteredModel.items());
        const items = toArray(model.items());
        const folders = items.filter(item => item.type === 'directory');
        expect(filteredItems.length).equal(folders.length);
      });

      it('should respect the filter', async () => {
        let filteredModel = new FilterFileBrowserModel({
          manager,
          filter: (model: Contents.IModel) => model.type === 'notebook'
        });
        await filteredModel.cd();
        let model = new FileBrowserModel({ manager });
        await model.cd();

        const filteredItems = toArray(
          filteredModel.items()
        ) as Contents.IModel[];
        const items = toArray(model.items());
        const shownItems = items.filter(
          item => item.type === 'directory' || item.type === 'notebook'
        );
        expect(filteredItems.length).equal(shownItems.length);
        const notebooks = filteredItems.filter(
          item => item.type === 'notebook'
        );
        expect(notebooks.length).to.be.greaterThan(0);
      });
    });
  });

  describe('FileDialog.getOpenFiles()', () => {
    it('should create a dialog', async () => {
      let dialog = FileDialog.getOpenFiles({
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

      let dialog = FileDialog.getOpenFiles({
        manager,
        title: 'Select a notebook',
        host: node,
        filter: (value: Contents.IModel) => value.type === 'notebook'
      });

      await acceptDialog();

      const result = await dialog;

      expect(result.button.accept).true;
      let items = result.value!;
      expect(items.length).equal(1);

      document.body.removeChild(node);
    });

    it('should return one selected file', async () => {
      const node = document.createElement('div');

      document.body.appendChild(node);

      let dialog = FileDialog.getOpenFiles({
        manager,
        title: 'Select a notebook',
        host: node,
        filter: (value: Contents.IModel) => value.type === 'notebook'
      });

      await waitForDialog();
      await framePromise();

      let counter = 0;
      let listing = node.getElementsByClassName('jp-DirListing-content')[0];
      expect(listing).to.be.ok;

      let items = listing.getElementsByTagName('li');
      counter = 0;
      // Wait for the directory listing to be populated
      while (items.length === 0 && counter < 100) {
        await sleep(10);
        items = listing.getElementsByTagName('li');
        counter++;
      }

      // Fails if there is no items shown
      expect(items.length).to.be.greaterThan(0);

      // Emulate notebook file selection
      // Get node coordinates we need to be precised as code test for hit position
      const rect = items.item(items.length - 1)!.getBoundingClientRect();

      simulate(items.item(items.length - 1)!, 'mousedown', {
        clientX: 0.5 * (rect.left + rect.right),
        clientY: 0.5 * (rect.bottom + rect.top)
      });

      await acceptDialog();
      let result = await dialog;
      let files = result.value!;
      expect(files.length).equal(1);
      expect(files[0].type).equal('notebook');
      expect(files[0].name).matches(/Untitled\d*.ipynb/);

      document.body.removeChild(node);
    });

    it('should return current path if nothing is selected', async () => {
      let dialog = FileDialog.getOpenFiles({
        manager
      });

      await acceptDialog();

      const result = await dialog;
      const items = result.value!;

      expect(items.length).equal(1);
      expect(items[0].type).equal('directory');
      expect(items[0].path).equal('');
    });
  });

  describe('FileDialog.getExistingDirectory()', () => {
    it('should create a dialog', async () => {
      let dialog = FileDialog.getExistingDirectory({
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

      let dialog = FileDialog.getExistingDirectory({
        manager,
        title: 'Select a folder',
        host: node
      });

      await acceptDialog();

      const result = await dialog;

      expect(result.button.accept).true;
      expect(result.value!.length).equal(1);

      document.body.removeChild(node);
    });

    it('should return one selected directory', async () => {
      const node = document.createElement('div');

      document.body.appendChild(node);

      let dialog = FileDialog.getExistingDirectory({
        manager,
        title: 'Select a folder',
        host: node
      });

      await waitForDialog();
      await framePromise();

      let counter = 0;
      let listing = node.getElementsByClassName('jp-DirListing-content')[0];
      expect(listing).to.be.ok;

      let items = listing.getElementsByTagName('li');
      // Wait for the directory listing to be populated
      while (items.length === 0 && counter < 100) {
        await sleep(10);
        items = listing.getElementsByTagName('li');
        counter++;
      }

      // Fails if there is no items shown
      expect(items.length).to.be.greaterThan(0);

      // Emulate notebook file selection
      // Get node coordinates we need to be precised as code test for hit position
      const rect = items.item(items.length - 1)!.getBoundingClientRect();

      simulate(items.item(items.length - 1)!, 'mousedown', {
        clientX: 0.5 * (rect.left + rect.right),
        clientY: 0.5 * (rect.bottom + rect.top)
      });

      await acceptDialog();
      let result = await dialog;
      let files = result.value!;
      expect(files.length).equal(1);
      expect(files[0].type).equal('directory');
      expect(files[0].name).matches(/Untitled Folder( \d+)?/);

      document.body.removeChild(node);
    });

    it('should return current path if nothing is selected', async () => {
      let dialog = FileDialog.getExistingDirectory({
        manager
      });

      await acceptDialog();

      const result = await dialog;
      const items = result.value!;

      expect(items.length).equal(1);
      expect(items[0].type).equal('directory');
      expect(items[0].path).equal('');
    });
  });
});
