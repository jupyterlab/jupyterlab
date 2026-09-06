// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MimeModel } from '@jupyterlab/rendermime';
import { MERMAID_MIME_TYPE } from '@jupyterlab/mermaid';

import {
  BAD_MERMAID,
  GOOD_MERMAID,
  MERMAID_RENDERER,
  MERMAID_VERSION_ATTR,
  SVG_DATA_ATTR
} from './utils';

describe('@jupyterlab/mermaid', () => {
  describe('RenderedMermaid', () => {
    it('should attach an SVG and version if parsing succeeds', async () => {
      const model = new MimeModel({
        data: { [MERMAID_MIME_TYPE]: GOOD_MERMAID }
      });
      await MERMAID_RENDERER.renderModel(model);

      expect(model).toHaveProperty(SVG_DATA_ATTR);
      expect(model).toHaveProperty(MERMAID_VERSION_ATTR);
    });

    it('should not attach an SVG and version if parsing fails', async () => {
      const model = new MimeModel({
        data: { [MERMAID_MIME_TYPE]: BAD_MERMAID }
      });
      await MERMAID_RENDERER.renderModel(model);

      expect(model).not.toHaveProperty(SVG_DATA_ATTR);
      expect(model).toHaveProperty(MERMAID_VERSION_ATTR);
    });
  });
});
