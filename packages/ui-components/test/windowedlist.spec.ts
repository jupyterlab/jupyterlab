// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { framePromise } from '@jupyterlab/testing';
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
      it('should update the size of an item to zero', () => {
        const model = new TestModel({
          itemsList: new ObservableList({
            values: [1, 2]
          })
        });
        model.windowingActive = true;
        expect(model.getEstimatedTotalSize()).toBe(2 * FIXED_ESTIMATED_SIZE);
        model.setWidgetSize([
          {
            index: 0,
            size: 0
          }
        ]);
        expect(model.getEstimatedTotalSize()).toBe(FIXED_ESTIMATED_SIZE);
      });
    });
    describe('#getSpan()', () => {
      it('should fall back to estimated size for connected widgets with zero height', () => {
        const widget0 = new Widget();
        const widget1 = new Widget();
        Widget.attach(widget0, document.body);
        Widget.attach(widget1, document.body);
        widget1.node.style.display = 'none';

        jest
          .spyOn(widget0.node, 'getBoundingClientRect')
          .mockReturnValue({ height: 80 } as DOMRect);
        jest
          .spyOn(widget1.node, 'getBoundingClientRect')
          .mockReturnValue({ height: 0 } as DOMRect);

        class SpanTestModel extends WindowedListModel {
          estimateWidgetSize = (_index: number): number => FIXED_ESTIMATED_SIZE;
          widgetRenderer = (index: number): Widget =>
            index === 0 ? widget0 : widget1;
        }

        const model = new SpanTestModel({
          itemsList: new ObservableList({ values: ['a', 'b'] })
        });
        model.windowingActive = true;

        const [top, height] = model.getSpan(0, 1);
        expect(top).toBe(0);
        // Widget 0 has measured height 80, widget 1 has estimated height FIXED_ESTIMATED_SIZE (100)
        expect(height).toBe(80 + FIXED_ESTIMATED_SIZE);
        expect(model.getEstimatedTotalSize()).toBe(80 + FIXED_ESTIMATED_SIZE);

        Widget.detach(widget0);
        Widget.detach(widget1);
      });

      it('should estimate a connected widget with zero height once', () => {
        const widget0 = new Widget();
        const widget1 = new Widget();
        Widget.attach(widget0, document.body);
        Widget.attach(widget1, document.body);
        widget1.node.style.display = 'none';

        jest
          .spyOn(widget0.node, 'getBoundingClientRect')
          .mockReturnValue({ height: 80 } as DOMRect);
        const getRect = jest
          .spyOn(widget1.node, 'getBoundingClientRect')
          .mockReturnValue({ height: 0 } as DOMRect);

        class SpanTestModel extends WindowedListModel {
          estimateWidgetSize = (_index: number): number => FIXED_ESTIMATED_SIZE;
          widgetRenderer = (index: number): Widget =>
            index === 0 ? widget0 : widget1;
        }

        const model = new SpanTestModel({
          itemsList: new ObservableList({ values: ['a', 'b'] })
        });
        model.windowingActive = true;

        model.getSpan(0, 1);
        model.getSpan(0, 1);
        expect(getRect).toHaveBeenCalledTimes(1);

        Widget.detach(widget0);
        Widget.detach(widget1);
      });

      it('should measure a hidden connected widget as empty', () => {
        const widget0 = new Widget();
        const widget1 = new Widget();
        Widget.attach(widget0, document.body);
        Widget.attach(widget1, document.body);
        widget1.hide();

        jest
          .spyOn(widget0.node, 'getBoundingClientRect')
          .mockReturnValue({ height: 80 } as DOMRect);
        jest
          .spyOn(widget1.node, 'getBoundingClientRect')
          .mockReturnValue({ height: 0 } as DOMRect);

        class SpanTestModel extends WindowedListModel {
          estimateWidgetSize = (_index: number): number => FIXED_ESTIMATED_SIZE;
          widgetRenderer = (index: number): Widget =>
            index === 0 ? widget0 : widget1;
        }

        const model = new SpanTestModel({
          itemsList: new ObservableList({ values: ['a', 'b'] })
        });
        model.windowingActive = true;

        const [, height] = model.getSpan(0, 1);
        expect(height).toBe(80);

        Widget.detach(widget0);
        Widget.detach(widget1);
      });

      it('should use measured height for connected widgets with positive height', () => {
        const widget0 = new Widget();
        const widget1 = new Widget();
        Widget.attach(widget0, document.body);
        Widget.attach(widget1, document.body);

        jest
          .spyOn(widget0.node, 'getBoundingClientRect')
          .mockReturnValue({ height: 80 } as DOMRect);
        jest
          .spyOn(widget1.node, 'getBoundingClientRect')
          .mockReturnValue({ height: 120 } as DOMRect);

        class SpanTestModel extends WindowedListModel {
          estimateWidgetSize = (_index: number): number => FIXED_ESTIMATED_SIZE;
          widgetRenderer = (index: number): Widget =>
            index === 0 ? widget0 : widget1;
        }

        const model = new SpanTestModel({
          itemsList: new ObservableList({ values: ['a', 'b'] })
        });
        model.windowingActive = true;

        const [top, height] = model.getSpan(0, 1);
        expect(top).toBe(0);
        expect(height).toBe(80 + 120);
        expect(model.getEstimatedTotalSize()).toBe(80 + 120);

        Widget.detach(widget0);
        Widget.detach(widget1);
      });
    });
  });

  describe('WindowedList', () => {
    describe('#scrollElementIntoView()', () => {
      class TestList extends WindowedList {
        scrollElementIntoView(index: number, element: HTMLElement): void {
          super.scrollElementIntoView(index, element);
        }
      }

      const OriginalResizeObserver = window.ResizeObserver;
      let resizeCallbacks: ResizeObserverCallback[];
      let model: TestModel;
      let list: TestList;
      let element: HTMLElement;
      let scrollIntoView: jest.Mock;

      // Report a size change, as the browser would.
      const reportResize = (observer: '_onItemResize' | '_onAreaResize') => {
        resizeCallbacks
          .filter(callback => callback.name.includes(observer))
          .forEach(callback => callback([], {} as ResizeObserver));
      };

      beforeEach(() => {
        resizeCallbacks = [];
        window.ResizeObserver = class extends OriginalResizeObserver {
          constructor(callback: ResizeObserverCallback) {
            super(callback);
            resizeCallbacks.push(callback);
          }
        };
        model = new TestModel({ count: 3, windowingActive: true });
        list = new TestList({ model });
        Widget.attach(list, document.body);
        element = document.createElement('h2');
        scrollIntoView = jest.fn();
        element.scrollIntoView = scrollIntoView;
        list.viewportNode.appendChild(element);
      });

      afterEach(() => {
        jest.useRealTimers();
        list.dispose();
        window.ResizeObserver = OriginalResizeObserver;
      });

      it('should scroll the element into view', () => {
        list.scrollElementIntoView(1, element);
        expect(scrollIntoView).toHaveBeenCalledTimes(1);
      });

      it.each([
        [true, '_onItemResize'],
        [true, '_onAreaResize'],
        [false, '_onItemResize'],
        [false, '_onAreaResize']
      ] as const)(
        'should follow the element (windowing: %s, %s)',
        (windowingActive, observer) => {
          if (!windowingActive) {
            // Changing the mode creates new observers.
            resizeCallbacks = [];
            model.windowingActive = false;
          }
          list.scrollElementIntoView(1, element);
          scrollIntoView.mockClear();
          reportResize(observer);
          expect(scrollIntoView).toHaveBeenCalledTimes(1);
        }
      );

      it('should keep the scroll offset while hidden', () => {
        list.outerNode.scrollTop = 500;
        list.outerNode.dispatchEvent(new Event('scroll'));
        list.scrollElementIntoView(1, element);
        scrollIntoView.mockClear();
        list.hide();
        list.outerNode.scrollTop = 0;
        reportResize('_onAreaResize');
        expect(scrollIntoView).not.toHaveBeenCalled();
        expect(model.scrollOffset).toBe(500);
      });

      it('should update the items when the scroll moved the list', () => {
        const update = jest.spyOn(list, 'update');
        scrollIntoView.mockImplementation(() => {
          list.outerNode.scrollTop = 500;
        });
        list.scrollElementIntoView(1, element);
        expect(model.scrollOffset).toBe(500);
        expect(update).toHaveBeenCalledTimes(1);

        update.mockClear();
        reportResize('_onAreaResize');
        expect(update).not.toHaveBeenCalled();
      });

      it('should update the scrollbar when the scroll moved the list', () => {
        list.scrollbar = true;
        const createScrollbarItem = jest.spyOn(
          WindowedList.defaultRenderer,
          'createScrollbarItem'
        );
        scrollIntoView.mockImplementation(() => {
          list.outerNode.scrollTop = 500;
        });
        list.scrollElementIntoView(1, element);
        expect(createScrollbarItem).toHaveBeenCalled();
        createScrollbarItem.mockRestore();
      });

      it('should keep the element attached when its item grew', async () => {
        const items = Array.from({ length: 10 }, () => new Widget());
        class ItemsModel extends WindowedListModel {
          estimateWidgetSize = (_index: number): number => FIXED_ESTIMATED_SIZE;
          widgetRenderer = (index: number): Widget => items[index];
        }
        const itemsList = new TestList({
          model: new ItemsModel({ count: items.length, windowingActive: true })
        });
        Widget.attach(itemsList, document.body);
        itemsList.update();
        while (!items[1].isAttached) {
          await framePromise();
        }
        // The item is now taller than the size that the list stored for it.
        jest
          .spyOn(items[1].node, 'getBoundingClientRect')
          .mockReturnValue({ height: 4 * FIXED_ESTIMATED_SIZE } as DOMRect);
        const heading = document.createElement('h2');
        heading.scrollIntoView = () => {
          itemsList.outerNode.scrollTop = 3.5 * FIXED_ESTIMATED_SIZE;
        };
        items[1].node.appendChild(heading);

        itemsList.scrollElementIntoView(1, heading);
        await framePromise();
        await framePromise();

        expect(heading.isConnected).toBe(true);
        itemsList.dispose();
      });

      it('should request the item while the element is detached', () => {
        const scrollToItem = jest.spyOn(list, 'scrollToItem');
        element.remove();
        list.scrollElementIntoView(1, element);
        expect(scrollIntoView).not.toHaveBeenCalled();
        expect(scrollToItem).toHaveBeenCalledWith(1, 'start', 0);

        list.viewportNode.appendChild(element);
        reportResize('_onItemResize');
        expect(scrollIntoView).toHaveBeenCalledTimes(1);
      });

      it('should forget the item requested for a detached element', () => {
        jest.useFakeTimers();
        element.remove();
        list.scrollElementIntoView(1, element);
        list.viewportNode.appendChild(element);
        reportResize('_onItemResize');
        jest.advanceTimersByTime(3000);

        const scrollToItem = jest.spyOn(list, 'scrollToItem');
        reportResize('_onAreaResize');
        expect(scrollToItem).not.toHaveBeenCalled();
      });

      it('should stop after a fixed time despite resizes', () => {
        jest.useFakeTimers();
        list.scrollElementIntoView(1, element);
        jest.advanceTimersByTime(2000);
        reportResize('_onItemResize');
        scrollIntoView.mockClear();
        jest.advanceTimersByTime(1000);
        reportResize('_onItemResize');
        reportResize('_onAreaResize');
        expect(scrollIntoView).not.toHaveBeenCalled();
      });

      it('should stop when the user scrolls', () => {
        list.scrollElementIntoView(1, element);
        scrollIntoView.mockClear();
        list.outerNode.scrollTop = 500;
        list.outerNode.dispatchEvent(new Event('scroll'));
        reportResize('_onItemResize');
        expect(scrollIntoView).not.toHaveBeenCalled();
      });

      it.each(['wheel', 'touchmove', 'pointerdown', 'keydown'])(
        'should stop after a %s event',
        type => {
          list.scrollElementIntoView(1, element);
          scrollIntoView.mockClear();
          list.node.dispatchEvent(new Event(type));
          reportResize('_onItemResize');
          expect(scrollIntoView).not.toHaveBeenCalled();
        }
      );

      it('should stop on user input after requesting its item', () => {
        element.remove();
        list.scrollElementIntoView(1, element);
        list.viewportNode.appendChild(element);
        list.node.dispatchEvent(new Event('pointerdown'));
        reportResize('_onItemResize');
        expect(scrollIntoView).not.toHaveBeenCalled();
      });

      it.each([1, 2])('should stop when item %d is requested', index => {
        list.scrollElementIntoView(1, element);
        scrollIntoView.mockClear();
        void list.scrollToItem(index, 'start');
        reportResize('_onItemResize');
        expect(scrollIntoView).not.toHaveBeenCalled();
      });

      it('should stop listening for user input when disposed', () => {
        list.scrollElementIntoView(1, element);
        const removeEventListener = jest.spyOn(
          list.node,
          'removeEventListener'
        );
        list.dispose();
        for (const type of ['wheel', 'touchmove', 'pointerdown', 'keydown']) {
          expect(removeEventListener).toHaveBeenCalledWith(
            type,
            expect.any(Function),
            { capture: true }
          );
        }
      });

      it('should not return to an item requested earlier', () => {
        jest.useFakeTimers();
        void list.scrollToItem(2, 'start');
        list.scrollElementIntoView(1, element);
        // An item resize would keep the earlier request alive.
        jest.advanceTimersByTime(2000);
        reportResize('_onItemResize');
        jest.advanceTimersByTime(1000);

        const scrollToItem = jest.spyOn(list, 'scrollToItem');
        reportResize('_onAreaResize');
        expect(scrollToItem).not.toHaveBeenCalled();
      });
    });
  });
});
