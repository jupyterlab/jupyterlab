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
  IRealtime, IRealtimeModel
} from './realtime';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  showDialog, okButton
} from '../common/dialog';


let trackerSet = new Set<[InstanceTracker<Widget>, (widget: Widget)=>IRealtimeModel, (widget: Widget)=>void]>();

const plugin: JupyterLabPlugin<IRealtime> = {
  id: 'jupyter.services.realtime',
  requires: [IMainMenu],
  provides: IRealtime,
  activate: activateRealtime,
  autoStart: true
};

const cmdIds = {
  shareRealtimeFile : 'realtime:share',
  openRealtimeFile : 'realtime:open',
};

function activateRealtime(app: JupyterLab, mainMenu : IMainMenu): IRealtime {

  //let realtime = new Realtime();
  let realtime: IRealtime = null;

  mainMenu.addMenu(createMenu(app), {rank: 60});
  let commands = app.commands;

  commands.addCommand(cmdIds.shareRealtimeFile, {
    label: 'Share file',
    caption: 'Share this file',
    execute: ()=> {
      let [widget, model, callback] = getRealtimeModel(app);
      if (model) {
        realtime.shareDocument(model)
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
        realtime.openSharedDocument(model)
        .then( ()=>{callback(widget);} );
      }
    }
  });

  return realtime;
}


function createMenu( app: JupyterLab ) : Menu {

  let menu = new Menu( {commands: app.commands} )
  menu.title.label = 'Realtime'

  menu.addItem( {command: cmdIds.shareRealtimeFile});
  menu.addItem( {command: cmdIds.openRealtimeFile});

  return menu;
}

function getRealtimeModel( app: JupyterLab): [Widget, IRealtimeModel, (widget: Widget)=>void] {
  let model: IRealtimeModel = null;
  let callback: (widget: Widget)=>void = null;
  let widget = app.shell.currentWidget;
  trackerSet.forEach( ([tracker, getModel, cb]) => {
    if (tracker.has(widget)) {
      model = getModel(widget);
      callback = cb;
    }
  });
  return [widget, model, callback];
}

export
function addRealtimeTracker( tracker: InstanceTracker<Widget>, getModel : (widget: Widget)=>IRealtimeModel, callback: (widget: Widget)=>void = ()=>{} ): void {
  trackerSet.add([tracker, getModel, callback]);
}

/**
 * Export the plugin as default.
 */
export default plugin;
