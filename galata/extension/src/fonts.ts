// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import '@fontsource/dejavu-sans';
import '@fontsource/dejavu-mono';

const STYLE = `
:root {
  /* Substitute fonts */
  --jp-ui-font-family: 'DejaVu Sans' !important;
  --jp-content-font-family: 'DejaVu Sans' !important;
  --jp-code-font-family: 'DejaVu Mono' !important;
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
  activate: async (app: JupyterFrontEnd): Promise<void> => {
    app.restored.then(() => {
      const style = document.createElement('style');
      style.textContent = STYLE;
      app.shell.node.appendChild(style);
    });
  }
};
