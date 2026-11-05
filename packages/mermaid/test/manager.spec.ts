// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  MERMAID_CLASS,
  MERMAID_CODE_CLASS,
  MERMAID_DARK_THEME,
  MERMAID_DEFAULT_THEME,
  MermaidManager
} from '@jupyterlab/mermaid';

import { PromiseDelegate } from '@lumino/coreutils';

import { MockMermaidManager, MockThemeManager } from './utils';

// Stands in for the mermaid module that `MermaidManager.getMermaid()` loads.
jest.mock('mermaid', () => ({
  __esModule: true,
  default: { initialize: jest.fn() }
}));

describe('@jupyterlab/mermaid', () => {
  describe('MermaidManager', () => {
    describe('#constructor()', () => {
      it('should react to themeManager themeChanged', async () => {
        const themes = new MockThemeManager();
        const manager = new MockMermaidManager({
          themes: themes.asThemeManager()
        });
        let emitted = false;
        manager.themeChanged.connect(() => {
          emitted = true;
        });

        await themes.setTheme('JupyterLab Dark');
        expect(emitted).toBe(true);
        manager.dispose();
      });

      it('should configure mermaid with the dark theme for a dark JupyterLab theme', async () => {
        const themes = new MockThemeManager();
        const manager = new MermaidManager({
          themes: themes.asThemeManager()
        });
        const mermaid = await manager.getMermaid();

        await themes.setTheme('JupyterLab Dark');
        expect(mermaid.initialize).toHaveBeenLastCalledWith(
          expect.objectContaining({ theme: MERMAID_DARK_THEME })
        );
        manager.dispose();
      });

      it('should not emit themeChanged when the theme manager reloads the same theme', async () => {
        const themes = new MockThemeManager();
        const manager = new MockMermaidManager({
          themes: themes.asThemeManager()
        });
        let emitted = false;
        manager.themeChanged.connect(() => {
          emitted = true;
        });

        // The theme manager reloads the current theme on a font size change.
        await themes.setTheme('JupyterLab Light');
        expect(emitted).toBe(false);
        manager.dispose();
      });
    });

    describe('#initialize()', () => {
      it('should emit themeChanged signal on initialize', () => {
        const manager = new MermaidManager();
        let emitted = false;
        manager.themeChanged.connect(() => {
          emitted = true;
        });
        manager.initialize();
        expect(emitted).toBe(true);
        manager.dispose();
      });

      it('should clear cached diagrams', async () => {
        const manager = new MockMermaidManager();
        const text = 'graph TD; A --> B;';
        await manager.renderFigure(text);
        expect(manager.getCachedFigure(text)).not.toBeNull();

        manager.initialize();
        expect(manager.getCachedFigure(text)).toBeNull();
        manager.dispose();
      });
    });

    describe('#refreshDiagrams()', () => {
      it('should refresh markdown-rendered diagrams in the DOM', async () => {
        const themes = new MockThemeManager();
        const manager = new MockMermaidManager({
          themes: themes.asThemeManager()
        });

        // Render initial figure (light theme)
        const text = 'graph TD; A --> B;';
        const initialFigure = await manager.renderFigure(text);

        // Create a markdown container imitating a MarkdownCell or MarkdownViewer
        const container = document.createElement('div');
        container.className = 'jp-RenderedMarkdown';
        const diagramEl = document.createElement('div');
        diagramEl.className = MERMAID_CLASS;
        diagramEl.replaceChildren(
          ...Array.from(initialFigure.childNodes).map(c => c.cloneNode(true))
        );
        container.appendChild(diagramEl);
        document.body.appendChild(container);

        try {
          expect(decodeURIComponent(diagramEl.innerHTML)).toContain(
            'data-theme="default"'
          );

          // Switch theme to dark, and let the refresh it starts finish
          await themes.setTheme('JupyterLab Dark');
          await new Promise(resolve => setTimeout(resolve, 0));

          expect(decodeURIComponent(diagramEl.innerHTML)).toContain(
            'data-theme="dark"'
          );
        } finally {
          container.remove();
          manager.dispose();
        }
      });

      it('should not redraw diagrams outside rendered Markdown', async () => {
        const themes = new MockThemeManager();
        const manager = new MockMermaidManager({
          themes: themes.asThemeManager()
        });
        const figure = await manager.renderFigure('graph TD; A --> B;');

        // The node of a `RenderedMermaid` widget, which redraws itself
        const node = document.createElement('div');
        node.className = MERMAID_CLASS;
        node.replaceChildren(
          ...Array.from(figure.childNodes).map(c => c.cloneNode(true))
        );
        document.body.appendChild(node);

        try {
          await themes.setTheme('JupyterLab Dark');
          await new Promise(resolve => setTimeout(resolve, 0));

          expect(decodeURIComponent(node.innerHTML)).toContain(
            'data-theme="default"'
          );
        } finally {
          node.remove();
          manager.dispose();
        }
      });

      it('should preserve accessible attributes and code after refresh', async () => {
        const themes = new MockThemeManager();
        const manager = new MockMermaidManager({
          themes: themes.asThemeManager()
        });

        const text = 'graph TD; A --> B;';
        const figure = await manager.renderFigure(text);

        const markdown = document.createElement('div');
        markdown.className = 'jp-RenderedMarkdown';
        const container = document.createElement('div');
        container.className = MERMAID_CLASS;
        container.replaceChildren(
          ...Array.from(figure.childNodes).map(c => c.cloneNode(true))
        );
        markdown.appendChild(container);
        document.body.appendChild(markdown);

        try {
          await themes.setTheme('JupyterLab Dark');
          await new Promise(resolve => setTimeout(resolve, 0));

          const code = container.querySelector(`.${MERMAID_CODE_CLASS}`);
          expect(code).not.toBeNull();
          expect(code?.textContent).toBe(text);
          expect(decodeURIComponent(container.innerHTML)).toContain(
            'data-theme="dark"'
          );
        } finally {
          markdown.remove();
          manager.dispose();
        }
      });

      it('should redraw a diagram in the new theme when its Markdown is added to the document again', async () => {
        const themes = new MockThemeManager();
        const manager = new MockMermaidManager({
          themes: themes.asThemeManager()
        });

        // Render the initial figure (light theme)
        const text = 'graph TD; A --> B;';
        const figure = await manager.renderFigure(text);

        // A markdown container imitating a Markdown cell in edit mode: its
        // rendered widget is detached, so the diagram is not in the document.
        const markdown = document.createElement('div');
        markdown.className = 'jp-RenderedMarkdown';
        markdown.innerHTML = figure.outerHTML;
        document.body.appendChild(markdown);

        try {
          expect(decodeURIComponent(markdown.innerHTML)).toContain(
            'data-theme="default"'
          );

          // Detach, as showEditor() does for a cell in edit mode.
          markdown.remove();

          // Switch theme while the diagram is detached.
          await themes.setTheme('JupyterLab Dark');
          await new Promise(resolve => setTimeout(resolve, 0));
          expect(decodeURIComponent(markdown.innerHTML)).toContain(
            'data-theme="default"'
          );

          // Show the cell again: the diagram must be redrawn in the new theme.
          document.body.appendChild(markdown);
          for (let i = 0; i < 50; i++) {
            if (
              decodeURIComponent(markdown.innerHTML).includes(
                'data-theme="dark"'
              )
            ) {
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          expect(decodeURIComponent(markdown.innerHTML)).toContain(
            'data-theme="dark"'
          );
        } finally {
          markdown.remove();
          manager.dispose();
        }
      });

      it('should not redraw a diagram already drawn in the current theme when its Markdown is added to the document', async () => {
        const themes = new MockThemeManager();
        const manager = new MockMermaidManager({
          themes: themes.asThemeManager()
        });

        const text = 'graph TD; A --> B;';
        const figure = await manager.renderFigure(text);
        const renderSpy = jest.spyOn(manager, 'renderFigure');

        const markdown = document.createElement('div');
        markdown.className = 'jp-RenderedMarkdown';
        markdown.innerHTML = figure.outerHTML;
        document.body.appendChild(markdown);

        try {
          await new Promise(resolve => setTimeout(resolve, 0));
          await new Promise(resolve => setTimeout(resolve, 0));
          expect(renderSpy).not.toHaveBeenCalled();
          expect(decodeURIComponent(markdown.innerHTML)).toContain(
            'data-theme="default"'
          );
        } finally {
          markdown.remove();
          manager.dispose();
        }
      });

      it('should not redraw diagrams after the manager is disposed', async () => {
        const themes = new MockThemeManager();
        const manager = new MockMermaidManager({
          themes: themes.asThemeManager()
        });

        const text = 'graph TD; A --> B;';
        const figure = await manager.renderFigure(text);

        const markdown = document.createElement('div');
        markdown.className = 'jp-RenderedMarkdown';
        markdown.innerHTML = figure.outerHTML;
        document.body.appendChild(markdown);
        markdown.remove();

        await themes.setTheme('JupyterLab Dark');
        await new Promise(resolve => setTimeout(resolve, 0));
        manager.dispose();

        document.body.appendChild(markdown);
        await new Promise(resolve => setTimeout(resolve, 0));
        await new Promise(resolve => setTimeout(resolve, 0));

        try {
          expect(decodeURIComponent(markdown.innerHTML)).toContain(
            'data-theme="default"'
          );
        } finally {
          markdown.remove();
        }
      });

      it('should not interpret HTML meta-characters in diagram source as HTML elements', async () => {
        const themes = new MockThemeManager();
        const manager = new MockMermaidManager({
          themes: themes.asThemeManager()
        });

        const maliciousText =
          'graph TD; A["<img src=x onerror=alert(1)>"] --> B;';
        const initialFigure = await manager.renderFigure(maliciousText);

        const markdown = document.createElement('div');
        markdown.className = 'jp-RenderedMarkdown';
        const container = document.createElement('div');
        container.className = MERMAID_CLASS;
        container.replaceChildren(
          ...Array.from(initialFigure.childNodes).map(c => c.cloneNode(true))
        );
        markdown.appendChild(container);
        document.body.appendChild(markdown);

        try {
          await themes.setTheme('JupyterLab Dark');
          await manager.refreshDiagrams();

          const code = container.querySelector(`.${MERMAID_CODE_CLASS}`);
          expect(code).not.toBeNull();
          expect(code?.textContent).toBe(maliciousText);

          const imgElements = container.querySelectorAll('img');
          for (const img of imgElements) {
            expect(img.getAttribute('onerror')).toBeNull();
          }
        } finally {
          markdown.remove();
          manager.dispose();
        }
      });
    });

    describe('#renderFigure()', () => {
      it('should draw in the new theme when the theme changes during the render', async () => {
        const themes = new MockThemeManager();
        const manager = new MockMermaidManager({
          themes: themes.asThemeManager()
        });
        const gate = new PromiseDelegate<void>();
        manager.mockMermaid.nextRenderGate = gate.promise;
        const text = 'graph TD; A --> B;';

        const rendering = manager.renderFigure(text);
        await new Promise(resolve => setTimeout(resolve, 0));
        await themes.setTheme('JupyterLab Dark');
        gate.resolve();
        const figure = await rendering;

        expect(decodeURIComponent(figure.innerHTML)).toContain(
          'data-theme="dark"'
        );
        manager.dispose();
      });
    });

    describe('#renderSvg()', () => {
      it('should render with the theme given in the options', async () => {
        const themes = new MockThemeManager();
        const manager = new MockMermaidManager({
          themes: themes.asThemeManager()
        });
        await themes.setTheme('JupyterLab Dark');

        const info = await manager.renderSvg('graph TD; A --> B;', {
          theme: MERMAID_DEFAULT_THEME
        });
        expect(info.svg).toContain('data-theme="default"');
        manager.dispose();
      });

      it('should render with the theme of the user interface after a render with another theme', async () => {
        const themes = new MockThemeManager();
        const manager = new MockMermaidManager({
          themes: themes.asThemeManager()
        });
        await themes.setTheme('JupyterLab Dark');
        await manager.renderSvg('graph TD; A --> B;', {
          theme: MERMAID_DEFAULT_THEME
        });

        const info = await manager.renderSvg('graph TD; C --> D;');
        expect(info.svg).toContain('data-theme="dark"');
        manager.dispose();
      });

      it('should render the same SVG for the same source every time', async () => {
        const manager = new MockMermaidManager();
        const text = 'graph TD; A --> B;';
        const first = await manager.renderSvg(text);
        await manager.renderSvg('graph TD; C --> D;');
        // Clears the cached renders
        manager.initialize();

        // A stored SVG that changed with the render order would mark the
        // notebook as modified.
        const second = await manager.renderSvg(text);
        expect(second.svg).toBe(first.svg);
        manager.dispose();
      });
    });

    describe('#makeMermaidFigure()', () => {
      let manager: MermaidManager;

      beforeEach(() => {
        manager = new MermaidManager();
      });

      afterEach(() => {
        manager.dispose();
      });

      it('should add a screen-reader caption for accessible descriptions', () => {
        const figure = manager.makeMermaidFigure({
          text: 'graph TD; A --> B;',
          svg: '<svg></svg>',
          accessibleDescription: 'This diagram has one edge from A to B.'
        });

        const caption = figure.querySelector('figcaption');

        expect(caption).not.toBeNull();
        expect(caption?.textContent).toBe(
          'This diagram has one edge from A to B.'
        );
        expect(caption?.className).toBe('jp-sr-only');
      });

      it('should not add a caption when accessible description is unavailable', () => {
        const figure = manager.makeMermaidFigure({
          text: 'graph TD; A --> B;',
          svg: '<svg></svg>'
        });

        expect(figure.querySelector('figcaption')).toBeNull();
      });
    });

    describe('#dispose()', () => {
      it('should dispose manager and disconnect receivers', () => {
        const manager = new MermaidManager();
        let emitted = false;
        manager.themeChanged.connect(() => {
          emitted = true;
        });

        expect(manager.isDisposed).toBe(false);
        manager.dispose();
        expect(manager.isDisposed).toBe(true);

        manager.initialize();
        expect(emitted).toBe(false);
      });
    });
  });
});
