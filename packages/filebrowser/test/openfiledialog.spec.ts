// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import 'jest';

import expect from 'expect';

// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { toArray } from '@lumino/algorithm';
import { DocumentManager, IDocumentManager } from '@jupyterlab/docmanager';
import { DocumentRegistry, TextModelFactory } from '@jupyterlab/docregistry';
import { FileDialog, FilterFileBrowserModel, FileBrowserModel } from '../src';

import { ServiceManager, Contents } from '@jupyterlab/services';
import {
  acceptDialog,
  dismissDialog,
  waitForDialog,
  sleep,
  framePromise
} from '@jupyterlab/testutils';

import * as Mock from '@jupyterlab/testutils/lib/mock';

import { simulate } from 'simulate-event';

describe('@jupyterlab/filebrowser', () => {
  let manager: IDocumentManager;
  let serviceManager: ServiceManager.IManager;
  let registry: DocumentRegistry;

  beforeAll(async () => {
    const opener: DocumentManager.IWidgetOpener = {
      open: widget => {
        /* no op */
      }
    };

    registry = new DocumentRegistry({
      textModelFactory: new TextModelFactory()
    });
    serviceManager = new Mock.ServiceManagerMock();
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
        const model = new FilterFileBrowserModel({ manager });
        expect(model).toBeInstanceOf(FilterFileBrowserModel);
      });

      it('should accept filter option', () => {
        const model = new FilterFileBrowserModel({
          manager,
          filter: (model: Contents.IModel) => false
        });
        expect(model).toBeInstanceOf(FilterFileBrowserModel);
      });
    });

    describe('#items()', () => {
      it('should list all elements if no filter is defined', async () => {
        const filteredModel = new FilterFileBrowserModel({
          manager
        });
        await filteredModel.cd();
        const model = new FileBrowserModel({ manager });
        await model.cd();

        const filteredItems = toArray(filteredModel.items());
        const items = toArray(model.items());
        expect(filteredItems.length).toBe(items.length);
      });

      it('should list all directories whatever the filter', async () => {
        const filteredModel = new FilterFileBrowserModel({
          manager,
          filter: (model: Contents.IModel) => false
        });
        await filteredModel.cd();
        const model = new FileBrowserModel({ manager });
        await model.cd();

        const filteredItems = toArray(filteredModel.items());
        const items = toArray(model.items());
        const folders = items.filter(item => item.type === 'directory');
        expect(filteredItems.length).toBe(folders.length);
      });

      it('should respect the filter', async () => {
        const filteredModel = new FilterFileBrowserModel({
          manager,
          filter: (model: Contents.IModel) => model.type === 'notebook'
        });
        await filteredModel.cd();
        const model = new FileBrowserModel({ manager });
        await model.cd();

        const filteredItems = toArray(
          filteredModel.items()
        ) as Contents.IModel[];
        const items = toArray(model.items());
        const shownItems = items.filter(
          item => item.type === 'directory' || item.type === 'notebook'
        );
        expect(filteredItems.length).toBe(shownItems.length);
        const notebooks = filteredItems.filter(
          item => item.type === 'notebook'
        );
        expect(notebooks.length).toBeGreaterThan(0);
      });
    });
  });

  describe('FileDialog.getOpenFiles()', () => {
    it('should create a dialog', async () => {
      const dialog = FileDialog.getOpenFiles({
        manager
      });

      await dismissDialog();

      const result = await dialog;

      expect(result.button.accept).toBe(false);
      expect(result.value).toBeNull();
    });

    it('should accept options', async () => {
      const node = document.createElement('div');

      document.body.appendChild(node);

      const dialog = FileDialog.getOpenFiles({
        manager,
        title: 'Select a notebook',
        host: node,
        filter: (value: Contents.IModel) => value.type === 'notebook'
      });

      await acceptDialog();

      const result = await dialog;

      expect(result.button.accept).toBe(true);
      const items = result.value!;
      expect(items.length).toBe(1);

      document.body.removeChild(node);
    });

    it('should return one selected file', async () => {
      const node = document.createElement('div');

      document.body.appendChild(node);

      const dialog = FileDialog.getOpenFiles({
        manager,
        title: 'Select a notebook',
        host: node,
        filter: (value: Contents.IModel) => value.type === 'notebook'
      });

      await waitForDialog();
      await framePromise();

      let counter = 0;
      const listing = node.getElementsByClassName('jp-DirListing-content')[0];
      expect(listing).toBeTruthy();

      let items = listing.getElementsByTagName('li');
      counter = 0;
      // Wait for the directory listing to be populated
      while (items.length === 0 && counter < 100) {
        await sleep(10);
        items = listing.getElementsByTagName('li');
        counter++;
      }

      // Fails if there is no items shown
      expect(items.length).toBeGreaterThan(0);

      // Emulate notebook file selection
      const item = listing.querySelector('li[data-file-type="notebook"]')!;
      simulate(item, 'mousedown');

      await acceptDialog();
      const result = await dialog;
      const files = result.value!;
      expect(files.length).toBe(1);
      expect(files[0].type).toBe('notebook');
      expect(files[0].name).toEqual(expect.stringMatching(/Untitled.*.ipynb/));

      document.body.removeChild(node);
    });

    it('should return current path if nothing is selected', async () => {
      const dialog = FileDialog.getOpenFiles({
        manager
      });

      await acceptDialog();

      const result = await dialog;
      const items = result.value!;

      expect(items.length).toBe(1);
      expect(items[0].type).toBe('directory');
      expect(items[0].path).toBe('');
    });
  });

  describe('FileDialog.getExistingDirectory()', () => {
    it('should create a dialog', async () => {
      const dialog = FileDialog.getExistingDirectory({
        manager
      });

      await dismissDialog();

      const result = await dialog;

      expect(result.button.accept).toBe(false);
      expect(result.value).toBeNull();
    });

    it('should accept options', async () => {
      const node = document.createElement('div');

      document.body.appendChild(node);

      const dialog = FileDialog.getExistingDirectory({
        manager,
        title: 'Select a folder',
        host: node
      });

      await acceptDialog();

      const result = await dialog;

      expect(result.button.accept).toBe(true);
      expect(result.value!.length).toBe(1);

      document.body.removeChild(node);
    });

    it('should return one selected directory', async () => {
      const node = document.createElement('div');

      document.body.appendChild(node);

      const dialog = FileDialog.getExistingDirectory({
        manager,
        title: 'Select a folder',
        host: node
      });

      await waitForDialog();
      await framePromise();

      let counter = 0;
      const listing = node.getElementsByClassName('jp-DirListing-content')[0];
      expect(listing).toBeTruthy();

      let items = listing.getElementsByTagName('li');
      // Wait for the directory listing to be populated
      while (items.length === 0 && counter < 100) {
        await sleep(10);
        items = listing.getElementsByTagName('li');
        counter++;
      }

      // Fails if there is no items shown
      expect(items.length).toBeGreaterThan(0);

      // Emulate notebook file selection
      simulate(items.item(items.length - 1)!, 'mousedown');

      await acceptDialog();
      const result = await dialog;
      const files = result.value!;
      expect(files.length).toBe(1);
      expect(files[0].type).toBe('directory');
      expect(files[0].name).toEqual(
        expect.stringMatching(/Untitled Folder( \d+)?/)
      );

      document.body.removeChild(node);
    });

    it('should return current path if nothing is selected', async () => {
      const dialog = FileDialog.getExistingDirectory({
        manager
      });

      await acceptDialog();

      const result = await dialog;
      const items = result.value!;

      expect(items.length).toBe(1);
      expect(items[0].type).toBe('directory');
      expect(items[0].path).toBe('');
    });
  });
});
