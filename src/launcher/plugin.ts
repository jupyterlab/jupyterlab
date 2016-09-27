// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  h, VNode
} from 'phosphor/lib/ui/vdom';

import {
  VDomModel, VDomWidget
} from '../common/vdom';

import {
  ObservableList
} from '../common/observablelist';

import {
  DisposableDelegate, IDisposable
} from 'phosphor/lib/core/disposable';

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



function activateLauncher(app: JupyterLab, services: IServiceManager, pathTracker: IPathTracker, palette: ICommandPalette): void {
  let widget = new Widget();
  widget.id = 'landing-jupyterlab';
  widget.title.label = 'Launcher';
  widget.addClass('jp-Launcher');

  let dialog = document.createElement('div');
  dialog.className = 'jp-Launcher-dialog';
  widget.node.appendChild(dialog);

  let path = document.createElement('span');
  path.textContent = 'home';
  pathTracker.pathChanged.connect(() => {
    if (pathTracker.path.length > 0) {
      path.textContent = 'home > ';
      let path2 = pathTracker.path;
      path2 = path2.replace('/', ' > ');
      path.textContent += path2;
    } else {
      path.textContent = 'home';
    }
  });
  path.className = 'jp-Launcher-path';

  let cwd = document.createElement('div');
  cwd.className = 'jp-Launcher-cwd';

  let folderImage = document.createElement('span');
  folderImage.className = 'jp-Launcher-folder';


  cwd.appendChild(folderImage);
  cwd.appendChild(path);
  dialog.appendChild(cwd);

  let body = document.createElement('div');
  body.className = 'jp-Launcher-body';
  dialog.appendChild(body);

  let items = new LauncherItems(body);

  let list : IDisposable[] = []; //DEMO ONLY
  let l : IDisposable; //DEMO ONLY

  let names = [
      'Notebook',
      'Console',
      'Terminal',
      'Text Editor',
  ]
  let actions = [
      'file-operations:new-notebook',
      `console:create-${services.kernelspecs.default}`,
      'terminal:create-new',
      'file-operations:new-text-file',
  ]

  let launcherModel = new LauncherModel();
  let launcherWidget = new LauncherWidget()

  launcherWidget.model = launcherModel;
  launcherWidget.id = 'landing-jupyterlab-widget';
  launcherWidget.title.label = 'Launcher2';

  for (let i in names) {
      let itemName = names[i];
      let action = actions[i];
      let l = items.add(itemName, () => app.commands.execute(action, void 0));
      l = launcherModel.add(itemName, () => app.commands.execute(action, void 0));
      list.push(l)

  }



  launcherModel.add("Add Random", () => {

      let index = Math.floor(Math.random() * actions.length);
      let itemName = names[index];
      let action = actions[index];
      l = launcherModel.add(itemName, () => app.commands.execute(action, void 0));
  });

  launcherModel.add("Remove Last", () => {
      list.pop().dispose();
  });

  app.commands.addCommand('jupyterlab-launcher:add-item', {
    label: 'Add Launcher Item',
    execute: () => {
        items.addItem(new LauncherItem("Add Random", () => {
          console.log("plus one");
        }));
    }

  });


  app.commands.addCommand('jupyterlab-launcher:show', {
    label: 'Show Launcher',
    execute: () => {
      if (!widget.isAttached) {
        app.shell.addToLeftArea(widget);
        // XXX: switch this out to be the LauncherWidget
      } else {
          app.shell.activateMain(widget.id);
      }
    }
  });

  palette.addItem({
    command: 'jupyterlab-launcher:show',
    category: 'Help'
  });

  app.shell.addToLeftArea(widget);
  app.shell.addToLeftArea(launcherWidget);
}


class LauncherItem {
    constructor(public name: string, public clickCallback: () => void) {
    }

}


class LauncherItems {
    constructor(public body: HTMLElement){
    }

    /**
     * Convenience method to add a launcher with a given name and callback
     *
     * This keeps plugins who wish to register themselves in the Launcher from
     * having to import both LauncherItems and LauncherItem.
     */
    add(name: string, clickCallback: () => void) : IDisposable {
        return this.addItem(new LauncherItem(name, clickCallback));
    }

    addItem(item : LauncherItem) : IDisposable {
        console.log('hello, adding ' + name);

        let column = document.createElement('div');
        column.className = 'jp-Launcher-column';

        let img = document.createElement('span');
        let imgName = item.name.replace(' ', '');
        img.className = `jp-Image${imgName} jp-Launcher-image`;

        column.appendChild(img);

        let text = document.createElement('span');
        text.textContent = item.name;
        text.className = 'jp-Launcher-text';
        column.appendChild(text);

        column.addEventListener('click', item.clickCallback);

        this.body.appendChild(column);


        return new DisposableDelegate(() => {
            // remove corresponding DOM element from the body
            this.body.removeChild(column);

        });
    }
}

class LauncherModel  extends VDomModel {
    items : LauncherItem[] = [];
    add(name: string, clickCallback: () => void) : IDisposable {

        let item = new LauncherItem(name, clickCallback);
        this.items.push(item);
        this.stateChanged.emit(void 0);

        return new DisposableDelegate(() => {
            // remove the item form the list of items
            console.log("dispose was called")
            var index = this.items.indexOf(item, 0);
            if (index > -1) {
                this.items.splice(index, 1);
                this.stateChanged.emit(void 0);
            }

        });


    }

}

class LauncherWidget extends VDomWidget<LauncherModel> {

    protected render(): VNode | VNode[] {
        let children : VNode[] = [];

        // grab data from the model
        for (let item of this.model.items) {

        let imgName = item.name.replace(' ', '');
        let img = h.span({className: `jp-Image${imgName} jp-Launcher-image`})

        let text = h.span({className: 'jp-Launcher-text' }, item.name)

        let column = h.div({
                className: 'jp-Launcher-column',
                'onclick': item.clickCallback
            }, [ img, text])

        children.push(column);

        }

        let path = h.span( { className: 'jp-Launcher-path' }, 'home');
        let folderImage = h.span( { className: 'jp-Launcher-folder' });
        let cwd = h.div( { className: 'jp-Launcher-cwd' }, [folderImage, path]);



        let body = h.div({ className: "jp-Launcher-body" }, children);



        return h.div({ className: 'jp-Launcher-dialog'}, [ cwd, body])


    }
//    public dispose(): void {
//
//    }

}
