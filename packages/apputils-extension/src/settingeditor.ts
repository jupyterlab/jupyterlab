/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterLab
} from '@jupyterlab/application';

import {
  ILayoutRestorer
} from '@jupyterlab/apputils';

import {
  ISettingRegistry
} from '@jupyterlab/coreutils';


import {
  Widget
} from '@phosphor/widgets';

/**
 * An interface for modifying and saving application settings.
 */
class SettingEditor extends Widget {
}


/**
 * The command IDs used by the setting editor.
 */
namespace CommandIDs {
  export
  const activate = 'setting-editor:activate';
};


/**
 * Activate the command palette.
 */
export
function activateSettingEditor(app: JupyterLab, restorer: ILayoutRestorer, settings: ISettingRegistry): void {
  const { commands, shell } = app;
  const editor = new SettingEditor();

  // Let the application restorer track the setting editor for restoration of
  // application state.
  restorer.add(editor, 'setting-editor');

  editor.id = 'setting-editor';
  editor.title.label = 'Settings';

  commands.addCommand(CommandIDs.activate, {
    execute: () => {
      if (editor.parent === null) {
        shell.addToMainArea(editor);
      }
      shell.activateById(editor.id);
    },
    label: 'Activate Setting Editor'
  });
}
