/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { DocumentManager } from '@jupyterlab/docmanager';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { DocumentWidgetOpenerMock } from '@jupyterlab/docregistry/lib/testutils';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import {
  framePromise,
  IFileSystemDirectoryEntryOptions,
  signalToPromise
} from '@jupyterlab/testing';
import { Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import expect from 'expect';
import { simulate } from 'simulate-event';
import { DirListing, FilterFileBrowserModel } from '../src';

const ITEM_TEXT_CLASS = 'jp-DirListing-itemText';

// Returns the minimal args needed to create a new DirListing instance
const createOptionsForConstructor: () => DirListing.IOptions = () => ({
  model: new FilterFileBrowserModel({
    manager: new DocumentManager({
      registry: new DocumentRegistry(),
      opener: new DocumentWidgetOpenerMock(),
      manager: new ServiceManagerMock()
    })
  })
});

class TestDirListing extends DirListing {
  updated = new Signal<this, void>(this);
  onUpdateRequest(...args: any[]) {
    super.onUpdateRequest.apply(this, args);
    // Allows us to spy on onUpdateRequest.
    this.updated.emit();
  }
  public get allUploaded() {
    return super.allUploaded;
  }
}

function getItemTitles(dirListing: DirListing) {
  const items = Array.from(dirListing.contentNode.children) as HTMLElement[];

  return items.map(
    node => node.querySelector('.jp-DirListing-itemText span')?.textContent
  );
}

describe('filebrowser/listing', () => {
  describe('DirListing', () => {
    let dirListing: TestDirListing;

    beforeEach(async () => {
      const options = createOptionsForConstructor();

      // Start with some files instead of empty before creating the DirListing.
      // This makes it easier to test things, for example checking/unchecking
      // because after the DirListing is created, whenever a file is added, the
      // DirListing selects that file, which causes the file's checkbox to be
      // checked.
      await options.model.manager.newUntitled({ type: 'file' });
      await options.model.manager.newUntitled({ type: 'file' });
      await options.model.manager.newUntitled({ type: 'file' });
      await options.model.manager.newUntitled({ type: 'file' });

      // Create the widget and mount it to the DOM.
      dirListing = new TestDirListing(options);
      Widget.attach(dirListing, document.body);

      // Wait for the widget to update its internal DOM state before running
      // tests.
      await signalToPromise(dirListing.updated);
    });

    afterEach(() => {
      // Dispose will detach the widget
      dirListing.dispose();
    });

    it('should reflect initial conditions', () => {
      // Check initial conditions
      const selectedItems = [...dirListing.selectedItems()];
      const sortedItems = [...dirListing.sortedItems()];
      expect(selectedItems).toHaveLength(0);
      expect(sortedItems).toHaveLength(4);
    });

    describe('#constructor', () => {
      it('should return new DirListing instance', () => {
        const options = createOptionsForConstructor();
        const dirListing = new DirListing(options);
        expect(dirListing).toBeInstanceOf(DirListing);
      });
    });

    describe('#defaultRenderer', () => {
      it('should enable scrolling when dragging items', () => {
        const options = createOptionsForConstructor();
        const dirListing = new DirListing(options);
        expect(
          dirListing.node.querySelector('[data-lm-dragscroll]')
        ).toBeDefined();
      });
    });

    describe('#handleEvent()', () => {
      it('should upload a nested folder on drag', async () => {
        const dt = new DataTransfer();
        const directoryMock: IFileSystemDirectoryEntryOptions = {
          name: 'test-dir',
          files: [
            {
              name: 'empty-dir',
              files: []
            },
            {
              name: 'file.txt',
              file: {
                bits: ['content']
              }
            },
            {
              name: 'code.py',
              file: {
                bits: ['print(1)']
              }
            }
          ]
        };
        dt.setData('directory', JSON.stringify(directoryMock));
        const event = new DragEvent('drop', { dataTransfer: dt });
        const options = createOptionsForConstructor();
        const dirListing = new TestDirListing(options);
        Widget.attach(dirListing, document.body);
        dirListing.handleEvent(event);
        await signalToPromise(dirListing.allUploaded);
        const topLevel = getItemTitles(dirListing);
        expect(topLevel).toStrictEqual(['test-dir']);
        await dirListing.model.cd('test-dir');
        const testDir = getItemTitles(dirListing);
        expect(testDir).toEqual(
          expect.arrayContaining(['empty-dir', 'file.txt', 'code.py'])
        );
      });
    });

    describe('#selectItemByName()', () => {
      it('should select item in the current directory by name', async () => {
        const name = [...dirListing.sortedItems()][2].name;
        expect(dirListing.isSelected(name)).toBe(false);
        await dirListing.selectItemByName(name);
        expect(dirListing.isSelected(name)).toBe(true);
      });

      it('should trigger update when selecting an item', async () => {
        const name = [...dirListing.sortedItems()][2].name;
        let updateEmitted = false;
        const listener = () => {
          updateEmitted = true;
        };
        dirListing.updated.connect(listener);
        await dirListing.selectItemByName(name);
        await framePromise();
        dirListing.updated.disconnect(listener);
        expect(updateEmitted).toBe(true);
      });

      it('should be a no-op if the item is already selected', async () => {
        const name = [...dirListing.sortedItems()][2].name;
        await dirListing.selectItemByName(name);
        let updateEmitted = false;
        const listener = () => {
          updateEmitted = true;
        };
        dirListing.updated.connect(listener);
        await dirListing.selectItemByName(name);
        await framePromise();
        dirListing.updated.disconnect(listener);
        expect(updateEmitted).toBe(false);
      });
    });

    describe('#rename', () => {
      it('backspace during rename does not trigger goUp method', async () => {
        dirListing.selectNext();
        const newNamePromise = dirListing.rename();
        const goUpSpy = jest.spyOn(dirListing as any, 'goUp');
        const editNode = dirListing['_editNode'];
        simulate(editNode, 'keydown', {
          key: 'Backspace',
          keyCode: 8
        });
        // Can input node's value be changed with simulated key events?
        editNode.value = 'new_name.txt';
        simulate(editNode, 'keydown', {
          key: 'Enter',
          keyCode: 13
        });
        const newName = await newNamePromise;
        expect(newName).toBe('new_name.txt');
        expect(goUpSpy).not.toHaveBeenCalled();
      });

      it('should focus item after rename', async () => {
        dirListing.selectNext();
        const newNamePromise = dirListing.rename();
        const directoryUpdated = signalToPromise(dirListing.updated);
        const editNode = dirListing['_editNode'];
        // Give it a name that should put it at the bottom
        editNode.value = 'z.txt';
        simulate(editNode, 'keydown', {
          key: 'Enter',
          keyCode: 13
        });
        await newNamePromise;
        const sortedItems = [...dirListing.sortedItems()];
        const lastIndex = sortedItems.length - 1;
        expect(sortedItems[lastIndex].name).toBe('z.txt');
        const itemNode = dirListing['_items'][lastIndex];
        await directoryUpdated;
        expect(itemNode.contains(document.activeElement)).toBe(true);
      });

      it('should keep focus on item after user presses escape key', async () => {
        dirListing.selectNext();
        const newNamePromise = dirListing.rename();
        const editNode = dirListing['_editNode'];
        simulate(editNode, 'keydown', {
          key: 'Escape',
          keyCode: 27
        });
        await newNamePromise;
        const itemNode = dirListing['_items'][0];
        expect(itemNode.contains(document.activeElement)).toBe(true);
      });
    });

    describe('#_handleMultiSelect', () => {
      it('should only select when to-index is same as from-index', () => {
        // to-index unselected
        dirListing['_focusItem'](1);
        expect(Object.keys(dirListing['selection'])).toHaveLength(0);
        dirListing['_handleMultiSelect'](1);
        expect(Object.keys(dirListing['selection'])).toHaveLength(1);

        // to-index selected
        dirListing['_selectItem'](1, false, true);
        const items = [...dirListing.sortedItems()];
        expect(dirListing['selection']).toHaveProperty([items[1].path], true);
        expect(Object.keys(dirListing['selection'])).toHaveLength(1);
        dirListing['_handleMultiSelect'](1);
        expect(dirListing['selection']).toHaveProperty([items[1].path], true);
        expect(Object.keys(dirListing['selection'])).toHaveLength(1);
      });

      describe('when to-index is selected', () => {
        // - to-index is 0
        // - from-index is 2
        beforeEach(() => {
          dirListing['_selectItem'](0, true);
          // This is outside our index range, but let's select it so we can test
          // that the function only affects the items in [from-index, to-index].
          dirListing['_selectItem'](3, true);
        });

        describe('when from-index and all items in-between are selected', () => {
          beforeEach(() => {
            dirListing['_selectItem'](1, true);
            dirListing['_selectItem'](2, true);
          });

          it('should leave to-index selected and unselect from-index and items in-between', () => {
            // Directory listing is like this:
            // 1. selected
            // 2. selected
            // 3. selected, focused
            // 4. selected
            expect(Object.keys(dirListing['selection'])).toHaveLength(4);
            dirListing['_handleMultiSelect'](0);
            // Now directory should look like:
            // - selected, unselected, unselected, selected
            const items = [...dirListing.sortedItems()];
            expect(Object.keys(dirListing['selection'])).toHaveLength(2);
            expect(dirListing['selection']).toHaveProperty(
              [items[0].path],
              true
            );
            expect(dirListing['selection']).toHaveProperty(
              [items[3].path],
              true
            );
          });
        });

        describe('when all are selected except from-index', () => {
          beforeEach(() => {
            dirListing['_selectItem'](1, true);
            dirListing['_focusItem'](2);
          });

          it('should leave to-index selected and unselect from-index and items in-between', () => {
            // Directory listing is like this:
            // 1. selected
            // 2. selected
            // 3. unselected, focused
            // 4. selected
            expect(Object.keys(dirListing['selection'])).toHaveLength(3);
            dirListing['_handleMultiSelect'](0);
            // Now directory should look like:
            // - selected, unselected, unselected, selected
            const items = [...dirListing.sortedItems()];
            expect(Object.keys(dirListing['selection'])).toHaveLength(2);
            expect(dirListing['selection']).toHaveProperty(
              [items[0].path],
              true
            );
            expect(dirListing['selection']).toHaveProperty(
              [items[3].path],
              true
            );
          });
        });

        describe('when from-index and some items in-between are not selected', () => {
          beforeEach(() => {
            dirListing['_focusItem'](2);
          });

          it('should select all in-between from- and to-index, leaving from-index unselected', () => {
            // Directory listing is like this:
            // 1. selected
            // 2. unselected
            // 3. unselected, focused
            // 4. selected
            expect(Object.keys(dirListing['selection'])).toHaveLength(2);
            dirListing['_handleMultiSelect'](0);
            // Now directory should look like:
            // - selected, selected, unselected, selected
            const items = [...dirListing.sortedItems()];
            expect(items).toHaveLength(4);
            expect(Object.keys(dirListing['selection'])).toHaveLength(3);
            expect(dirListing['selection']).not.toHaveProperty([items[2].path]);
          });
        });

        describe('when from-index is selected but some items in-between are not', () => {
          beforeEach(() => {
            dirListing['_selectItem'](2, true);
          });

          it('should select all in-between from- and to-index', () => {
            // Directory listing is like this:
            // 1. selected
            // 2. unselected
            // 3. selected, focused
            // 4. selected
            expect(Object.keys(dirListing['selection'])).toHaveLength(3);
            dirListing['_handleMultiSelect'](0);
            // Now directory should look like:
            // - selected, selected, selected, selected
            const items = [...dirListing.sortedItems()];
            expect(items).toHaveLength(4);
            expect(Object.keys(dirListing['selection'])).toHaveLength(4);
          });
        });
      });

      describe('when to-index is unselected', () => {
        // - to-index is 2
        // - from-index is 0

        beforeEach(() => {
          // This is outside our index range, but let's select it so we can test
          // that the function only affects the items in [from-index, to-index].
          dirListing['_selectItem'](3, true);
        });

        describe('when from-index and in-between items are selected', () => {
          beforeEach(() => {
            dirListing['_selectItem'](1, true);
            dirListing['_selectItem'](0, true);
          });

          it('should select all between from- and to-index', () => {
            // Directory listing is like this:
            // 1. selected, focused
            // 2. selected
            // 3. unselected [target]
            // 4. selected
            expect(Object.keys(dirListing['selection'])).toHaveLength(3);
            dirListing['_handleMultiSelect'](2);
            // Now directory should look like:
            // - selected, selected, selected, selected
            const items = [...dirListing.sortedItems()];
            expect(items).toHaveLength(4);
            expect(Object.keys(dirListing['selection'])).toHaveLength(4);
          });
        });

        describe('when from-index is unselected but in-between items are selected', () => {
          beforeEach(() => {
            dirListing['_selectItem'](1, true);
            dirListing['_focusItem'](0);
          });

          it('should select all between from- and to-index', () => {
            // Directory listing is like this:
            // 1. unselected, focused
            // 2. selected
            // 3. unselected [target]
            // 4. selected
            expect(Object.keys(dirListing['selection'])).toHaveLength(2);
            dirListing['_handleMultiSelect'](2);
            // Now directory should look like:
            // - unselected, selected, selected, selected
            const items = [...dirListing.sortedItems()];
            expect(items).toHaveLength(4);
            expect(Object.keys(dirListing['selection'])).toHaveLength(3);
            expect(dirListing['selection']).not.toHaveProperty([items[0].path]);
          });
        });
      });
    });

    describe('Enter key', () => {
      it('should not open an item unless it is selected', () => {
        // Meaning, do not open the item that is focussed if it is not also
        // selected.
        dirListing['_selectItem'](0, true);
        dirListing['_selectItem'](1, true);
        dirListing['_focusItem'](2);
        const handleOpenSpy = jest.spyOn(dirListing as any, 'handleOpen');
        const itemNode = dirListing['_items'][2];
        const nameNode = dirListing['_renderer'].getNameNode(itemNode);
        simulate(nameNode, 'keydown', {
          key: 'Enter',
          keyCode: 13
        });
        expect(handleOpenSpy).toHaveBeenCalledTimes(2);
        const sortedItems = [...dirListing.sortedItems()];
        expect(handleOpenSpy).toHaveBeenCalledWith(sortedItems[0]);
        expect(handleOpenSpy).toHaveBeenCalledWith(sortedItems[1]);
        expect(handleOpenSpy).not.toHaveBeenCalledWith(sortedItems[2]);
      });
    });

    describe('ArrowDown key', () => {
      let dirListing: TestDirListing;
      beforeEach(async () => {
        const options = createOptionsForConstructor();

        // Start with some files instead of empty before creating the DirListing.
        // This makes it easier to test checking/unchecking because after the
        // DirListing is created, whenever a file is added, the DirListing selects
        // that file, which causes the file's checkbox to be checked.
        await options.model.manager.newUntitled({ type: 'file' });
        await options.model.manager.newUntitled({ type: 'file' });
        await options.model.manager.newUntitled({ type: 'file' });

        // Create the widget and mount it to the DOM.
        dirListing = new TestDirListing(options);
        Widget.attach(dirListing, document.body);

        // Wait for the widget to update its internal DOM state before running
        // tests.
        await signalToPromise(dirListing.updated);
      });

      it('should select first item when nothing is selected', async () => {
        simulate(
          dirListing.node.querySelector(`.${ITEM_TEXT_CLASS}`)!,
          'keydown',
          {
            key: 'ArrowDown',
            keyCode: 40
          }
        );
        await signalToPromise(dirListing.updated);
        const sortedItems = [...dirListing.sortedItems()];
        const selectedItems = [...dirListing.selectedItems()];
        expect(selectedItems).toHaveLength(1);
        expect(selectedItems[0]).toBe(sortedItems[0]);
      });

      it('should select second item once first item is selected', async () => {
        dirListing['_selectItem'](0, false);
        simulate(
          dirListing.node.querySelector(`.${ITEM_TEXT_CLASS}`)!,
          'keydown',
          {
            key: 'ArrowDown',
            keyCode: 40
          }
        );
        await signalToPromise(dirListing.updated);
        const sortedItems = [...dirListing.sortedItems()];
        const selectedItems = [...dirListing.selectedItems()];
        expect(selectedItems).toHaveLength(1);
        expect(selectedItems[0]).toBe(sortedItems[1]);
      });

      describe('when pressing shift key and next item is selected', () => {
        it('should unselect if current item is selected and previous is unselected', async () => {
          dirListing['_selectItem'](2, true);
          dirListing['_selectItem'](1, true);
          // This should be the state:
          // - unselected
          // - selected, focussed
          // - selected
          await signalToPromise(dirListing.updated);
          simulate(
            dirListing.node.querySelector(`.${ITEM_TEXT_CLASS}`)!,
            'keydown',
            {
              key: 'ArrowDown',
              keyCode: 40,
              shiftKey: true
            }
          );
          await signalToPromise(dirListing.updated);
          // Now it should be:
          // - unselected
          // - unselected
          // - selected, focussed
          const sortedItems = [...dirListing.sortedItems()];
          const selectedItems = [...dirListing.selectedItems()];
          expect(selectedItems).toHaveLength(1);
          expect(selectedItems[0]).toBe(sortedItems[2]);
        });

        it('should leave selected otherwise', async () => {
          dirListing['_selectItem'](0, true);
          dirListing['_selectItem'](2, true);
          dirListing['_selectItem'](1, true);
          // This should be the state:
          // - selected
          // - selected, focussed
          // - selected
          await signalToPromise(dirListing.updated);
          simulate(dirListing.node, 'keydown', {
            key: 'ArrowDown',
            keyCode: 40,
            shiftKey: true
          });
          await signalToPromise(dirListing.updated);
          // Now it should be:
          // - selected
          // - selected
          // - selected, focussed
          const sortedItems = [...dirListing.sortedItems()];
          const selectedItems = [...dirListing.selectedItems()];
          expect(selectedItems).toHaveLength(3);
          expect(sortedItems).toHaveLength(3);
        });
      });
    });

    describe('checkboxes', () => {
      const ariaSelectAll = 'Select all files and directories';
      const ariaDeselectAll = 'Deselect all files and directories';
      const ariaSelectFile = (filename: string | null) =>
        `Select file "${filename}"`;
      const ariaDeselectFile = (filename: string | null) =>
        `Deselect file "${filename}"`;

      describe('file/item checkbox', () => {
        it('should be checked after item is selected', async () => {
          const itemNode = dirListing.contentNode.children[0] as HTMLElement;
          const checkbox = dirListing.renderer.getCheckboxNode!(
            itemNode
          ) as HTMLInputElement;
          expect(checkbox.checked).toBe(false);
          const nameNode = dirListing.renderer.getNameNode!(
            itemNode
          ) as HTMLElement;
          expect(checkbox.getAttribute('aria-label')).toBe(
            ariaSelectFile(nameNode.textContent)
          );
          dirListing.selectNext();
          await signalToPromise(dirListing.updated);
          expect(checkbox.checked).toBe(true);
          expect(checkbox.getAttribute('aria-label')).toBe(
            ariaDeselectFile(nameNode.textContent)
          );
        });

        it('should be unchecked after item is unselected', async () => {
          const itemNode = dirListing.contentNode.children[0] as HTMLElement;
          const checkbox = dirListing.renderer.getCheckboxNode!(
            itemNode
          ) as HTMLInputElement;
          const nameNode = dirListing.renderer.getNameNode!(
            itemNode
          ) as HTMLElement;
          dirListing.selectNext();
          await signalToPromise(dirListing.updated);
          expect(checkbox.checked).toBe(true);
          expect(checkbox.getAttribute('aria-label')).toBe(
            ariaDeselectFile(nameNode.textContent)
          );
          // Selecting the next item unselects the first.
          dirListing.selectNext();
          await signalToPromise(dirListing.updated);
          expect(checkbox.checked).toBe(false);
          expect(checkbox.getAttribute('aria-label')).toBe(
            ariaSelectFile(nameNode.textContent)
          );
        });

        it('should allow selecting multiple items', async () => {
          const itemNodes = Array.from(
            dirListing.contentNode.children
          ) as HTMLElement[];
          // JSDOM doesn't render anything, which means that all the elements have
          // zero dimensions, so this is needed in order for the DirListing
          // mousedown handler to believe that the mousedown event is relevant.
          itemNodes[0].getBoundingClientRect = (): any => ({
            left: 0,
            right: 10,
            top: 0,
            bottom: 10
          });
          itemNodes[1].getBoundingClientRect = (): any => ({
            left: 0,
            right: 10,
            top: 10,
            bottom: 20
          });
          const checkboxes = itemNodes.map(node =>
            dirListing.renderer.getCheckboxNode!(node)
          ) as HTMLInputElement[];
          const items = Array.from(dirListing.sortedItems());
          expect(dirListing.isSelected(items[0].name)).toBe(false);
          expect(dirListing.isSelected(items[1].name)).toBe(false);
          simulate(checkboxes[0], 'mousedown', {
            clientX: 1,
            clientY: 1
          });
          simulate(checkboxes[1], 'mousedown', {
            clientX: 1,
            clientY: 11
          });
          await signalToPromise(dirListing.updated);
          expect(dirListing.isSelected(items[0].name)).toBe(true);
          expect(dirListing.isSelected(items[1].name)).toBe(true);
        });

        it('should reflect multiple items selected', async () => {
          const itemNodes = Array.from(
            dirListing.contentNode.children
          ) as HTMLElement[];
          const checkboxes = itemNodes.map(node =>
            dirListing.renderer.getCheckboxNode!(node)
          ) as HTMLInputElement[];
          const nameNodes = itemNodes.map(node =>
            dirListing.renderer.getNameNode!(node)
          ) as HTMLElement[];
          expect(checkboxes[0].checked).toBe(false);
          expect(checkboxes[1].checked).toBe(false);
          expect(checkboxes[0].getAttribute('aria-label')).toBe(
            ariaSelectFile(nameNodes[0].textContent)
          );
          expect(checkboxes[1].getAttribute('aria-label')).toBe(
            ariaSelectFile(nameNodes[1].textContent)
          );
          dirListing.selectNext();
          dirListing.selectNext(true); // true = keep existing selection
          await signalToPromise(dirListing.updated);
          expect(checkboxes[0].checked).toBe(true);
          expect(checkboxes[1].checked).toBe(true);
          expect(checkboxes[0].getAttribute('aria-label')).toBe(
            ariaDeselectFile(nameNodes[0].textContent)
          );
          expect(checkboxes[1].getAttribute('aria-label')).toBe(
            ariaDeselectFile(nameNodes[1].textContent)
          );
        });

        // A double click on the item should open the item; however, a double
        // click on the checkbox should only check/uncheck the box.
        it('should not open item on double click', () => {
          const itemNode = dirListing.contentNode.children[0] as HTMLElement;
          const checkbox = dirListing.renderer.getCheckboxNode!(
            itemNode
          ) as HTMLInputElement;
          const wasOpened = jest.fn();
          dirListing.onItemOpened.connect(wasOpened);
          simulate(checkbox, 'dblclick');
          expect(wasOpened).not.toHaveBeenCalled();
          dirListing.onItemOpened.disconnect(wasOpened);
        });

        it('should not become unchecked due to right-click on selected item', async () => {
          const itemNode = dirListing.contentNode.children[0] as HTMLElement;
          itemNode.getBoundingClientRect = (): any => ({
            left: 0,
            right: 10,
            top: 0,
            bottom: 10
          });
          const checkbox = dirListing.renderer.getCheckboxNode!(
            itemNode
          ) as HTMLInputElement;
          const item = dirListing.sortedItems().next();
          const waitForUpdate = signalToPromise(dirListing.updated);
          await dirListing.selectItemByName(item.value.name);
          await waitForUpdate;
          expect(checkbox.checked).toBe(true);
          expect(dirListing.isSelected(item.value.name)).toBe(true);
          const waitForUpdate2 = signalToPromise(dirListing.updated);
          simulate(checkbox, 'mousedown', {
            clientX: 1,
            clientY: 1,
            button: 2
          });
          await waitForUpdate2;
          // Item is still selected and checkbox is still checked after
          // right-click.
          expect(dirListing.isSelected(item.value.name)).toBe(true);
          expect(checkbox.checked).toBe(true);
        });

        // This essentially tests that preventDefault has been called on the click
        // handler (which also handles keyboard and touch "clicks" in addition to
        // mouse clicks). In other words, only the DirListing should check/uncheck
        // the checkbox, not the browser's built-in default handler for the click.
        it('should not get checked by the default action of a click', () => {
          const itemNode = dirListing.contentNode.children[0] as HTMLElement;
          const checkbox = dirListing.renderer.getCheckboxNode!(
            itemNode
          ) as HTMLInputElement;
          expect(checkbox.checked).toBe(false);
          simulate(checkbox, 'click', { bubbles: false });
          expect(checkbox.checked).toBe(false);
        });
      });

      describe('check-all checkbox', () => {
        it('should be unchecked when the current directory is empty', async () => {
          const { path } = await dirListing.model.manager.newUntitled({
            type: 'directory'
          });
          await dirListing.model.cd(path);
          await signalToPromise(dirListing.updated);
          const headerCheckbox = dirListing.renderer.getCheckboxNode!(
            dirListing.headerNode
          ) as HTMLInputElement;
          expect(headerCheckbox.checked).toBe(false);
          expect(headerCheckbox!.indeterminate).toBe(false);
        });

        describe('when previously unchecked', () => {
          const expectInitialConditions = () => {
            const headerCheckbox = dirListing.renderer.getCheckboxNode!(
              dirListing.headerNode
            ) as HTMLInputElement;
            expect(headerCheckbox.checked).toBe(false);
            expect(headerCheckbox!.indeterminate).toBe(false);
            expect(Array.from(dirListing.selectedItems())).toHaveLength(0);
            expect(headerCheckbox.getAttribute('aria-label')).toBe(
              ariaSelectAll
            );
          };
          it('should check all', async () => {
            expectInitialConditions();
            const headerCheckbox = dirListing.renderer.getCheckboxNode!(
              dirListing.headerNode
            ) as HTMLInputElement;
            simulate(headerCheckbox, 'click');
            await signalToPromise(dirListing.updated);
            expect(headerCheckbox.checked).toBe(true);
            expect(headerCheckbox.indeterminate).toBe(false);
            expect(Array.from(dirListing.selectedItems())).toHaveLength(4);
            expect(headerCheckbox.getAttribute('aria-label')).toBe(
              ariaDeselectAll
            );
          });
        });

        describe('when previously indeterminate', () => {
          beforeEach(async () => {
            dirListing.selectNext();
            await signalToPromise(dirListing.updated);
          });

          const expectInitialConditions = () => {
            const headerCheckbox = dirListing.renderer.getCheckboxNode!(
              dirListing.headerNode
            ) as HTMLInputElement;
            expect(headerCheckbox.indeterminate).toBe(true);
            expect(headerCheckbox.checked).toBe(false);
            expect(Array.from(dirListing.selectedItems())).toHaveLength(1);
            expect(headerCheckbox.getAttribute('aria-label')).toBe(
              ariaDeselectAll
            );
          };
          it('should uncheck all', async () => {
            expectInitialConditions();
            const headerCheckbox = dirListing.renderer.getCheckboxNode!(
              dirListing.headerNode
            ) as HTMLInputElement;
            simulate(headerCheckbox, 'click');
            await signalToPromise(dirListing.updated);
            expect(headerCheckbox.checked).toBe(false);
            expect(headerCheckbox.indeterminate).toBe(false);
            expect(Array.from(dirListing.selectedItems())).toHaveLength(0);
            expect(headerCheckbox.getAttribute('aria-label')).toBe(
              ariaSelectAll
            );
          });
        });

        describe('when previously checked', () => {
          beforeEach(async () => {
            // Select/check all items
            dirListing.selectNext(true);
            dirListing.selectNext(true);
            dirListing.selectNext(true);
            dirListing.selectNext(true);
            await signalToPromise(dirListing.updated);
          });
          const expectInitialConditions = () => {
            const headerCheckbox = dirListing.renderer.getCheckboxNode!(
              dirListing.headerNode
            ) as HTMLInputElement;
            expect(headerCheckbox.checked).toBe(true);
            expect(headerCheckbox.indeterminate).toBe(false);
            expect(Array.from(dirListing.selectedItems())).toHaveLength(4);
          };
          it('should uncheck all', async () => {
            expectInitialConditions();
            const headerCheckbox = dirListing.renderer.getCheckboxNode!(
              dirListing.headerNode
            ) as HTMLInputElement;
            simulate(headerCheckbox, 'click');
            await signalToPromise(dirListing.updated);
            expect(headerCheckbox.checked).toBe(false);
            expect(headerCheckbox.indeterminate).toBe(false);
            expect(Array.from(dirListing.selectedItems())).toHaveLength(0);
          });
        });
      });
    });

    describe('should sort correctly', () => {
      beforeEach(async () => {
        const options = createOptionsForConstructor();

        const files: {
          name: string;
          type: 'file' | 'directory' | 'notebook';
        }[] = [
          { name: '1.txt', type: 'file' },
          { name: '2', type: 'directory' },
          { name: '3.ipynb', type: 'notebook' },
          { name: '4.txt', type: 'file' },
          { name: '5', type: 'directory' },
          { name: '6.ipynb', type: 'notebook' }
        ];

        // Create files that can be sorted alphabetically
        for (const file of files) {
          const model = await options.model.manager.newUntitled({
            type: file.type
          });
          await options.model.manager.rename(model.path, file.name);
        }

        // Create the widget and mount it to the DOM.
        dirListing = new TestDirListing(options);
        Widget.attach(dirListing, document.body);

        // Wait for the widget to update its internal DOM state before running
        // tests.
        await signalToPromise(dirListing.updated);
      });

      describe('with sortNotebooksFirst set to false', () => {
        it('should sort alphabetically ascending correctly', async () => {
          dirListing.sort({
            direction: 'ascending',
            key: 'name'
          });
          await signalToPromise(dirListing.updated);
          expect(getItemTitles(dirListing)).toEqual([
            '2',
            '5',
            '1.txt',
            '3.ipynb',
            '4.txt',
            '6.ipynb'
          ]);
        });
        it('should sort alphabetically descending correctly', async () => {
          dirListing.sort({
            direction: 'descending',
            key: 'name'
          });
          await signalToPromise(dirListing.updated);
          expect(getItemTitles(dirListing)).toEqual([
            '5',
            '2',
            '6.ipynb',
            '4.txt',
            '3.ipynb',
            '1.txt'
          ]);
        });
      });

      describe('with sortNotebooksFirst set to true', () => {
        it('should sort alphabetically ascending correctly', async () => {
          dirListing.sort({
            direction: 'ascending',
            key: 'name'
          });
          await signalToPromise(dirListing.updated);
          dirListing.setNotebooksFirstSorting(true);
          await signalToPromise(dirListing.updated);
          expect(getItemTitles(dirListing)).toEqual([
            '2',
            '5',
            '3.ipynb',
            '6.ipynb',
            '1.txt',
            '4.txt'
          ]);
        });
        it('should sort alphabetically descending correctly', async () => {
          dirListing.setNotebooksFirstSorting(true);
          await signalToPromise(dirListing.updated);
          dirListing.sort({
            direction: 'descending',
            key: 'name'
          });
          await signalToPromise(dirListing.updated);
          expect(getItemTitles(dirListing)).toEqual([
            '5',
            '2',
            '6.ipynb',
            '3.ipynb',
            '4.txt',
            '1.txt'
          ]);
        });
      });

      describe('with sortNotebooksFirst toggled on/off', () => {
        it('should sort correctly when switching between options', async () => {
          dirListing.sort({
            direction: 'descending',
            key: 'last_modified'
          });
          await signalToPromise(dirListing.updated);
          expect(getItemTitles(dirListing)).toEqual([
            '2',
            '5',
            '1.txt',
            '3.ipynb',
            '4.txt',
            '6.ipynb'
          ]);

          dirListing.setNotebooksFirstSorting(true);
          await signalToPromise(dirListing.updated);
          expect(getItemTitles(dirListing)).toEqual([
            '2',
            '5',
            '3.ipynb',
            '6.ipynb',
            '1.txt',
            '4.txt'
          ]);

          dirListing.setNotebooksFirstSorting(false);
          await signalToPromise(dirListing.updated);
          expect(getItemTitles(dirListing)).toEqual([
            '2',
            '5',
            '1.txt',
            '3.ipynb',
            '4.txt',
            '6.ipynb'
          ]);
        });
      });
    });
  });
});
