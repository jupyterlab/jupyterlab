// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

module.exports = [
  require('../lib/about/plugin').aboutExtension,
  require('../lib/clipboard/plugin').clipboardProvider,
  require('../lib/commandlinker/plugin').commandLinkerProvider,
  require('../lib/commandpalette/plugin').commandPaletteProvider,
  require('../lib/console/plugin').consoleTrackerProvider,
  require('../lib/console/codemirror/plugin').rendererProvider,
  require('../lib/csvwidget/plugin').csvHandlerExtension,
  require('../lib/docregistry/plugin').docRegistryProvider,
  require('../lib/editorwidget/plugin').editorHandlerProvider,
  require('../lib/faq/plugin').faqExtension,
  require('../lib/filebrowser/plugin').fileBrowserProvider,
  require('../lib/help/plugin').helpHandlerExtension,
  require('../lib/imagewidget/plugin').imageHandlerExtension,
  require('../lib/inspector/plugin').inspectorProvider,
  require('../lib/landing/plugin').landingExtension,
  require('../lib/launcher/plugin').launcherProvider,
  require('../lib/main/plugin').mainExtension,
  require('../lib/mainmenu/plugin').mainMenuProvider,
  require('../lib/markdownwidget/plugin').markdownHandlerExtension,
  require('../lib/notebook/plugin').notebookTrackerProvider,
  require('../lib/notebook/codemirror/plugin').rendererProvider,
  require('../lib/rendermime/plugin').renderMimeProvider,
  require('../lib/running/plugin').runningSessionsExtension,
  require('../lib/services/plugin').servicesProvider,
  require('../lib/shortcuts/plugin').shortcutsExtension,
  require('../lib/terminal/plugin').terminalExtension,
  require('../lib/codemirror/plugin').editorFactory
];
