// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DocumentManager } from '@jupyterlab/docmanager';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { DocumentWidgetOpenerMock } from '@jupyterlab/docregistry/lib/testutils';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { signalToPromise } from '@jupyterlab/testing';
import { Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import expect from 'expect';
import { simulate } from 'simulate-event';
import { DirListing, FilterFileBrowserModel } from '../src';

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
  });

  describe('checkboxes', () => {
    let dirListing: TestDirListing;

    beforeEach(async () => {
      const options = createOptionsForConstructor();

      // Start with some files instead of empty before creating the DirListing.
      // This makes it easier to test checking/unchecking because after the
      // DirListing is created, whenever a file is added, the DirListing selects
      // that file, which causes the file's checkbox to be checked.
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
      Widget.detach(dirListing);
    });

    describe('file/item checkbox', () => {
      it('check initial conditions', async () => {
        expect(Array.from(dirListing.selectedItems())).toHaveLength(0);
        expect(Array.from(dirListing.sortedItems())).toHaveLength(2);
      });

      it('should be checked after item is selected', async () => {
        const itemNode = dirListing.contentNode.children[0] as HTMLElement;
        const checkbox = dirListing.renderer.getCheckboxNode!(
          itemNode
        ) as HTMLInputElement;
        expect(checkbox.checked).toBe(false);
        dirListing.selectNext();
        await signalToPromise(dirListing.updated);
        expect(checkbox.checked).toBe(true);
      });

      it('should be unchecked after item is unselected', async () => {
        const itemNode = dirListing.contentNode.children[0] as HTMLElement;
        const checkbox = dirListing.renderer.getCheckboxNode!(
          itemNode
        ) as HTMLInputElement;
        dirListing.selectNext();
        await signalToPromise(dirListing.updated);
        expect(checkbox.checked).toBe(true);
        // Selecting the next item unselects the first.
        dirListing.selectNext();
        await signalToPromise(dirListing.updated);
        expect(checkbox.checked).toBe(false);
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
        expect(checkboxes[0].checked).toBe(false);
        expect(checkboxes[1].checked).toBe(false);
        dirListing.selectNext();
        dirListing.selectNext(true); // true = keep existing selection
        await signalToPromise(dirListing.updated);
        expect(checkboxes[0].checked).toBe(true);
        expect(checkboxes[1].checked).toBe(true);
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
        await dirListing.selectItemByName(item.value.name);
        await signalToPromise(dirListing.updated);
        expect(checkbox.checked).toBe(true);
        expect(dirListing.isSelected(item.value.name)).toBe(true);
        simulate(checkbox, 'mousedown', {
          clientX: 1,
          clientY: 1,
          button: 2
        });
        await signalToPromise(dirListing.updated);
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
        it('check initial conditions', () => {
          const headerCheckbox = dirListing.renderer.getCheckboxNode!(
            dirListing.headerNode
          ) as HTMLInputElement;
          expect(headerCheckbox.checked).toBe(false);
          expect(headerCheckbox!.indeterminate).toBe(false);
          expect(Array.from(dirListing.selectedItems())).toHaveLength(0);
        });
        it('should check all', async () => {
          const headerCheckbox = dirListing.renderer.getCheckboxNode!(
            dirListing.headerNode
          ) as HTMLInputElement;
          simulate(headerCheckbox, 'click');
          await signalToPromise(dirListing.updated);
          expect(Array.from(dirListing.selectedItems())).toHaveLength(2);
        });
      });

      describe('when previously indeterminate', () => {
        beforeEach(async () => {
          dirListing.selectNext();
          await signalToPromise(dirListing.updated);
        });
        it('check initial conditions', () => {
          const headerCheckbox = dirListing.renderer.getCheckboxNode!(
            dirListing.headerNode
          ) as HTMLInputElement;
          expect(headerCheckbox.indeterminate).toBe(true);
          expect(Array.from(dirListing.selectedItems())).toHaveLength(1);
        });
        it('should uncheck all', async () => {
          const headerCheckbox = dirListing.renderer.getCheckboxNode!(
            dirListing.headerNode
          ) as HTMLInputElement;
          simulate(headerCheckbox, 'click');
          await signalToPromise(dirListing.updated);
          expect(Array.from(dirListing.selectedItems())).toHaveLength(0);
        });
      });

      describe('when previously checked', () => {
        beforeEach(async () => {
          dirListing.selectNext(true);
          dirListing.selectNext(true);
          await signalToPromise(dirListing.updated);
        });
        it('check initial conditions', () => {
          const headerCheckbox = dirListing.renderer.getCheckboxNode!(
            dirListing.headerNode
          ) as HTMLInputElement;
          expect(headerCheckbox.checked).toBe(true);
          expect(headerCheckbox.indeterminate).toBe(false);
          expect(Array.from(dirListing.selectedItems())).toHaveLength(2);
        });
        it('should uncheck all', async () => {
          const headerCheckbox = dirListing.renderer.getCheckboxNode!(
            dirListing.headerNode
          ) as HTMLInputElement;
          simulate(headerCheckbox, 'click');
          await signalToPromise(dirListing.updated);
          expect(Array.from(dirListing.selectedItems())).toHaveLength(0);
        });
      });
    });
  });
});
