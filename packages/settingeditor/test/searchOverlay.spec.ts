// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as fs from 'fs';
import * as path from 'path';

describe('@jupyterlab/settingeditor', () => {
  describe('search overlay', () => {
    it('should not stretch the document search overlay to fill the panel', () => {
      // The overlay is attached directly to the panel node by the document
      // search extension, so the panel stylesheet must not force it to fill
      // the panel like the layout children (see #19486).
      const documentSearchCss = fs.readFileSync(
        path.join(__dirname, '..', '..', 'documentsearch', 'style', 'base.css'),
        'utf8'
      );
      const settingEditorCss = fs.readFileSync(
        path.join(__dirname, '..', 'style', 'base.css'),
        'utf8'
      );
      const styleElement = document.createElement('style');
      styleElement.textContent = `${documentSearchCss}\n${settingEditorCss}`;
      document.head.appendChild(styleElement);

      const panel = document.createElement('div');
      panel.id = 'json-setting-editor';
      panel.className = 'lm-Widget';
      document.body.appendChild(panel);

      const content = document.createElement('div');
      content.className = 'lm-Widget';
      panel.appendChild(content);

      const overlay = document.createElement('div');
      overlay.className = 'lm-Widget jp-DocumentSearch-overlay';
      overlay.style.top = 'anchor(--jp-documentsearch-content-header bottom)';
      panel.appendChild(overlay);

      try {
        const overlayStyle = getComputedStyle(overlay);
        // The overlay keeps its own compact top-right placement...
        expect(overlayStyle.position).toBe('absolute');
        expect(overlayStyle.right).toBe('0px');
        // ...instead of being stretched across the whole panel. Note the
        // negative assertions: jsdom returns '' for a computed offset no
        // rule sets, so 'auto' cannot be asserted directly, but without
        // the fix these compute to '0px' (see #19486).
        expect(overlayStyle.left).not.toBe('0px');
        expect(overlayStyle.bottom).not.toBe('0px');

        // The layout children are still stretched to fill the panel.
        const contentStyle = getComputedStyle(content);
        expect(contentStyle.left).toBe('0px');
        expect(contentStyle.bottom).toBe('0px');
      } finally {
        document.head.removeChild(styleElement);
        document.body.removeChild(panel);
      }
    });
  });
});
