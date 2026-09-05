// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { WindowedList, WindowedListModel } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';
import { ObservableList } from '@jupyterlab/observables';

const FIXED_ESTIMATED_SIZE = 100;

class TestModel extends WindowedListModel {
  estimateWidgetSize = (_index: number): number => {
    return FIXED_ESTIMATED_SIZE;
  };
  widgetRenderer = (_index: number): Widget => {
    return new Widget();
  };
}

describe('@jupyterlab/ui-components', () => {
  describe('WindowedListModel', () => {
    describe('#onListChanged()', () => {
      it('should increase size when new item gets added', () => {
        const itemsList = new ObservableList({
          values: [1]
        });
        const model = new TestModel({ itemsList });
        model.windowingActive = true;
        expect(model.getEstimatedTotalSize()).toBe(FIXED_ESTIMATED_SIZE);
        itemsList.pushAll([2]);
        expect(model.getEstimatedTotalSize()).toBe(2 * FIXED_ESTIMATED_SIZE);
      });
      it('should keep measured size when new item gets added at the back', () => {
        const itemsList = new ObservableList({
          values: ['a']
        });
        const model = new TestModel({ itemsList });
        model.windowingActive = true;
        model.setWidgetSize([
          {
            index: 0,
            size: 10
          }
        ]);
        expect(model.getEstimatedTotalSize()).toBe(10);
        itemsList.pushAll(['b']);
        expect(model.getEstimatedTotalSize()).toBe(FIXED_ESTIMATED_SIZE + 10);
      });
      it('should keep measured size when new item gets added in front', () => {
        const itemsList = new ObservableList({
          values: ['b']
        });
        const model = new TestModel({ itemsList });
        model.windowingActive = true;
        model.setWidgetSize([
          {
            index: 0,
            size: 10
          }
        ]);
        expect(model.getEstimatedTotalSize()).toBe(10);
        itemsList.insert(0, 'a');
        expect(model.getEstimatedTotalSize()).toBe(FIXED_ESTIMATED_SIZE + 10);
      });
      it('should regenerate offsets when new item gets added', () => {
        const itemsList = new ObservableList({
          values: ['a', 'b']
        });
        const model = new TestModel({ itemsList });
        const getOffset = (index: number) => {
          return model.getSpan(index, index)[0];
        };
        model.windowingActive = true;
        model.setWidgetSize([
          {
            index: 0,
            size: 10
          }
        ]);
        expect(getOffset(1)).toBe(10);
        itemsList.insert(0, 'c');
        expect(getOffset(2)).toBe(FIXED_ESTIMATED_SIZE + 10);
      });
    });
    describe('#setWidgetSize()', () => {
      it('should update sizes', () => {
        const model = new TestModel({
          itemsList: new ObservableList({
            values: [1, 2, 3]
          })
        });
        model.windowingActive = true;
        const getTotalSize = () => {
          return model.getEstimatedTotalSize();
        };
        expect(getTotalSize()).toBe(3 * FIXED_ESTIMATED_SIZE);
        model.setWidgetSize([
          {
            index: 0,
            size: 10
          }
        ]);
        expect(getTotalSize()).toBe(2 * FIXED_ESTIMATED_SIZE + 10);
        model.setWidgetSize([
          {
            index: 1,
            size: 20
          }
        ]);
        expect(getTotalSize()).toBe(1 * FIXED_ESTIMATED_SIZE + 10 + 20);
        model.setWidgetSize([
          {
            index: 1,
            size: 15
          },
          {
            index: 2,
            size: 25
          }
        ]);
        expect(getTotalSize()).toBe(10 + 15 + 25);
      });
      it('should update offsets', () => {
        const model = new TestModel({
          itemsList: new ObservableList({
            values: [1, 2, 3]
          })
        });
        model.windowingActive = true;
        const getOffset = (index: number) => {
          return model.getSpan(index, index)[0];
        };
        expect(getOffset(0)).toBe(0);
        expect(getOffset(1)).toBe(100);
        model.setWidgetSize([
          {
            index: 0,
            size: 10
          }
        ]);
        expect(getOffset(0)).toBe(0);
        expect(getOffset(1)).toBe(10);

        model.setWidgetSize([
          {
            index: 1,
            size: 20
          }
        ]);

        expect(getOffset(0)).toBe(0);
        expect(getOffset(1)).toBe(10);
        expect(getOffset(2)).toBe(10 + 20);

        model.setWidgetSize([
          {
            index: 0,
            size: 50
          }
        ]);
        expect(getOffset(0)).toBe(0);
        expect(getOffset(1)).toBe(50);
        expect(getOffset(2)).toBe(50 + 20);
      });
      it('should correctly update offsets if only few cells change size', () => {
        const model = new TestModel({
          itemsList: new ObservableList({
            values: [0, 1, 2, 3, 4]
          })
        });
        model.windowingActive = true;
        const getOffset = (index: number) => {
          return model.getSpan(index, index)[0];
        };
        model.setWidgetSize([
          {
            index: 0,
            size: 10
          },
          {
            index: 1,
            size: 10
          },
          {
            index: 2,
            size: 10
          },
          {
            index: 3,
            size: 10
          },
          {
            index: 4,
            size: 10
          }
        ]);
        expect(getOffset(3)).toBe(30);
        expect(getOffset(4)).toBe(40);
        expect(getOffset(5)).toBe(50);
        model.setWidgetSize([
          {
            index: 0,
            size: 13
          },
          {
            index: 2,
            size: 13
          }
        ]);
        expect(getOffset(3)).toBe(36);
        expect(getOffset(4)).toBe(46);
        expect(getOffset(5)).toBe(56);
      });
      it('should keep offset the same if cell height changes balance out', () => {
        const model = new TestModel({
          itemsList: new ObservableList({
            values: [1, 2, 3]
          })
        });
        model.windowingActive = true;
        const getOffset = (index: number) => {
          return model.getSpan(index, index)[0];
        };
        model.setWidgetSize([
          {
            index: 0,
            size: 20
          },
          {
            index: 1,
            size: 10
          }
        ]);
        expect(getOffset(2)).toBe(30);
        model.setWidgetSize([
          {
            index: 0,
            size: 10
          },
          {
            index: 1,
            size: 20
          }
        ]);
        expect(getOffset(2)).toBe(30);
      });
    });
  });

  describe('WindowedList', () => {
    let list: WindowedList;
    let model: TestModel;

    const expectPending = async (promise: Promise<void>): Promise<void> => {
      let settled: string | null = null;
      promise.then(
        () => (settled = 'resolved'),
        () => (settled = 'rejected')
      );
      // Flush microtasks without waiting for the update animation frame.
      await Promise.resolve();
      await Promise.resolve();
      expect(settled).toBeNull();
    };

    beforeEach(() => {
      model = new TestModel({
        itemsList: new ObservableList({
          values: Array.from({ length: 100 }, (_, i) => i)
        })
      });
      model.windowingActive = true;
      list = new WindowedList({ model });
      Widget.attach(list, document.body);
      // In JSDOM `getComputedStyle().paddingTop` is empty, which yields NaN.
      model.paddingTop = 0;
    });

    afterEach(() => {
      // Cancel any outstanding scroll request so that no timers are left.
      list.outerNode.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
      Widget.detach(list);
      list.dispose();
    });

    describe('#scrollToItem()', () => {
      it('should reject the pending scroll when the user scrolls with the wheel', async () => {
        const promise = list.scrollToItem(50);
        list.outerNode.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
        await expect(promise).rejects.toMatch('cancelled');
      });

      it('should reject the pending scroll when the user presses PageDown', async () => {
        const promise = list.scrollToItem(50);
        list.outerNode.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'PageDown' })
        );
        await expect(promise).rejects.toMatch('cancelled');
      });

      it('should reject the pending scroll on scrolling keys outside of text editing', async () => {
        const promise = list.scrollToItem(50);
        list.outerNode.dispatchEvent(
          new KeyboardEvent('keydown', { key: ' ' })
        );
        await expect(promise).rejects.toMatch('cancelled');
      });

      it('should reject the pending scroll on touch scrolling', async () => {
        const promise = list.scrollToItem(50);
        list.outerNode.dispatchEvent(new Event('touchmove'));
        await expect(promise).rejects.toMatch('cancelled');
      });

      it('should reject the pending scroll on middle-click (autoscroll)', async () => {
        const promise = list.scrollToItem(50);
        list.outerNode.dispatchEvent(
          new MouseEvent('mousedown', { button: 1 })
        );
        await expect(promise).rejects.toMatch('cancelled');
      });

      it('should not settle the pending scroll on non-scrolling keys', async () => {
        const promise = list.scrollToItem(50);
        list.outerNode.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowDown' })
        );
        await expectPending(promise);
      });

      it('should not settle the pending scroll on ctrl+wheel (zoom)', async () => {
        const promise = list.scrollToItem(50);
        list.outerNode.dispatchEvent(
          new WheelEvent('wheel', { deltaY: 100, ctrlKey: true })
        );
        await expectPending(promise);
      });

      it('should not settle the pending scroll on horizontal-only wheel', async () => {
        const promise = list.scrollToItem(50);
        list.outerNode.dispatchEvent(
          new WheelEvent('wheel', { deltaX: 100, deltaY: 0 })
        );
        await expectPending(promise);
      });

      it('should not settle the pending scroll on modified PageDown (e.g. tab switching)', async () => {
        const promise = list.scrollToItem(50);
        list.outerNode.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'PageDown', ctrlKey: true })
        );
        await expectPending(promise);
      });

      it('should not settle the pending scroll on PageDown during IME composition', async () => {
        const promise = list.scrollToItem(50);
        list.outerNode.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'PageDown', isComposing: true })
        );
        await expectPending(promise);
      });

      it('should not settle the pending scroll on scrolling keys in text editing context', async () => {
        const editable = document.createElement('div');
        editable.setAttribute('contenteditable', 'true');
        list.viewportNode.appendChild(editable);
        const promise = list.scrollToItem(50);
        editable.dispatchEvent(
          new KeyboardEvent('keydown', { key: ' ', bubbles: true })
        );
        await expectPending(promise);
      });

      it('should not settle the pending scroll on primary-button press on the content', async () => {
        const promise = list.scrollToItem(50);
        list.viewportNode.dispatchEvent(
          new MouseEvent('mousedown', { button: 0, bubbles: true })
        );
        await expectPending(promise);
      });

      it('should not settle the pending scroll on scroll events', async () => {
        // Cancellation must not be keyed on `scroll` events: programmatic
        // scrolling (including the scrollback itself) fires them too and
        // cancelling based on them proved flaky (see #18973).
        const promise = list.scrollToItem(50);
        list.outerNode.dispatchEvent(new Event('scroll'));
        await expectPending(promise);
      });

      it('should resolve the pending scroll when no cancelling input occurs', async () => {
        await expect(list.scrollToItem(50)).resolves.toBeUndefined();
      });

      it('should reject the pending scroll when superseded by a new request', async () => {
        const promise = list.scrollToItem(50);
        const superseding = list.scrollToItem(10);
        await expect(promise).rejects.toMatch('new item');
        await expect(superseding).resolves.toBeUndefined();
      });

      it('should not cancel while windowing is inactive and cancel once it is re-enabled', async () => {
        model.windowingActive = false;
        const promise = list.scrollToItem(50);
        list.outerNode.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
        // In non-windowed mode the scroll completes normally:
        // user input must not reject it (no cancellation applies).
        await expect(promise).resolves.toBeUndefined();

        // Once windowing is re-enabled the listeners are re-registered
        // and the cancellation applies again.
        model.windowingActive = true;
        const promise2 = list.scrollToItem(60);
        list.outerNode.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
        await expect(promise2).rejects.toMatch('cancelled');
      });

      it('should not emit jumped when the user cancels a minimap jump', async () => {
        const model2 = new TestModel({
          itemsList: new ObservableList({
            values: Array.from({ length: 100 }, (_, i) => i)
          })
        });
        model2.windowingActive = true;
        class ExposedList extends WindowedList {
          get jumpedSignal() {
            return this.jumped;
          }
        }
        const list2 = new ExposedList({ model: model2, scrollbar: true });
        Widget.attach(list2, document.body);
        model2.paddingTop = 0;
        try {
          const jumps: number[] = [];
          list2.jumpedSignal.connect((_, index) => {
            jumps.push(index);
          });
          // Render the scrollbar items.
          list2.update();
          await new Promise(resolve => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
          });
          const item = list2.node.querySelector('[data-index="30"]')!;
          expect(item).not.toBeNull();

          // A wheel arriving while the jump is in flight cancels it:
          // `jumped` should not be emitted as the target was never reached.
          item.dispatchEvent(new Event('pointerdown', { bubbles: true }));
          list2.outerNode.dispatchEvent(
            new WheelEvent('wheel', { deltaY: 100 })
          );
          await new Promise(resolve => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
          });
          expect(jumps).toEqual([]);

          // An undisturbed jump completes and emits `jumped`. Re-query the
          // item as the scrollbar content is re-rendered on each update.
          const freshItem = list2.node.querySelector('[data-index="30"]')!;
          freshItem.dispatchEvent(new Event('pointerdown', { bubbles: true }));
          while (jumps.length === 0) {
            await new Promise(resolve => {
              requestAnimationFrame(resolve);
            });
          }
          expect(jumps).toEqual([30]);
        } finally {
          list2.dispose();
        }
      });

      it('should restore the view model offset when cancelled before the update', async () => {
        const promise = list.scrollToItem(50);
        // The model should point at the target of the pending scroll.
        expect(model.scrollOffset).toBeGreaterThan(0);
        list.outerNode.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
        // The model should be back in sync with the actual scroll position.
        expect(model.scrollOffset).toBe(list.outerNode.scrollTop);
        await promise.catch(() => undefined);
      });
    });
  });
});
