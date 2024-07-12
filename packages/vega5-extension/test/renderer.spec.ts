// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MimeModel } from '@jupyterlab/rendermime';
import { VEGALITE5_MIME_TYPE } from '@jupyterlab/vega5-extension';
import {
  DEFAULT_SIZE,
  getPNGSize,
  SCALE_FACTOR_PROP,
  VEGALITE5_RENDERER,
  VEGALITE5_SPEC
} from './utils';

describe('@jupyterlab/vega5-extension', () => {
  describe('RenderedVega', () => {
    it('should attach a default sized PNG', async () => {
      const model = new MimeModel({
        data: {
          [VEGALITE5_MIME_TYPE]: VEGALITE5_SPEC
        }
      });
      await VEGALITE5_RENDERER.renderModel(model);

      expect(model).toHaveProperty('data.image/png');
      expect(model).not.toHaveProperty(SCALE_FACTOR_PROP);
    });

    // requires `canvas`
    it.skip('should keep size of PNG', async () => {
      const model = new MimeModel({
        data: {
          [VEGALITE5_MIME_TYPE]: VEGALITE5_SPEC
        }
      });
      await VEGALITE5_RENDERER.renderModel(model);

      const size = getPNGSize(model.data['image/png'] as string);

      expect(size.width).toEqual(DEFAULT_SIZE);
      expect(size.height).toEqual(DEFAULT_SIZE);
    });

    it('should attach a scaled PNG', async () => {
      const scaleFactor = 2;

      const model = new MimeModel({
        data: {
          [VEGALITE5_MIME_TYPE]: VEGALITE5_SPEC
        },
        metadata: {
          [VEGALITE5_MIME_TYPE]: {
            embed_options: {
              scaleFactor
            }
          }
        }
      });
      await VEGALITE5_RENDERER.renderModel(model);

      expect(model).toHaveProperty('data.image/png');
      expect(model).toHaveProperty(SCALE_FACTOR_PROP, scaleFactor);
    });

    // requires `canvas`
    it.skip('should resize scaled PNG', async () => {
      const scaleFactor = 2;

      const model = new MimeModel({
        data: {
          [VEGALITE5_MIME_TYPE]: VEGALITE5_SPEC
        },
        metadata: {
          [VEGALITE5_MIME_TYPE]: {
            embed_options: {
              scaleFactor
            }
          }
        }
      });
      await VEGALITE5_RENDERER.renderModel(model);

      const size = getPNGSize(model.data['image/png'] as string);

      expect(size.width).toEqual(DEFAULT_SIZE * scaleFactor);
      expect(size.height).toEqual(DEFAULT_SIZE * scaleFactor);
    });
  });
});
