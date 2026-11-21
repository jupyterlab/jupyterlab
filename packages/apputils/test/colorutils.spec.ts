// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ColorUtils } from '@jupyterlab/apputils';

describe('@jupyterlab/apputils', () => {
  describe('ColorUtils', () => {
    describe('.parse()', () => {
      // jsdom has no canvas, so the context reads colors back as browsers do.
      const readBack: Record<string, string> = {
        white: '#ffffff',
        'rgba(97, 97, 97, 0.3)': 'rgba(97, 97, 97, 0.3)',
        'oklch(70% 0.1 200)': 'oklch(0.7 0.1 200)'
      };

      beforeEach(() => {
        let fillStyle = '#000000';
        const context = {
          get fillStyle() {
            return fillStyle;
          },
          set fillStyle(value: string) {
            // Browsers ignore a color that they do not accept.
            if (value in readBack) {
              fillStyle = readBack[value];
            } else if (/^#[0-9a-f]{6}$/i.test(value)) {
              fillStyle = value.toLowerCase();
            }
          }
        };
        jest
          .spyOn(HTMLCanvasElement.prototype, 'getContext')
          .mockReturnValue(context as unknown as RenderingContext);
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should parse an opaque color', () => {
        expect(ColorUtils.parse('white')).toEqual({
          red: 255,
          green: 255,
          blue: 255,
          alpha: 1
        });
      });

      it('should parse a translucent color', () => {
        expect(ColorUtils.parse('rgba(97, 97, 97, 0.3)')).toEqual({
          red: 97,
          green: 97,
          blue: 97,
          alpha: 0.3
        });
      });

      it('should return null for a color that the browser does not accept', () => {
        expect(ColorUtils.parse('not-a-color')).toBeNull();
      });

      it('should return null for a color read back in another syntax', () => {
        expect(ColorUtils.parse('oklch(70% 0.1 200)')).toBeNull();
      });
    });
  });
});
