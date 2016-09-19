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


// want
//
// - LauncherItem
//   -()
//      - name
//      - imageName (can be standardize from name)
//      - className (can be standardize from name)
//      - eventListener - 1 (or more?) - 'click' but maybe also 'hover'?
//
// - widget container
//   -()
//     - an observable list of LauncherItems
//
//   - renders its children (adds them to the DOM)
//   - some API for adding (removing) children)
// - on activate, each plugin registers itself with the launcher
// - requires all extensions to depend on the Launcher if they want to register with it...
//   - what if I given person doesn't want the launcher...

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

  // new ObservableList<string>(
  let launcher = new Launcher(body);

  let list : IDisposable[] = [];
  let l = launcher.addItem('Notebook');
  list.push(l)
  l = launcher.addItem('Terminal');
  list.push(l)
  l = launcher.addItem('Terminal');
  list.push(l)
  l = launcher.addItem('Terminal');
  list.push(l)
  l = launcher.addItem('Terminal');
  list.push(l)
  l = launcher.addItem('Console');
  list.push(l)

  l = launcher.addItem('Add Terminal');
  list.push(l)


  l = launcher.addItem('Remove Terminal');
  list.push(l)

  launcher.render()

  applyClickCallbacks(launcher.body, 'jp-ImageNotebook jp-Launcher-image', () => { 
      app.commands.execute('file-operations:new-notebook', void 0);
  });

  applyClickCallbacks(launcher.body, 'jp-ImageConsole jp-Launcher-image', () => {
      app.commands.execute(`console:create-${services.kernelspecs.default}`, void 0);
  });

  applyClickCallbacks(launcher.body, 'jp-ImageTextEditor jp-Launcher-image', () => {
      app.commands.execute('file-operations:new-text-file', void 0);
  });
  
  applyClickCallbacks(launcher.body, 'jp-ImageTerminal jp-Launcher-image', () => {
      app.commands.execute('terminal:create-new', void 0);
  });

  applyClickCallbacks(launcher.body, 'jp-ImageRemoveTerminal jp-Launcher-image', () => { 
      console.log(list);
      console.log(list.length);
      list.pop().dispose();

      //launcher.render()
      // XXX: re-render here

  });
  applyClickCallbacks(launcher.body, 'jp-ImageAddTerminal jp-Launcher-image', () => { 
      l = launcher.addItem('Remove Terminal');
      list.push(l)
  });




  app.commands.addCommand('jupyterlab-launcher:add item', {
    label: 'Add Launcher Item',
    execute: () => {
        launcher.addItem("plusOne");
    }

  });


  app.commands.addCommand('jupyterlab-launcher:show', {
    label: 'Show Launcher',
    execute: () => {
      if (!widget.isAttached) {
        app.shell.addToLeftArea(widget);
      } else {
          app.shell.activateMain(widget.id);
        console.log("bye" + launcher.strList)
      }
    }
  });

  palette.addItem({
    command: 'jupyterlab-launcher:show',
    category: 'Help'
  });

  app.shell.addToLeftArea(widget);
}

function applyClickCallbacks(body: HTMLElement, className: string, callback: () => void) {
  let nodes = body.getElementsByClassName(className);

  for(let i = 0; i < nodes.length; i++) {
      nodes[i].addEventListener('click', callback);
  };
}

export interface ILauncherItem {

}

class Launcher {
    constructor(public body: HTMLElement){
    }
 
    public strList: string[] =  [];
    //public strList: string[] =  ['Notebook', 'Notebook2', 'Terminal', 'Text Editor', 'Notebook', 'Console', 'Terminal', 'Text Editor'];
    
    addItem(options: string): IDisposable {
        console.log('hello, adding ' + options);
        this.strList.push(options);
        return new DisposableDelegate(() => {
            console.log("removing " + options);
            // XXX: remove corresponding DOM element
            this.strList.splice(this.strList.indexOf(options), 1);
            console.log(this.strList);

            // XXX:re-render the component when this happens...
            //this.render()
        });
    }

    render() {

        // ['Notebook', 'Notebook2', 'Terminal', 'Text Editor', 'Notebook', 'Console', 'Terminal', 'Text Editor']
        // XXX: hack - remove all child nodes
        while (this.body.firstChild) {
            this.body.removeChild(this.body.firstChild);
        }

        console.log('render called')

        for (let name of this.strList) {
            let column = document.createElement('div');
            this.body.appendChild(column);
            column.className = 'jp-Launcher-column';

            let img = document.createElement('span');
            let imgName = name.replace(' ', '');
            img.className = `jp-Image${imgName} jp-Launcher-image`;

            column.appendChild(img);

            let text = document.createElement('span');
            text.textContent = name;
            text.className = 'jp-Launcher-text';
            column.appendChild(text);
        }


    }
}
