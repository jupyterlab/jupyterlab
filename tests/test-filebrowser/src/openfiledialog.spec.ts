// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DocumentManager, IDocumentManager } from '@jupyterlab/docmanager';
import { DocumentRegistry, TextModelFactory } from '@jupyterlab/docregistry';
import { getExistingDirectory, getOpenFiles } from '@jupyterlab/filebrowser';
import { ServiceManager } from '@jupyterlab/services';
import { expect } from 'chai';
import { acceptDialog, dismissDialog } from '@jupyterlab/testutils';

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

    // const contents = serviceManager.contents;
    // await contents.newUntitled({ type: 'directory' });
    // await contents.newUntitled({ type: 'file' });
    // await contents.newUntitled({ type: 'notebook' });
  });

  describe('getOpenFiles()', () => {
    it('should create a dialog', async () => {
      let dialog = getOpenFiles({
        manager
      });

      await dismissDialog();

      const result = await dialog;

      expect(result.button.accept).false;
      expect(await result.value).null;
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
      expect((await result.value).length).equals(1);

      document.body.removeChild(node);
    });

    // it('should filter files', async () => {
    //   expect('').true;
    // });

    // it('should return one selected file', async () => {
    //   expect('').true;
    // });

    // it('should return current path if nothing is selected', () => {
    //   expect('').true;
    // });
  });

  describe('getExistingDirectory()', () => {
    it('should create a dialog', async () => {
      let dialog = getExistingDirectory({
        manager
      });

      await dismissDialog();

      const result = await dialog;

      expect(result.button.accept).to.false;
      expect(await result.value).null;
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
      expect((await result.value).length).equals(1);

      document.body.removeChild(node);
    });

    // it('should filter all files', async () => {
    //   expect('').true;
    // });

    // it('should return one selected directory', async () => {
    //   expect('').true;
    // });

    // it('should return current path if nothing is selected', () => {
    //   expect('').true;
    // });
  });
});
