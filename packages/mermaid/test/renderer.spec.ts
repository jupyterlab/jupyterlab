// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MimeModel } from '@jupyterlab/rendermime';
import { MERMAID_MIME_TYPE, RenderedMermaid } from '@jupyterlab/mermaid';

import {
  BAD_MERMAID,
  GOOD_MERMAID,
  MERMAID_MANAGER,
  MERMAID_RENDERER,
  MERMAID_VERSION_ATTR,
  SVG_DATA_ATTR,
  SVG_MIME
} from './utils';

describe('@jupyterlab/mermaid', () => {
  describe('RenderedMermaid', () => {
    beforeEach(() => {
      MERMAID_MANAGER.mockMermaid.currentTheme = 'default';
      MERMAID_MANAGER.initialize();
    });

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

    it('should update an already-rendered diagram when theme changes', async () => {
      const renderer = new RenderedMermaid({
        latexTypesetter: null,
        linkHandler: null,
        mimeType: MERMAID_MIME_TYPE,
        resolver: null,
        sanitizer: {
          sanitize: (s: string) => s
        }
      });
      const model = new MimeModel({
        data: { [MERMAID_MIME_TYPE]: GOOD_MERMAID }
      });
      await renderer.renderModel(model);

      expect(model.data[SVG_MIME]).toContain('data-theme="default"');
      expect(decodeURIComponent(renderer.node.innerHTML)).toContain(
        'data-theme="default"'
      );

      // Change theme and trigger initialize
      MERMAID_MANAGER.mockMermaid.currentTheme = 'dark';
      MERMAID_MANAGER.initialize();

      // Wait a tick for async renderModel triggered by themeChanged
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(model.data[SVG_MIME]).toContain('data-theme="dark"');
      expect(decodeURIComponent(renderer.node.innerHTML)).toContain(
        'data-theme="dark"'
      );
      renderer.dispose();
    });

    it('should re-render the same Mermaid source after a theme change', async () => {
      const renderer = new RenderedMermaid({
        latexTypesetter: null,
        linkHandler: null,
        mimeType: MERMAID_MIME_TYPE,
        resolver: null,
        sanitizer: {
          sanitize: (s: string) => s
        }
      });
      const model = new MimeModel({
        data: { [MERMAID_MIME_TYPE]: GOOD_MERMAID }
      });
      await renderer.renderModel(model);
      expect(model.data[SVG_MIME]).toContain('data-theme="default"');

      // Theme changes
      MERMAID_MANAGER.mockMermaid.currentTheme = 'dark';
      MERMAID_MANAGER.initialize();

      // Explicitly re-rendering the same Mermaid source must not return stale content
      await renderer.renderModel(model);
      expect(model.data[SVG_MIME]).toContain('data-theme="dark"');
      expect(decodeURIComponent(renderer.node.innerHTML)).toContain(
        'data-theme="dark"'
      );
      renderer.dispose();
    });

    it('should disconnect and not update after disposal', async () => {
      const renderer = new RenderedMermaid({
        latexTypesetter: null,
        linkHandler: null,
        mimeType: MERMAID_MIME_TYPE,
        resolver: null,
        sanitizer: {
          sanitize: (s: string) => s
        }
      });
      const model = new MimeModel({
        data: { [MERMAID_MIME_TYPE]: GOOD_MERMAID }
      });
      await renderer.renderModel(model);

      renderer.dispose();
      MERMAID_MANAGER.mockMermaid.currentTheme = 'dark';
      MERMAID_MANAGER.initialize();
      await new Promise(resolve => setTimeout(resolve, 20));

      // After disposal, model must remain untouched
      expect(model.data[SVG_MIME]).toContain('data-theme="default"');
    });
  });
});
