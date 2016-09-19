import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  IFrame
} from '../iframe';

import {
  IMainMenu
} from '../mainmenu';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  Menu
} from 'phosphor/lib/ui/menu';


export
const bokehApplicationExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.bk-application',
  requires: [ICommandPalette, IMainMenu],
  activate: activateBokehApplication,
  autoStart: true
}


/**
 * Activate the bokeh application extension.
 */
function activateBokehApplication(app: JupyterLab, palette: ICommandPalette, mainMenu: IMainMenu): void {
  // let iframe = new IFrame();
  // iframe.addClass('bk-app');
  // iframe.title.label = 'Bokeh Application';
  // iframe.id = 'bk-app';

  // COMMANDS.forEach(command => app.commands.addCommand(command.id, {
  //   label: command.text,
  //   execute: () => {
  //     Private.showApplication(app, iframe);
  //   }
  // }));

  // app.commands.addCommand('bk-app:launch', {
  //   execute: () => { Private.showApplication(app, iframe); }
  // });

  // COMMANDS.forEach(item => palette.addItem({
  //   command: item.id,
  //   category: 'Bokeh'
  // }));

  let openBokehApplicationId = 'bk-application:open';

  app.commands.addCommand(openBokehApplicationId, {
    label: 'Open Bokeh Application',
    execute: () => {
      window.open('http://localhost:5006');
    }
  });
  palette.addItem({ command: openBokehApplicationId, category: 'Bokeh'});

  let menu = Private.createMenu(app);
  mainMenu.addMenu(menu, {});

}


/**
 * A namespace for help plugin private functions.
 */
namespace Private {
  /**
   * Creates a menu for the help plugin.
   */
  export
  function createMenu(app: JupyterLab): Menu {
    let { commands, keymap } = app;
    let menu = new Menu({ commands, keymap });
    menu.title.label = 'Bokeh';
    menu.addItem({ command: 'bk-application:open' })

    return menu;
  }

  // /**
  //  * Show the application widget.
  //  */
  // export
  // function showApplication(app: JupyterLab, iframe: Widget): void {
  //   app.shell.activateRight(iframe.id);
  // }
}
