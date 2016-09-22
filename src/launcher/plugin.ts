// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from 'phosphor/lib/ui/widget';

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

  let l = items.addItem(
      new LauncherItem('Notebook', () => { 
      app.commands.execute('file-operations:new-notebook', void 0);
  }));
  list.push(l);
  l = items.addItem(new LauncherItem('Terminal', () => app.commands.execute('terminal:create-new', void 0)));
  list.push(l);

  let names = [
      'Terminal',
      'Notebook',
      'Text Editor',
      'Console',
  ]
  let actions = [
      'terminal:create-new',
      'file-operations:new-notebook',
      'file-operations:new-text-file',
      ''
  ]
  
  items.addItem(new LauncherItem("Add Random", () => {
  

      let index = Math.floor(Math.random() * actions.length);
      console.log("adding random" + index); 
      let itemName = names[index];
      let action = actions[index];

      l = items.addItem(new LauncherItem(itemName, () => app.commands.execute(action, void 0)));
      
      console.log("added item ")
                       
      list.push(l)
  }));

  items.addItem(new LauncherItem("Remove Last", () => {
      list.pop().dispose();
      console.log("Removing last")
  
  }));


  l = items.addItem(new LauncherItem('Text Editor', () => { 
      app.commands.execute('file-operations:new-text-file', void 0);
  }));
  list.push(l);


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
