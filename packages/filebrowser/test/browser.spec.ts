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
    await model.cd();
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

    describe('#selectionChanged', () => {
      it('should emit when a file is selected', async () => {
        let selectionChanged = false;
        fileBrowser.selectionChanged.connect(() => {
          selectionChanged = true;
        });

        // Get a file name to select
        const items = Array.from(model.items());
        expect(items.length).toBeGreaterThan(0);

        const fileName = items[0].name;
        await fileBrowser.selectItemByName(fileName);

        expect(selectionChanged).toBe(true);
      });

      it('should emit when multiple files are selected', async () => {
        fileBrowser.clearSelectedItems();

        const items = Array.from(model.items());
        expect(items.length).toBeGreaterThan(1);

        let selectionChanged = signalToPromise(fileBrowser.selectionChanged);
        // Select the first item
        await fileBrowser.selectItemByName(items[0].name);
        await selectionChanged;

        const itemNodes = Array.from(
          document.querySelectorAll(`.${ITEM_CLASS}`)
        );
        expect(itemNodes.length).toBeGreaterThan(1);

        selectionChanged = signalToPromise(fileBrowser.selectionChanged);

        // Select the second item with shift key to select multiple items
        simulate(
          fileBrowser.node.querySelectorAll(`.${ITEM_CLASS}`)[1]!,
          'mousedown',
          {
            shiftKey: true
          }
        );
        await selectionChanged;

        // Verify that multiple items are selected
        const selectedItems = Array.from(fileBrowser.selectedItems());
        expect(selectedItems.length).toBe(2);
      });

      it('should emit when selection is cleared', async () => {
        const items = Array.from(model.items());
        expect(items.length).toBeGreaterThan(0);
        await fileBrowser.selectItemByName(items[0].name);

        const selectedItems = Array.from(fileBrowser.selectedItems());
        expect(selectedItems.length).toBeGreaterThan(0);

        const selectionChanged = signalToPromise(fileBrowser.selectionChanged);
        fileBrowser.clearSelectedItems();
        await selectionChanged;

        const newSelectedItems = Array.from(fileBrowser.selectedItems());
        expect(newSelectedItems.length).toBe(0);
      });

      it('should emit when selection is toggled with Ctrl+Space', async () => {
        fileBrowser.clearSelectedItems();

        const items = Array.from(model.items());
        expect(items.length).toBeGreaterThan(0);

        await fileBrowser.selectItemByName(items[1].name);

        simulate(
          fileBrowser.node.querySelectorAll(`.${ITEM_CLASS}`)[1]!,
          'mousedown'
        );

        let selectedItems = Array.from(fileBrowser.selectedItems());
        expect(selectedItems.length).toBe(1);

        const selectionChanged = signalToPromise(fileBrowser.selectionChanged);

        // Simulate Ctrl+Space on the focused item
        simulate(
          fileBrowser.node.querySelectorAll(`.${ITEM_CLASS}`)[1]!,
          'keydown',
          {
            ctrlKey: true,
            key: ' ',
            keyCode: 32
          }
        );

        await selectionChanged;

        selectedItems = Array.from(fileBrowser.selectedItems());
        expect(selectedItems.length).toBe(0);
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
