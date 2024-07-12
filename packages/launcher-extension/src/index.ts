// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module launcher-extension
 */

import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette, MainAreaWidget } from '@jupyterlab/apputils';
import { FileBrowserModel, IDefaultFileBrowser } from '@jupyterlab/filebrowser';
import { ILauncher, Launcher, LauncherModel } from '@jupyterlab/launcher';
import { ITranslator } from '@jupyterlab/translation';
import { addIcon, launcherIcon } from '@jupyterlab/ui-components';
import { find } from '@lumino/algorithm';
import { JSONObject } from '@lumino/coreutils';
import { DockPanel, TabBar, Widget } from '@lumino/widgets';

/**
 * The command IDs used by the launcher plugin.
 */
namespace CommandIDs {
  export const create = 'launcher:create';
}

/**
 * A service providing an interface to the the launcher.
 */
const plugin: JupyterFrontEndPlugin<ILauncher> = {
  activate,
  id: '@jupyterlab/launcher-extension:plugin',
  description: 'Provides the launcher tab service.',
  requires: [ITranslator],
  optional: [ILabShell, ICommandPalette, IDefaultFileBrowser],
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
function activate(
  app: JupyterFrontEnd,
  translator: ITranslator,
  labShell: ILabShell | null,
  palette: ICommandPalette | null,
  defaultBrowser: IDefaultFileBrowser | null
): ILauncher {
  const { commands, shell } = app;
  const trans = translator.load('jupyterlab');
  const model = new LauncherModel();

  commands.addCommand(CommandIDs.create, {
    label: trans.__('New Launcher'),
    icon: args => (args.toolbar ? addIcon : undefined),
    execute: (args: JSONObject) => {
      const cwd = (args['cwd'] as string) ?? defaultBrowser?.model.path ?? '';
      const id = `launcher-${Private.id++}`;
      const callback = (item: Widget) => {
        // If widget is attached to the main area replace the launcher
        if (find(shell.widgets('main'), w => w === item)) {
          shell.add(item, 'main', { ref: id });
          launcher.dispose();
        }
      };
      const launcher = new Launcher({
        model,
        cwd,
        callback,
        commands,
        translator
      });

      launcher.model = model;
      launcher.title.icon = launcherIcon;
      launcher.title.label = trans.__('Launcher');

      const main = new MainAreaWidget({ content: launcher });

      // If there are any other widgets open, remove the launcher close icon.
      main.title.closable = !!Array.from(shell.widgets('main')).length;
      main.id = id;

      shell.add(main, 'main', {
        activate: args['activate'] as boolean,
        ref: args['ref'] as string
      });

      if (labShell) {
        labShell.layoutModified.connect(() => {
          // If there is only a launcher open, remove the close icon.
          main.title.closable = Array.from(labShell.widgets('main')).length > 1;
        }, main);
      }

      if (defaultBrowser) {
        const onPathChanged = (model: FileBrowserModel) => {
          launcher.cwd = model.path;
        };
        defaultBrowser.model.pathChanged.connect(onPathChanged);
        launcher.disposed.connect(() => {
          defaultBrowser.model.pathChanged.disconnect(onPathChanged);
        });
      }

      return main;
    }
  });

  if (labShell) {
    void Promise.all([app.restored, defaultBrowser?.model.restored]).then(
      () => {
        function maybeCreate() {
          // Create a launcher if there are no open items.
          if (labShell!.isEmpty('main')) {
            void commands.execute(CommandIDs.create);
          }
        }
        // When layout is modified, create a launcher if there are no open items.
        labShell.layoutModified.connect(() => {
          maybeCreate();
        });
      }
    );
  }

  if (palette) {
    palette.addItem({
      command: CommandIDs.create,
      category: trans.__('Launcher')
    });
  }

  if (labShell) {
    labShell.addButtonEnabled = true;
    labShell.addRequested.connect((sender: DockPanel, arg: TabBar<Widget>) => {
      // Get the ref for the current tab of the tabbar which the add button was clicked
      const ref =
        arg.currentTitle?.owner.id ||
        arg.titles[arg.titles.length - 1].owner.id;

      return commands.execute(CommandIDs.create, { ref });
    });
  }

  return model;
}

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * The incrementing id used for launcher widgets.
   */
  export let id = 0;
}
