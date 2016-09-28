// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  DisposableDelegate, IDisposable
} from 'phosphor/lib/core/disposable';

import {
  h, VNode
} from 'phosphor/lib/ui/vdom';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  ObservableList
} from '../common/observablelist';

import {
  VDomModel, VDomWidget
} from '../common/vdom';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  IPathTracker
} from '../filebrowser';

import {
  IServiceManager
} from '../services';


/**
 * The landing page extension.
 */
export
const launcherExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.launcher',
  requires: [IServiceManager, IPathTracker, ICommandPalette],
  activate: activateLauncher,
  autoStart: true
};


/**
 * Activate the launcher.
 */
function activateLauncher(app: JupyterLab, services: IServiceManager, pathTracker: IPathTracker, palette: ICommandPalette): void {
  let launcherModel = new LauncherModel();

  launcherModel.setDir(pathTracker.path);

  pathTracker.pathChanged.connect(() => {
    launcherModel.setDir(pathTracker.path);
  });

  let launcherWidget = new LauncherWidget()

  launcherWidget.model = launcherModel;
  launcherWidget.id = 'landing-jupyterlab-widget';
  launcherWidget.title.label = 'Launcher';
  launcherWidget.addClass('jp-Launcher');

  // Hardcoded defaults.
  let names = [
    'Notebook',
    'Console',
    'Terminal',
    'Text Editor',
  ];

  let actions = [
    'file-operations:new-notebook',
    `console:create-${services.kernelspecs.default}`,
    'terminal:create-new',
    'file-operations:new-text-file',
  ]

  let list : IDisposable[] = []; //DEMO
  let l : IDisposable; //DEMO

  for (let i in names) {
    let itemName = names[i];
    let action = actions[i];
    l = launcherModel.add(itemName, () => app.commands.execute(action, void 0));
    list.push(l) // DEMO
  }

  // DEMO
  launcherModel.add("Add Random", () => {
    let index = Math.floor(Math.random() * actions.length);
    let itemName = names[index];
    let action = actions[index];
    l = launcherModel.add(itemName, () => app.commands.execute(action, void 0));
    list.push(l);
  });

  launcherModel.add("Remove Last", () => {
      list.pop().dispose();
  });
  //  end DEMO



  app.commands.addCommand('jupyterlab-launcher:add-item', {
    label: 'Add Launcher Item',
    execute: args => {
      // I'm not sure how to handle this -pi
      launcherModel.add(args['name'] as string, args['clickCallback'] as any);
    }
  });


  app.commands.addCommand('jupyterlab-launcher:show', {
    label: 'Show Launcher',
    execute: () => {
      if (!launcherWidget.isAttached) {
        app.shell.addToLeftArea(launcherWidget);
      } else {
        app.shell.activateMain(launcherWidget.id);
      }
    }
  });

  palette.addItem({
    command: 'jupyterlab-launcher:show',
    category: 'Help'
  });

  app.shell.addToLeftArea(launcherWidget);
}


/**
 * Simple encapsulation of name and callback of launcher entries.
 */
class LauncherItem {
  constructor(public name: string, public clickCallback: () => void) {
    }
}


/**
 * LauncherModel keeps track of the path to working directory and has a list of
 * LauncherItems.
 */
class LauncherModel  extends VDomModel {
  items : LauncherItem[] = [];
  path : string = 'home';
  /**
   * Convenience method to add a launcher with a given name and callback.
   *
   * This keeps plugins who wish to register themselves in the Launcher from
   * having to import both LauncherItems and LauncherItem.
   */
  add(name: string, clickCallback: () => void) : IDisposable {
    return this.addItem(new LauncherItem(name, clickCallback));
  }

  /**
   * Add a new launcher and trigger re-render event for parent widget.
   *
   * returns a Disposable which can be called to remove this new item from
   * the Launcher and trigger another re-render event.
   */
  addItem(item: LauncherItem) : IDisposable {
    this.items.push(item);
    this.stateChanged.emit(void 0);

    return new DisposableDelegate(() => {
      // Remove the item form the list of items.
      var index = this.items.indexOf(item, 0);
      if (index > -1) {
          this.items.splice(index, 1);
          this.stateChanged.emit(void 0);
      }
    });
  }
  
  setDir(path: string) : void {
    this.path = path;
    this.stateChanged.emit(void 0);
  }
}


/**
 * A virtual-DOM-based widget for the Launcher.
 */
class LauncherWidget extends VDomWidget<LauncherModel> {

  protected render(): VNode | VNode[] {
    let children : VNode[] = [];

    for (let item of this.model.items) {
      let imgName = item.name.replace(' ', '');
      let img = h.span({className: `jp-Image${imgName} jp-LauncherWidget-image`});
      let text = h.span({className: 'jp-LauncherWidget-text' }, item.name);

      let column = h.div({
        className: 'jp-LauncherWidget-column',
        'onclick': item.clickCallback
      }, [img, text])
      children.push(column);
    }

    let folderImage = h.span({ className: 'jp-LauncherWidget-folder' });
    let p = this.model.path;
    let pathName = p.length ? 'home > ' + p.replace('/', ' > ') : 'home';
    let path = h.span({ className: 'jp-LauncherWidget-path' }, pathName );

    let cwd = h.div({ className: 'jp-LauncherWidget-cwd' }, [folderImage, path]);
    let body = h.div({ className: "jp-LauncherWidget-body" }, children);

    return h.div({ className: 'jp-LauncherWidget-dialog'}, [ cwd, body ]);

  }
}
