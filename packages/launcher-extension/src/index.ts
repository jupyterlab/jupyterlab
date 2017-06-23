// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IServiceManager
} from '@jupyterlab/services';

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';


import {
  ICommandPalette
} from '@jupyterlab/apputils';

import {
  ILauncher, LauncherModel, LauncherWidget
} from '@jupyterlab/launcher';

import {
  VirtualNode, h
} from '@phosphor/virtualdom';

import {
  Widget
} from '@phosphor/widgets';

import '../style/index.css';
import '@jupyterlab/launcher/style/index.css';



/**
 * The command IDs used by the launcher plugin.
 */
namespace CommandIDs {
  export
  const create = 'launcher-jupyterlab:create';
};

/**
 * The class name added to the launcher header section.
 */
const LAUNCHER_HEADER_CLASS = 'jp-Launcher-header';

/**
 * The class name for the JupyterLab icon from default-theme.
 */
const JUPYTERLAB_ICON_CLASS = 'jp-ImageJupyterLab';

/**
 * The class name added to specify size of the JupyterLab logo.
 */
const LAUNCHER_LOGO_CLASS = 'jp-Launcher-logo';

/**
 * The class name added to the preview message subtitle.
 */
const LAUNCHER_SUBTITLE_CLASS = 'jp-Launcher-subtitle';

/**
 * The class name added to the header text.
 */
const LAUNCHER_BODY_HEADER_CLASS = 'jp-Launcher-body-header';


/**
 * A service providing an interface to the the launcher.
 */
const plugin: JupyterLabPlugin<ILauncher> = {
  activate,
  id: 'jupyter.services.launcher',
  requires: [
    IServiceManager,
    ICommandPalette
  ],
  provides: ILauncher,
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Activate the launcher.
 */
function activate(app: JupyterLab, services: IServiceManager, palette: ICommandPalette): ILauncher {
  const { commands, shell } = app;

  let model = new LauncherModel();

  commands.addCommand(CommandIDs.create, {
    label: 'New Launcher',
    execute: (args) => {
      let cwd = args['cwd'] ? String(args['cwd']) : '';
      let id = `launcher-${Private.id++}`;
      let callback = (item: Widget) => {
        shell.addToMainArea(item, { ref: id });
        shell.activateById(item.id);
      };
      let header: VirtualNode;
      if (args['banner'] === true) {
        header = Private.createBanner(app.info.version);
      }
      let widget = new LauncherWidget({ cwd, callback, header });
      widget.model = model;
      widget.id = id;
      widget.title.label = 'Launcher';
      widget.title.closable = true;
      shell.addToMainArea(widget);
      if (args['activate'] !== false) {
        shell.activateById(widget.id);
      }
    }
  });

  palette.addItem({ command: CommandIDs.create, category: 'Launcher'});

  return model;
}


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * The incrementing id used for launcher widgets.
   */
  export
  let id = 0;


  /**
   * Create a banner given an app version.
   */
  export
  function createBanner(version: string): VirtualNode {
    let previewMessage = `alpha (v${version})`;
    let headerText = 'Start a new activity';
    let logo = h.span({
      className: `${JUPYTERLAB_ICON_CLASS} ${LAUNCHER_LOGO_CLASS}`
    });
    let subtitle = h.span(
      {className: LAUNCHER_SUBTITLE_CLASS},
      previewMessage
    );
    let bodyheader = h.span({
      className: LAUNCHER_BODY_HEADER_CLASS
    }, headerText);

    return h.div({ className: LAUNCHER_HEADER_CLASS},
      logo,
      subtitle,
      bodyheader
    );
  }
}
