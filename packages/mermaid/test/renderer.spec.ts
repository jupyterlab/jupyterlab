// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MimeModel } from '@jupyterlab/rendermime';
import {
  MERMAID_CLASS,
  MERMAID_MIME_TYPE,
  RenderedMermaid
} from '@jupyterlab/mermaid';

import {
  BAD_MERMAID,
  GOOD_MERMAID,
  MERMAID_MANAGER,
  MERMAID_RENDERER,
  MERMAID_THEMES,
  MERMAID_VERSION_ATTR,
  SVG_DATA_ATTR,
  SVG_MIME
} from './utils';

describe('@jupyterlab/mermaid', () => {
  describe('RenderedMermaid', () => {
    describe('#constructor()', () => {
      it('should create a RenderedMermaid widget with mermaid class', () => {
        const renderer = new RenderedMermaid({
          latexTypesetter: null,
          linkHandler: null,
          mimeType: MERMAID_MIME_TYPE,
          resolver: null,
          sanitizer: {
            sanitize: (s: string) => s
          }
        });
        expect(renderer).toBeInstanceOf(RenderedMermaid);
        expect(renderer.hasClass(MERMAID_CLASS)).toBe(true);
        renderer.dispose();
      });
    });

    describe('#renderModel()', () => {
      beforeEach(async () => {
        await MERMAID_THEMES.setTheme('JupyterLab Light');
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
        await MERMAID_THEMES.setTheme('JupyterLab Dark');

        // Wait a tick for async renderModel triggered by themeChanged
        await new Promise(resolve => setTimeout(resolve, 20));

        expect(decodeURIComponent(renderer.node.innerHTML)).toContain(
          'data-theme="dark"'
        );
        renderer.dispose();
      });

      it('should keep the stored SVG when the theme changes', async () => {
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
        const svg = model.data[SVG_MIME];

        await MERMAID_THEMES.setTheme('JupyterLab Dark');
        await new Promise(resolve => setTimeout(resolve, 20));

        // Changing the stored SVG would mark the notebook as modified.
        expect(model.data[SVG_MIME]).toBe(svg);
        renderer.dispose();
      });

      it('should store the SVG in the default theme when the theme is dark', async () => {
        await MERMAID_THEMES.setTheme('JupyterLab Dark');
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

        expect(decodeURIComponent(renderer.node.innerHTML)).toContain(
          'data-theme="dark"'
        );
        // Exports show the stored SVG, so it must not depend on the theme.
        expect(model.data[SVG_MIME]).toContain('data-theme="default"');
        renderer.dispose();
      });

      it('should render once for the default theme', async () => {
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
          data: { [MERMAID_MIME_TYPE]: 'flowchart LR\n  once --> stored\n' }
        });
        const render = jest.spyOn(MERMAID_MANAGER.mockMermaid, 'render');
        try {
          await renderer.renderModel(model);

          // In the default theme, the SVG drawn on the page is also the stored one.
          expect(render).toHaveBeenCalledTimes(1);
        } finally {
          render.mockRestore();
          renderer.dispose();
        }
      });

      it('should keep an SVG stored in the model', async () => {
        const renderer = new RenderedMermaid({
          latexTypesetter: null,
          linkHandler: null,
          mimeType: MERMAID_MIME_TYPE,
          resolver: null,
          sanitizer: {
            sanitize: (s: string) => s
          }
        });
        const svg = '<svg data-stored="true"></svg>';
        const model = new MimeModel({
          data: { [MERMAID_MIME_TYPE]: GOOD_MERMAID, [SVG_MIME]: svg }
        });
        await renderer.renderModel(model);

        // Changing the stored SVG would mark the notebook as modified on open.
        expect(model.data[SVG_MIME]).toBe(svg);
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
        await MERMAID_THEMES.setTheme('JupyterLab Dark');

        // Explicitly re-rendering the same Mermaid source must not return stale content
        await renderer.renderModel(model);
        expect(decodeURIComponent(renderer.node.innerHTML)).toContain(
          'data-theme="dark"'
        );
        renderer.dispose();
      });
    });

    describe('#dispose()', () => {
      beforeEach(async () => {
        await MERMAID_THEMES.setTheme('JupyterLab Light');
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
        await MERMAID_THEMES.setTheme('JupyterLab Dark');
        await new Promise(resolve => setTimeout(resolve, 20));

        // After disposal, the diagram must remain untouched
        expect(decodeURIComponent(renderer.node.innerHTML)).toContain(
          'data-theme="default"'
        );
      });
    });
  });
});
