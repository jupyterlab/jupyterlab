// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { WindowedListModel } from '@jupyterlab/ui-components';
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
});
