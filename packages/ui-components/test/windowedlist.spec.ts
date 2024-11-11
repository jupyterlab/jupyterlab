// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { WindowedListModel } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';
import { ObservableList } from '@jupyterlab/observables';

const FIXED_ESTIMATED_SIZE = 100;

class TestModel extends WindowedListModel {
  estimateWidgetSize = (_index: number): number => {
    return 100;
  };
  widgetRenderer = (_index: number): Widget => {
    return new Widget();
  };
}

describe('@jupyterlab/ui-components', () => {
  describe('WindowedListModel', () => {
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
  });
});
