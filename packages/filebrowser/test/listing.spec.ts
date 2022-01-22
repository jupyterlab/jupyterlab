// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect from 'expect';
import { simulate } from 'simulate-event';
import { toArray } from '@lumino/algorithm';
import { Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import { DocumentManager } from '@jupyterlab/docmanager';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Mock, signalToPromise } from '@jupyterlab/testutils';
import { DirListing, FilterFileBrowserModel } from '../src';

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

      // Start with some files instead of empty before creating the
      // DirListing. This makes it easier to test checking/unchecking because
      // after the DirListing is created, if a file is added, the DirListing
      // will select that file (=checkbox checked).
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
        expect(toArray(dirListing.selectedItems())).toHaveLength(0);
        expect(toArray(dirListing.sortedItems())).toHaveLength(2);
      });

      it('should be checked after item is selected', async () => {
        const itemNode = dirListing.contentNode.children[0] as HTMLElement;
        const checkbox = dirListing.renderer.getCheckboxNode!(itemNode);
        expect(checkbox.checked).toBe(false);
        dirListing.selectNext();
        await signalToPromise(dirListing.updated);
        expect(checkbox.checked).toBe(true);
      });

      it('should be unchecked after item is unselected', async () => {
        const itemNode = dirListing.contentNode.children[0] as HTMLElement;
        const checkbox = dirListing.renderer.getCheckboxNode!(itemNode);
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
        // mousedown handler to believe that the mousedown event is relevant to
        // one of its items.
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
        );
        const items = toArray(dirListing.sortedItems());
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

      // A double click on the item should open the item; however, a double
      // click on the checkbox should only check/uncheck the box.
      it('should not open item on double click', () => {
        const itemNode = dirListing.contentNode.children[0] as HTMLElement;
        const checkbox = dirListing.renderer.getCheckboxNode!(itemNode);
        const wasOpened = jest.fn();
        dirListing.onItemOpened.connect(wasOpened);
        simulate(checkbox, 'dblclick');
        expect(wasOpened).not.toHaveBeenCalled();
        dirListing.onItemOpened.disconnect(wasOpened);
      });

      // This essentially tests that preventDefault has been called on the click
      // handler (which also handles keyboard and touch "clicks" in addition to
      // mouse clicks). In other words, only the DirListing should check/uncheck
      // the checkbox, not the browser's built-in default handler for the click.
      it('should not get checked by the default action of a click', () => {
        const itemNode = dirListing.contentNode.children[0] as HTMLElement;
        const checkbox = dirListing.renderer.getCheckboxNode!(itemNode);
        expect(checkbox.checked).toBe(false);
        simulate(checkbox, 'click', { bubbles: false });
        expect(checkbox.checked).toBe(false);
      });
    });

    describe('check-all checkbox', () => {
      describe('when previously unchecked', () => {
        it('check initial conditions', () => {
          const headerCheckbox = dirListing.renderer.getCheckboxNode!(
            dirListing.headerNode
          );
          expect(headerCheckbox.checked).toBe(false);
          expect(headerCheckbox.indeterminate).toBe(false);
          expect(toArray(dirListing.selectedItems())).toHaveLength(0);
        });
        it('should check all', async () => {
          const headerCheckbox = dirListing.renderer.getCheckboxNode!(
            dirListing.headerNode
          );
          simulate(headerCheckbox, 'click');
          await signalToPromise(dirListing.updated);
          expect(toArray(dirListing.selectedItems())).toHaveLength(2);
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
          );
          expect(headerCheckbox.indeterminate).toBe(true);
          expect(toArray(dirListing.selectedItems())).toHaveLength(1);
        });
        it('should uncheck all', async () => {
          const headerCheckbox = dirListing.renderer.getCheckboxNode!(
            dirListing.headerNode
          );
          simulate(headerCheckbox, 'click');
          await signalToPromise(dirListing.updated);
          expect(toArray(dirListing.selectedItems())).toHaveLength(0);
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
          );
          expect(headerCheckbox.checked).toBe(true);
          expect(headerCheckbox.indeterminate).toBe(false);
          expect(toArray(dirListing.selectedItems())).toHaveLength(2);
        });
        it('should uncheck all', async () => {
          const headerCheckbox = dirListing.renderer.getCheckboxNode!(
            dirListing.headerNode
          );
          simulate(headerCheckbox, 'click');
          await signalToPromise(dirListing.updated);
          expect(toArray(dirListing.selectedItems())).toHaveLength(0);
        });
      });
    });
  });
});
