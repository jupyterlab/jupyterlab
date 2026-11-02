// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  MERMAID_CLASS,
  MERMAID_CODE_CLASS,
  MermaidManager
} from '@jupyterlab/mermaid';

import { MockMermaidManager, MockThemeManager } from './utils';

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
        expect(manager.mockMermaid.currentTheme).toBe('dark');
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

    describe('#themeChanged', () => {
      it('should emit when initialize() is called', () => {
        const manager = new MermaidManager();
        let emitted = false;
        manager.themeChanged.connect(() => {
          emitted = true;
        });
        manager.initialize();
        expect(emitted).toBe(true);
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

      it('should preserve accessible attributes and code after refresh', async () => {
        const themes = new MockThemeManager();
        const manager = new MockMermaidManager({
          themes: themes.asThemeManager()
        });

        const text = 'graph TD; A --> B;';
        const figure = await manager.renderFigure(text);

        const container = document.createElement('div');
        container.className = MERMAID_CLASS;
        container.replaceChildren(
          ...Array.from(figure.childNodes).map(c => c.cloneNode(true))
        );
        document.body.appendChild(container);

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
          container.remove();
          manager.dispose();
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

        const container = document.createElement('div');
        container.className = MERMAID_CLASS;
        container.replaceChildren(
          ...Array.from(initialFigure.childNodes).map(c => c.cloneNode(true))
        );
        document.body.appendChild(container);

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
          container.remove();
          manager.dispose();
        }
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
