/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import expect from 'expect';
import { Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import { DocumentManager, IDocumentManager } from '@jupyterlab/docmanager';
import { DocumentRegistry, TextModelFactory } from '@jupyterlab/docregistry';
import { ServiceManager } from '@jupyterlab/services';
import { signalToPromise } from '@jupyterlab/testing';
import { Drive } from '@jupyterlab/services';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { DocumentWidgetOpenerMock } from '@jupyterlab/docregistry/lib/testutils';
import { simulate } from 'simulate-event';
import { FileBrowser, FilterFileBrowserModel } from '../src';

const ITEM_CLASS = 'jp-DirListing-item';
const EDITOR_CLASS = 'jp-DirListing-editor';

class TestFileBrowser extends FileBrowser {
  renameCalled = new Signal<this, void>(this);
  rename(...args: any[]) {
    const result = super.rename.apply(this, args);
    // Allows us to spy on onUpdateRequest.
    this.renameCalled.emit();
    return result;
  }
}

describe('filebrowser/browser', () => {
  let manager: IDocumentManager;
  let serviceManager: ServiceManager.IManager;
  let registry: DocumentRegistry;
  let model: FilterFileBrowserModel;

  beforeAll(async () => {
    const opener = new DocumentWidgetOpenerMock();

    registry = new DocumentRegistry({
      textModelFactory: new TextModelFactory()
    });
    serviceManager = new ServiceManagerMock();
    manager = new DocumentManager({
      registry,
      opener,
      manager: serviceManager
    });

    model = new FilterFileBrowserModel({ manager });

    const contents = serviceManager.contents;
    await contents.newUntitled({ type: 'directory' });
    await contents.newUntitled({ type: 'file' });
    await contents.newUntitled({ type: 'notebook' });
  });

  describe('FileBrowser', () => {
    let fileBrowser: TestFileBrowser;

    beforeEach(() => {
      const options: FileBrowser.IOptions = {
        model,
        id: ''
      };
      fileBrowser = new TestFileBrowser(options);
      Widget.attach(fileBrowser, document.body);
    });

    describe('#constructor', () => {
      it('should return new FileBrowser instance', () => {
        expect(fileBrowser).toBeInstanceOf(FileBrowser);
      });

      it('toolbar should have an aria label of file browser and a role of navigation', () => {
        const toolbar = fileBrowser.toolbar.node;
        expect(toolbar.getAttribute('aria-label')).toEqual('file browser');
        expect(toolbar.getAttribute('role')).toEqual('toolbar');
      });
    });

    describe('#createNewDirectory', () => {
      it('should focus newly created directory after rename', async () => {
        const created = fileBrowser.createNewDirectory();
        await signalToPromise(fileBrowser.renameCalled);
        const editNode = document.querySelector(`.${EDITOR_CLASS}`);
        if (!editNode) {
          throw new Error('Edit node not found');
        }
        const itemNode = Array.from(
          document.querySelectorAll(`.${ITEM_CLASS}`)
        ).find(el => {
          return el.contains(editNode);
        });
        if (!itemNode) {
          throw new Error('Item node not found');
        }
        simulate(editNode, 'keydown', {
          keyCode: 13,
          key: 'Enter'
        });
        await created;
        expect(itemNode.contains(document.activeElement)).toBe(true);
      });
    });

    describe('#createNewFile', () => {
      it('should focus newly created file after rename', async () => {
        const created = fileBrowser.createNewFile({ ext: '.txt' });
        await signalToPromise(fileBrowser.renameCalled);
        const editNode = document.querySelector(`.${EDITOR_CLASS}`);
        if (!editNode) {
          throw new Error('Edit node not found');
        }
        const itemNode = Array.from(
          document.querySelectorAll(`.${ITEM_CLASS}`)
        ).find(el => {
          return el.contains(editNode);
        });
        if (!itemNode) {
          throw new Error('Item node not found');
        }
        simulate(editNode, 'keydown', {
          keyCode: 13,
          key: 'Enter'
        });
        await created;
        expect(itemNode.contains(document.activeElement)).toBe(true);
      });
    });
  });
});

describe('FileBrowser with Drives', () => {
  const DRIVE_NAME = 'TestDrive';
  let fileBrowser: TestFileBrowser;
  let manager: IDocumentManager;
  let serviceManager: ServiceManager.IManager;
  let registry: DocumentRegistry;
  let model: FilterFileBrowserModel;

  beforeAll(async () => {
    const opener = new DocumentWidgetOpenerMock();

    registry = new DocumentRegistry({
      textModelFactory: new TextModelFactory()
    });
    serviceManager = new ServiceManagerMock();
    manager = new DocumentManager({
      registry,
      opener,
      manager: serviceManager
    });

    const drive = new Drive({
      name: DRIVE_NAME,
      serverSettings: serviceManager.serverSettings
    });
    serviceManager.contents.addDrive(drive);
    model = new FilterFileBrowserModel({ manager, driveName: drive.name });
  });

  beforeEach(() => {
    const options: FileBrowser.IOptions = {
      model,
      id: ''
    };
    fileBrowser = new TestFileBrowser(options);
    Widget.attach(fileBrowser, document.body);
  });

  describe('#createNewFile', () => {
    it('should create the file in the drive', async () => {
      const created = fileBrowser.createNewFile({ ext: '.txt' });
      await signalToPromise(fileBrowser.renameCalled);
      const editNode = document.querySelector(`.${EDITOR_CLASS}`);
      if (!editNode) {
        throw new Error('Edit node not found');
      }
      const itemNode = Array.from(
        document.querySelectorAll(`.${ITEM_CLASS}`)
      ).find(el => {
        return el.contains(editNode);
      });
      if (!itemNode) {
        throw new Error('Item node not found');
      }
      simulate(editNode, 'keydown', {
        keyCode: 13,
        key: 'Enter'
      });
      const fileModel = await created;
      expect(fileModel.path).toContain(DRIVE_NAME);
    });
  });
});
