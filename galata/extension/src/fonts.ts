// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import '@fontsource/dejavu-sans';
import '@fontsource/ubuntu';
import '@fontsource/dejavu-mono';

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
  activate: (app: JupyterFrontEnd): void => {
    void app.restored.then(() => {
      const style = document.createElement('style');
      style.textContent = STYLE;
      app.shell.node.appendChild(style);
      // Components created with jupyter-ui-toolkit do not respect variable overwrites
      // as the toke system runs independently; we need to set --body-font manually
      document.body.style.setProperty('--body-font', 'Ubuntu');
    });
  }
};
