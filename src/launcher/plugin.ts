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
 * The class name added to LauncherWidget instances.
 */
const LAUNCHER_CLASS = 'jp-LauncherWidget';

/**
 * The class name added to LauncherWidget image nodes.
 */
const IMAGE_CLASS = 'jp-LauncherWidget-image';

/**
 * The class name added to LauncherWidget text nodes.
 */
const TEXT_CLASS = 'jp-LauncherWidget-text';

/**
 * The class name added to LauncherWidget column nodes.
 */
const COLUMN_CLASS = 'jp-LauncherWidget-column';

/**
 * The class name added to LauncherWidget folder node.
 */
const FOLDER_CLASS = 'jp-LauncherWidget-folder';

/**
 * The class name added to LauncherWidget path nodes.
 */
const PATH_CLASS = 'jp-LauncherWidget-path';

/**
 * The class name added to LauncherWidget current working directory node.
 */
const CWD_CLASS = 'jp-LauncherWidget-cwd';

/**
 * The class name added to LauncherWidget body nodes.
 */
const BODY_CLASS = 'jp-LauncherWidget-body';

/**
 * The class name added to LauncherWidget dialog node.
 */
const DIALOG_CLASS = 'jp-LauncherWidget-dialog';


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

  for (let i in names) {
    let itemName = names[i];
    let action = actions[i];

    // Note: we do not retain a handle on the items added by default, which
    // means we have to way of removing them after the fact.
    launcherModel.add(itemName, () => app.commands.execute(action, void 0));
  }

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

  readonly name: string;
 
  readonly clickCallback: () => void;
 
  constructor(name: string, clickCallback: () => void) {
    this.name = name;
    this.clickCallback = clickCallback;
  }
}


/**
 * LauncherModel keeps track of the path to working directory and has a list of
 * LauncherItems.
 */
class LauncherModel extends VDomModel {
  items: LauncherItem[] = [];
  path: string = 'home';
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

  constructor() {
    super();
    this.addClass(LAUNCHER_CLASS);
  }

  protected render(): VNode | VNode[] {
    let children : VNode[] = [];

    for (let item of this.model.items) {
      let imgName = item.name.replace(/\ /g, '');
      let img = h.span({className: `jp-Image${imgName} ` + IMAGE_CLASS});
      let text = h.span({className:  TEXT_CLASS }, item.name);

      let column = h.div({
        className: COLUMN_CLASS,
        'onclick': item.clickCallback
      }, [img, text])
      children.push(column);
    }

    let folderImage = h.span({ className: FOLDER_CLASS });
    let p = this.model.path;
    let pathName = p.length ? 'home > ' + p.replace(/\//g, ' > ') : 'home';
    let path = h.span({ className: PATH_CLASS }, pathName );

    let cwd = h.div({ className: CWD_CLASS }, [folderImage, path]);
    let body = h.div({ className: BODY_CLASS  }, children);

    return h.div({ className: DIALOG_CLASS}, [ cwd, body ]);

  }
}
