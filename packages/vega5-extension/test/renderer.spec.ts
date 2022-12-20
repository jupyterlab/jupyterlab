// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MimeModel } from '@jupyterlab/rendermime';
import { RenderedVega, VEGA_MIME_TYPE } from '@jupyterlab/vega5-extension';

describe('@jupyterlab/vega5-extension', () => {
  describe('RenderedVega', () => {
    it('should attach a scaled PNG', () => {
      const renderer = new RenderedVega({
        latexTypesetter: null,
        linkHandler: null,
        mimeType: VEGA_MIME_TYPE,
        resolver: null,
        sanitizer: {
          sanitize: (s: string) => s
        }
      });

      const model = new MimeModel({
        data: {},
        metadata: {}
      });
      renderer.renderModel(model);

      expect(model.data['image/png']).toEqual('');
    });
  });
});
