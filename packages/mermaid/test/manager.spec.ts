// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  MERMAID_CLASS,
  MERMAID_CODE_CLASS,
  MermaidManager
} from '@jupyterlab/mermaid';

import { MockMermaidManager, MockThemeManager } from './utils';

describe('@jupyterlab/mermaid', () => {
  describe('MermaidManager.makeMermaidFigure()', () => {
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

  describe('MermaidManager theme handling', () => {
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
      diagramEl.innerHTML = initialFigure.innerHTML;
      container.appendChild(diagramEl);
      document.body.appendChild(container);

      try {
        expect(decodeURIComponent(diagramEl.innerHTML)).toContain(
          'data-theme="default"'
        );

        // Switch theme to dark
        await themes.setTheme('JupyterLab Dark');
        // Wait for async refreshDiagrams
        await manager.refreshDiagrams();

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
      container.innerHTML = figure.innerHTML;
      document.body.appendChild(container);

      try {
        await themes.setTheme('JupyterLab Dark');
        await manager.refreshDiagrams();

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
  });
});
