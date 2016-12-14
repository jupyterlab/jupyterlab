// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

let mods: any[] = [
  require('../../lib/about/plugin'),
  require('../../lib/application/plugin'),
  require('../../lib/clipboard/plugin'),
  require('../../lib/codemirror/plugin'),
  require('../../lib/commandlinker/plugin'),
  require('../../lib/commandpalette/plugin'),
  require('../../lib/console/plugin'),
  require('../../lib/csvwidget/plugin'),
  require('../../lib/docmanager/plugin'),
  require('../../lib/docregistry/plugin'),
  require('../../lib/editorwidget/plugin'),
  require('../../lib/faq/plugin'),
  require('../../lib/filebrowser/plugin'),
  require('../../lib/help/plugin'),
  require('../../lib/imagewidget/plugin'),
  require('../../lib/inspector/plugin'),
  require('../../lib/landing/plugin'),
  require('../../lib/launcher/plugin'),
  require('../../lib/layoutrestorer/plugin'),
  require('../../lib/mainmenu/plugin'),
  require('../../lib/markdownwidget/plugin'),
  require('../../lib/notebook/plugin'),
  require('../../lib/rendermime/plugin'),
  require('../../lib/running/plugin'),
  require('../../lib/services/plugin'),
  require('../../lib/shortcuts/plugin'),
  require('../../lib/statedb/plugin'),
  require('../../lib/terminal/plugin')
];

var plugins: any[] = [];
for (let mod of mods) {
  plugins = plugins.concat(mod.default);
}
export default plugins;
