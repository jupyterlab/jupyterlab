/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterLab
} from '@jupyterlab/application';

import {
  ILayoutRestorer, InstanceTracker
} from '@jupyterlab/apputils';

import {
  ISettingRegistry
} from '@jupyterlab/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

/**
 * An interface for modifying and saving application settings.
 */
class SettingEditor extends Widget {
  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.tabIndex = -1;
    this.node.focus();
  }
}


/**
 * The command IDs used by the setting editor.
 */
namespace CommandIDs {
  export
  const open = 'setting-editor:open';
};


/**
 * Activate the command palette.
 */
export
function activateSettingEditor(app: JupyterLab, restorer: ILayoutRestorer, settings: ISettingRegistry): void {
  const { commands, shell } = app;
  const namespace = 'setting-editor';
  const editor = new SettingEditor();
  const tracker = new InstanceTracker<SettingEditor>({ namespace });

  editor.id = namespace;
  editor.title.label = 'Settings';
  editor.title.closable = true;

  // Handle state restoration.
  restorer.restore(tracker, {
    command: CommandIDs.open,
    args: widget => ({ }),
    name: widget => namespace
  });
  tracker.add(editor);

  commands.addCommand(CommandIDs.open, {
    execute: () => {
      console.log('this command was called');
      if (editor.parent === null) {
        shell.addToMainArea(editor);
      }
      shell.activateById(editor.id);
    },
    label: 'Settings'
  });
}
