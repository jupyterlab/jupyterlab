// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ITerminalTracker } from '@jupyterlab/terminal';
import '@fontsource/dejavu-sans';
import '@fontsource/dejavu-mono';
import '@fontsource-variable/noto-sans-sc';

const STYLE = `
:root {
  /* Substitute fonts which do not have theme overrides */
  --jp-code-font-family-default: 'DejaVu Mono' !important;
  /* Ensure we have kerning enabled */
  font-kerning: normal;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: none;
  /* Do not let the browser modify the sizing based on the screen size */
  font-optical-sizing: none;
}
`;

export const fontsPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/galata-extension:fonts',
  autoStart: true,
  description:
    'Adds version-pinned fonts for consistent playwright screenshots',
  optional: [ITerminalTracker],
  activate: (
    app: JupyterFrontEnd,
    terminalTracker: ITerminalTracker | null
  ): void => {
    void app.restored.then(() => {
      const style = document.createElement('style');
      style.textContent = STYLE;
      app.shell.node.appendChild(style);
    });

    // Components created with jupyter-ui-toolkit do not respect variable overwrites
    // as the toke system runs independently; we need to set --body-font manually
    const ensureBodyFont = (): void => {
      if (
        document.body.style.getPropertyValue('--body-font') !== '"DejaVu Sans"'
      ) {
        document.body.style.setProperty('--body-font', '"DejaVu Sans"');
      }
    };

    ensureBodyFont();

    const bodyObserver = new MutationObserver(() => {
      ensureBodyFont();
    });

    bodyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['style']
    });

    // There is no public API to set kerning, rendering, nor antialiasing
    // see https://github.com/xtermjs/xterm.js/issues/2464
    if (terminalTracker) {
      terminalTracker.widgetAdded.connect((_, widget) => {
        const applyCanvasSettings = (canvas: HTMLCanvasElement): void => {
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return;
          }
          ctx.fontKerning = 'normal';
          ctx.textRendering = 'geometricPrecision';
        };

        const applyToExistingCanvases = (): void => {
          // There may be multiple canvas layers when links extension is enabled
          const canvases = widget.content.node.querySelectorAll('canvas');
          for (const canvas of canvases) {
            applyCanvasSettings(canvas);
          }
        };

        const observer = new MutationObserver(() => {
          applyToExistingCanvases();
        });

        observer.observe(widget.content.node, {
          childList: true,
          subtree: true
        });
        applyToExistingCanvases();

        widget.disposed.connect(() => {
          observer.disconnect();
        });
      });
    }
  }
};
