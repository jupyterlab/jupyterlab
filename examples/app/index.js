// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterLab } from '@jupyterlab/application';
import { ILabShell } from '@jupyterlab/application';
import { ITranslator } from '@jupyterlab/translation';
import { ICommandPalette } from '@jupyterlab/apputils';
import { NotebookPanel } from '@jupyterlab/notebook';

// The webpack public path needs to be set before loading the CSS assets.
import { PageConfig } from '@jupyterlab/coreutils';
// eslint-disable-next-line
__webpack_public_path__ = PageConfig.getOption('fullStaticUrl') + '/';

// Load the CSS assets
const styles = import('./build/style.js');

// These extension and mimeExtension imports should match the list of extensions in package.json. They are listed
// separately in package.json so the webpack config Build.ensureAssets step can copy
// extension assets to the build directory. These import statements assume
// the JupyterLab plugins are the default export from each package.
const extensions = [
  import('@jupyterlab/application-extension'),
  import('@jupyterlab/apputils-extension'),
  import('@jupyterlab/celltags-extension'),
  import('@jupyterlab/codemirror-extension'),
  import('@jupyterlab/completer-extension'),
  import('@jupyterlab/console-extension'),
  import('@jupyterlab/csvviewer-extension'),
  import('@jupyterlab/docmanager-extension'),
  import('@jupyterlab/filebrowser-extension'),
  import('@jupyterlab/fileeditor-extension'),
  import('@jupyterlab/help-extension'),
  import('@jupyterlab/imageviewer-extension'),
  import('@jupyterlab/inspector-extension'),
  import('@jupyterlab/launcher-extension'),
  import('@jupyterlab/mainmenu-extension'),
  import('@jupyterlab/markdownviewer-extension'),
  import('@jupyterlab/mathjax2-extension'),
  import('@jupyterlab/notebook-extension'),
  import('@jupyterlab/rendermime-extension'),
  import('@jupyterlab/running-extension'),
  import('@jupyterlab/settingeditor-extension'),
  import('@jupyterlab/shortcuts-extension'),
  import('@jupyterlab/statusbar-extension'),
  import('@jupyterlab/terminal-extension'),
  import('@jupyterlab/theme-dark-extension'),
  import('@jupyterlab/theme-light-extension'),
  import('@jupyterlab/toc-extension'),
  import('@jupyterlab/tooltip-extension'),
  import('@jupyterlab/translation-extension'),
  import('@jupyterlab/ui-components-extension'),
  {
    id: 'remotecontrol:plugin',
    autoStart: true,
    requires: [ILabShell, ITranslator],
    optional: [ICommandPalette],
    activate: app => {
      console.log('JupyterLab extension remotecontrol is activated!');
      console.log(app.commands.listCommands());
      console.log(app.shell);
      window.addEventListener('message', event => {
        const { action } = event.data;
        console.log(action);
        if (action === 'ping') {
          console.log('got ping, sending pong...');
          window.parent.postMessage({ action: 'pong' }, '*');
        }
        if (action === 'runCommand') {
          const { command } = event.data;
          console.log(app.shell.currentWidget);
          if (app.shell.currentWidget instanceof NotebookPanel) {
            app.commands.execute(command);
          } else {
            console.log('current widget is not notebook, so doing nothing');
          }
        }
      });
    }
  }
];

const mimeExtensions = [
  import('@jupyterlab/json-extension'),
  import('@jupyterlab/pdf-extension')
];

window.addEventListener('load', async function () {
  // Make sure the styles have loaded
  await styles;

  // Initialize JupyterLab with the mime extensions and application extensions.
  const lab = new JupyterLab({
    mimeExtensions: await Promise.all(mimeExtensions)
  });
  lab.registerPluginModules(await Promise.all(extensions));

  /* eslint-disable no-console */
  console.log('Starting app');
  await lab.start();
  console.log('App started, waiting for restore');
  await lab.restored;
  console.log('Example started!');
});
