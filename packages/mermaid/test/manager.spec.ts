// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MermaidManager } from '@jupyterlab/mermaid';

describe('@jupyterlab/mermaid', () => {
  describe('MermaidManager.makeMermaidFigure()', () => {
    let manager: MermaidManager;

    beforeEach(() => {
      manager = new MermaidManager();
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
});
