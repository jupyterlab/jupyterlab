// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IMainMenu
} from '../mainmenu';

import {
  Widget, Menu
} from '@phosphor/widgets';

import {
  IRealtime, IRealtimeModel, checkTracker
} from './realtime';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  showDialog, okButton
} from '../common/dialog';


let trackerSet = new Set<[InstanceTracker<Widget>, (widget: Widget)=>IRealtimeModel, (widget: Widget)=>void]>();

const plugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.realtime-menu',
  requires: [IMainMenu],
  activate: activateRealtimeMenu,
  autoStart: true
};

const cmdIds = {
  shareRealtimeFile : 'realtime:share',
  openRealtimeFile : 'realtime:open',
};

function activateRealtimeMenu(app: JupyterLab, mainMenu : IMainMenu): void {
  app.resolveOptionalService(IRealtime).then((realtimeServices)=>{
    mainMenu.addMenu(createMenu(app), {rank: 60});
    let commands = app.commands;

    commands.addCommand(cmdIds.shareRealtimeFile, {
      label: 'Share file',
      caption: 'Share this file',
      execute: ()=> {
        let [widget, model, callback] = getRealtimeModel(app);
        if (model) {
          realtimeServices.shareDocument(model)
          .then( ()=>{callback(widget);} );
        }
      }
    });
    commands.addCommand(cmdIds.openRealtimeFile, {
      label: 'Open shared file',
      caption: 'Open a file that has been shared with you',
      execute: ()=> {
        let [widget, model, callback] = getRealtimeModel(app);
        if(model) {
          realtimeServices.openSharedDocument(model)
          .then( ()=>{callback(widget);} );
        }
      }
    });
  }).catch( ()=>{
    console.log("Realtime services not found, so no menu created.");
  });
}


function createMenu( app: JupyterLab ) : Menu {

  let menu = new Menu( {commands: app.commands} )
  menu.title.label = 'Realtime'

  menu.addItem( {command: cmdIds.shareRealtimeFile});
  menu.addItem( {command: cmdIds.openRealtimeFile});

  return menu;
}

function getRealtimeModel( app: JupyterLab): [Widget, IRealtimeModel, (widget: Widget)=>void] {
  let widget = app.shell.currentWidget;
  let model: IRealtimeModel = null;
  let callback: (widget: Widget)=>void = null;
  [model, callback] = checkTracker(widget);
  return [widget, model, callback];
}

/**
 * Export the plugin as default.
 */
export default plugin;
