// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { StatusBar } from '@jupyterlab/statusbar';
import { Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

describe('@jupyterlab/statusbar', () => {
  describe('StatusBar', () => {
    let statusBar: StatusBar;

    beforeEach(() => {
      statusBar = new StatusBar();
      Widget.attach(statusBar, document.body);
    });

    afterEach(() => {
      statusBar.parent = null;
      statusBar.dispose();
    });

    describe('#constructor()', () => {
      it('should construct a new status bar', () => {
        const statusBar = new StatusBar();
        expect(statusBar).toBeInstanceOf(StatusBar);
      });
    });

    describe('#registerStatusItem', () => {
      it('should add a new status item to the status bar', () => {
        const item = new Widget();
        expect(item.isAttached).toBe(false);
        statusBar.registerStatusItem('item', { item });
        expect(item.isAttached).toBe(true);
        expect(statusBar.contains(item)).toBe(true);
      });

      it('should raise an error if the same key is added twice', () => {
        const item1 = new Widget();
        const item2 = new Widget();
        statusBar.registerStatusItem('item', { item: item1 });
        expect(
          statusBar.registerStatusItem.bind(statusBar, 'item', { item: item2 })
        ).toThrow();
      });

      it('should put higher rank left items closer to the middle', () => {
        const item1 = new Widget();
        const item2 = new Widget();
        statusBar.registerStatusItem('item1', {
          item: item1,
          align: 'left',
          rank: 1
        });
        statusBar.registerStatusItem('item2', {
          item: item2,
          align: 'left',
          rank: 0
        });
        expect(item2.node.nextSibling).toBe(item1.node);
      });

      it('should put higher rank right items closer to the middle', () => {
        const item1 = new Widget();
        const item2 = new Widget();
        statusBar.registerStatusItem('item1', {
          item: item1,
          align: 'right',
          rank: 0
        });
        statusBar.registerStatusItem('item2', {
          item: item2,
          align: 'right',
          rank: 1
        });
        // Reverse order than what one might expect, as right-to-left
        // is set in the styling of the right panel.
        expect(item1.node.nextSibling).toBe(item2.node);
      });

      it('should allow insertion of status items in the middle', () => {
        const item = new Widget();
        statusBar.registerStatusItem('item', {
          item: item,
          align: 'middle'
        });
        expect(item.isAttached).toBe(true);
      });

      it('should only show if isActive returns true', () => {
        const item = new Widget();
        statusBar.registerStatusItem('item', {
          item,
          isActive: () => false
        });
        expect(item.isHidden).toBe(true);
      });

      it('should update whether it is shown if activeStateChanged fires', () => {
        const item = new Widget();
        let active = false;
        const isActive = () => active;
        const activeStateChanged = new Signal<any, void>({});
        statusBar.registerStatusItem('item', {
          item,
          isActive,
          activeStateChanged
        });
        expect(item.isHidden).toBe(true);
        active = true;
        activeStateChanged.emit(void 0);
        expect(item.isHidden).toBe(false);
      });

      it('should be removed from the status bar if disposed', () => {
        const item = new Widget();
        const disposable = statusBar.registerStatusItem('item', { item });
        expect(item.isVisible).toBe(true);
        disposable.dispose();
        expect(item.isVisible).toBe(false);
      });
    });

    describe('#dispose', () => {
      it('should dispose of the status bar', () => {
        expect(statusBar.isDisposed).toBe(false);
        statusBar.dispose();
        expect(statusBar.isDisposed).toBe(true);
      });

      it('should be safe to call more than once', () => {
        statusBar.dispose();
        expect(statusBar.isDisposed).toBe(true);
        statusBar.dispose();
        expect(statusBar.isDisposed).toBe(true);
      });

      it('should dispose of the status items added to it', () => {
        const item = new Widget();
        statusBar.registerStatusItem('item', { item });
        expect(item.isDisposed).toBe(false);
        statusBar.dispose();
        expect(item.isDisposed).toBe(true);
      });
    });
  });
});
