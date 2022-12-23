// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MimeModel } from '@jupyterlab/rendermime';
import { VEGALITE4_MIME_TYPE } from '@jupyterlab/vega5-extension';
import {
  DEFAULT_SIZE,
  getPNGSize,
  SCALE_FACTOR_PROP,
  VEGALITE4_RENDERER,
  VEGALITE4_SPEC
} from './utils';

describe('@jupyterlab/vega5-extension', () => {
  describe('RenderedVega', () => {
    it('should attach a default sized PNG', async () => {
      const model = new MimeModel({
        data: {
          [VEGALITE4_MIME_TYPE]: VEGALITE4_SPEC
        }
      });
      await VEGALITE4_RENDERER.renderModel(model);

      expect(model).toHaveProperty('data.image/png');
      expect(model).not.toHaveProperty(SCALE_FACTOR_PROP);

      const size = getPNGSize(model.data['image/png'] as string);

      expect(size.width).toEqual(DEFAULT_SIZE);
      expect(size.height).toEqual(DEFAULT_SIZE);
    });

    it('should attach a scaled PNG', async () => {
      const scaleFactor = 2;

      const model = new MimeModel({
        data: {
          [VEGALITE4_MIME_TYPE]: VEGALITE4_SPEC
        },
        metadata: {
          [VEGALITE4_MIME_TYPE]: {
            embed_options: {
              scaleFactor
            }
          }
        }
      });
      await VEGALITE4_RENDERER.renderModel(model);

      expect(model).toHaveProperty('data.image/png');
      expect(model).toHaveProperty(SCALE_FACTOR_PROP, scaleFactor);

      const size = getPNGSize(model.data['image/png'] as string);

      expect(size.width).toEqual(DEFAULT_SIZE * scaleFactor);
      expect(size.height).toEqual(DEFAULT_SIZE * scaleFactor);
    });
  });
});
