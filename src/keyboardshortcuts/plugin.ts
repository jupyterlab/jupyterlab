// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  CommandPalette
} from 'phosphor/lib/ui/commandpalette';

import {
  h, render, VNode 
} from 'phosphor/lib/ui/vdom';


/**
 * The keyboard shortcuts page extension.
 */
export
const keyboardShortcutsExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.keyboardShortcuts',
  activate: activateKeyBoardShortcuts,
  autoStart: true,
  requires: [ICommandPalette]
};


function activateKeyBoardShortcuts(app: JupyterLab, palette: ICommandPalette): void {
  let widget = new Widget();
  widget.id = 'keyboard-shortcuts-jupyterlab';
  widget.title.label = 'Keyboard Shortcuts';
  widget.title.closable = true;
  widget.node.style.overflowY = 'auto';

  console.log("logging app.keymap..");
  console.log(app.keymap);
  console.log("logging app.commands..");
  console.log(app.commands);

  //gets keyboard shortcut
  console.log(app.keymap["_bindings"]["_array"].length);
  console.log(app.keymap["_bindings"]["_array"][0]["_keys"][2]);

  //gets command ID (text)
  console.log(app.keymap["_bindings"]["_array"][0]["_command"]);

  //gets human readable 
  
  // for (let y = 0; y < app.keymap["_bindings"]["_array"].length; y++) {
  //   let commandText = app.keymap["_bindings"]["_array"][y]["_command"];
  //   //console.log(app.commands["_commands"]["console:clear"].label("console:clear", null));
  //   console.log(commandText);
  //   console.log(app.commands.label(commandText, null));
  // }
  console.log(app.commands.label("console:linebreak", null));


  let shortcutArray: VNode[] = [];

  for(let i = 0; i < app.keymap["_bindings"]["_array"].length; i++) {
    let shortcutHtml =
      h.tr(
        h.td(app.commands["_commands"]['about-jupyterlab:show'].label('about-jupyterlab:show', null)),
        h.td( app.keymap["_bindings"]["_array"][i]["_keys"][0])
      )
    shortcutArray.push(shortcutHtml);
  }

  let shortcutTable = h.table(shortcutArray);

  render(shortcutTable, widget.node);


  let command = 'keyboard-shortcuts-jupyterlab:show';
  app.commands.addCommand(command, {
    label: 'Keyboard Shortcuts',
    execute: () => {
      if (!widget.isAttached) {
        app.shell.addToMainArea(widget);
      } else {
        app.shell.activateMain(widget.id);
      }
    }
  });
  palette.addItem({ command, category: 'Help' });
}