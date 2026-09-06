/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { HoverBox } from '@jupyterlab/ui-components';

function createDomRect(options: {
  x: number;
  y: number;
  width: number;
  height: number;
}): DOMRect {
  return {
    ...options,
    bottom: options.x + options.height,
    top: options.y,
    left: options.x,
    right: options.x + options.width,
    toJSON: () => 'DummyDOMRect'
  };
}

function createPointAnchor(options: { x: number; y: number }): DOMRect {
  return createDomRect({ ...options, width: 0, height: 0 });
}

describe('@jupyterlab/ui-components', () => {
  describe('HoverBox.setGeometry()', () => {
    let host: HTMLElement;
    let node: HTMLElement;
    let anchor: DOMRect;
    let defaults: () => {
      host: HTMLElement;
      node: HTMLElement;
      anchor: DOMRect;
      maxHeight: number;
      minHeight: number;
    };
    beforeEach(() => {
      host = document.createElement('div');
      node = document.createElement('div');
      window.innerHeight = 100;
      window.innerWidth = 100;
      anchor = createPointAnchor({
        x: 50,
        y: 50
      });
      defaults = () => {
        return { host, anchor, node, maxHeight: 100, minHeight: 1 };
      };
      jest.spyOn(host, 'getBoundingClientRect').mockReturnValue(
        createDomRect({
          x: 20,
          y: 20,
          width: 60, // right = 80
          height: 60 // bottom = 80
        })
      );
    });

    it('should position node next to the anchor', () => {
      jest.spyOn(node, 'getBoundingClientRect').mockImplementation(() => {
        return createDomRect({
          x: parseInt(node.style.left, 10),
          y: parseInt(node.style.top, 10),
          width: 10,
          height: 0
        });
      });

      HoverBox.setGeometry(defaults());
      expect(node.style.left).toBe('50px');
      expect(node.style.top).toBe('50px');
    });

    it('should position node within the window', () => {
      // anchor position (50) + node width width (60) exceeds window width (100)
      jest.spyOn(node, 'getBoundingClientRect').mockImplementation(() => {
        return createDomRect({
          x: parseInt(node.style.left, 10),
          y: parseInt(node.style.top, 10),
          width: 60,
          height: 1
        });
      });

      HoverBox.setGeometry(defaults());
      expect(node.style.left).toBe('40px');
    });

    describe('outOfViewDisplay = `stick-outside`', () => {
      it('should keep the left edge of the node within the host', () => {
        jest.spyOn(node, 'getBoundingClientRect').mockImplementation(() => {
          return createDomRect({
            x: parseInt(node.style.left, 10),
            y: parseInt(node.style.top, 10),
            width: 10,
            height: 0
          });
        });

        anchor = createPointAnchor({
          x: 70,
          y: 50
        });
        HoverBox.setGeometry({
          ...defaults(),
          outOfViewDisplay: {
            right: 'stick-outside'
          }
        });
        expect(node.style.left).toBe('70px');

        anchor = createPointAnchor({
          x: 85,
          y: 50
        });
        HoverBox.setGeometry({
          ...defaults(),
          outOfViewDisplay: {
            right: 'stick-outside'
          }
        });
        expect(node.style.left).toBe('80px');
      });
    });

    describe('outOfViewDisplay = `stick-inside`', () => {
      it('should keep the right edge of the node within the host', () => {
        jest.spyOn(node, 'getBoundingClientRect').mockImplementation(() => {
          return createDomRect({
            x: parseInt(node.style.left, 10),
            y: parseInt(node.style.top, 10),
            width: 10,
            height: 0
          });
        });

        anchor = createPointAnchor({
          x: 85,
          y: 50
        });

        HoverBox.setGeometry({
          ...defaults(),
          outOfViewDisplay: {
            right: 'stick-inside'
          }
        });
        // host right edge (80px) - node width (10px)
        expect(node.style.left).toBe('70px');
      });

      it('should also work when adjusting for window right edge', () => {
        // anchor position (50) + node width width (60) exceeds window right edge (100)
        jest.spyOn(node, 'getBoundingClientRect').mockImplementation(() => {
          return createDomRect({
            x: parseInt(node.style.left, 10),
            y: parseInt(node.style.top, 10),
            width: 60,
            height: 1
          });
        });

        HoverBox.setGeometry({
          ...defaults(),
          outOfViewDisplay: {
            right: 'stick-inside'
          }
        });
        // host right edge (80px) - node width (60px)
        expect(node.style.left).toBe('20px');
      });

      it('should keep the left edge of the node within the host', () => {
        jest.spyOn(node, 'getBoundingClientRect').mockImplementation(() => {
          return createDomRect({
            x: parseInt(node.style.left, 10),
            y: parseInt(node.style.top, 10),
            width: 10,
            height: 0
          });
        });

        anchor = createPointAnchor({
          x: 15,
          y: 50
        });

        HoverBox.setGeometry({
          ...defaults(),
          outOfViewDisplay: {
            left: 'stick-inside'
          }
        });
        // host left edge (20px)
        expect(node.style.left).toBe('20px');
      });

      it('should also work when adjusting for window left edge', () => {
        anchor = createPointAnchor({
          x: -60,
          y: 50
        });
        // anchor position (-60) + node width width (30) exceeds window left edge (0)
        jest.spyOn(node, 'getBoundingClientRect').mockImplementation(() => {
          return createDomRect({
            x: parseInt(node.style.left, 10),
            y: parseInt(node.style.top, 10),
            width: 30,
            height: 1
          });
        });

        HoverBox.setGeometry({
          ...defaults(),
          outOfViewDisplay: {
            left: 'stick-inside'
          }
        });
        // host left edge (20px)
        expect(node.style.left).toBe('20px');
      });
    });
  });
});
