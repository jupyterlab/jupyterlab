// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

module.exports = [
  require('jupyterlab/lib/about/plugin').aboutExtension,
  require('jupyterlab/lib/clipboard/plugin').clipboardProvider,
  require('jupyterlab/lib/commandpalette/plugin').commandPaletteProvider,
  require('jupyterlab/lib/console/plugin').consoleExtension,
  require('jupyterlab/lib/csvwidget/plugin').csvHandlerExtension,
  require('jupyterlab/lib/docregistry/plugin').docRegistryProvider,
  require('jupyterlab/lib/editorwidget/plugin').editorHandlerProvider,
  require('jupyterlab/lib/faq/plugin').faqExtension,
  require('jupyterlab/lib/filebrowser/plugin').fileBrowserProvider,
  require('jupyterlab/lib/help/plugin').helpHandlerExtension,
  require('jupyterlab/lib/imagewidget/plugin').imageHandlerExtension,
  require('jupyterlab/lib/inspector/plugin').inspectorProvider,
  require('jupyterlab/lib/leafletwidget/plugin').mapHandlerExtension,
  require('jupyterlab/lib/landing/plugin').landingExtension,
  require('jupyterlab/lib/main/plugin').mainExtension,
  require('jupyterlab/lib/mainmenu/plugin').mainMenuProvider,
  require('jupyterlab/lib/markdownwidget/plugin').markdownHandlerExtension,
  require('jupyterlab/lib/notebook/plugin').notebookTrackerProvider,
  require('jupyterlab/lib/rendermime/plugin').renderMimeProvider,
  require('jupyterlab/lib/running/plugin').runningSessionsExtension,
  require('jupyterlab/lib/services/plugin').servicesProvider,
  require('jupyterlab/lib/shortcuts/plugin').shortcutsExtension,
  require('jupyterlab/lib/terminal/plugin').terminalExtension,
  require('jupyterlab/lib/notebook/codemirror/plugin').rendererProvider,
  require('jupyterlab/lib/console/codemirror/plugin').rendererProvider,
  require('jupyterlab/lib/keyboardshortcuts/plugin').keyboardShortcutsExtension
];
