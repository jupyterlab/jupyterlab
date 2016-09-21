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
  let items = new LauncherItems(body);

  let list : IDisposable[] = [];

  let l = items.addItem('Notebook', () => { 
      app.commands.execute('file-operations:new-notebook', void 0);
  });
  l = items.addItem('Terminal', () => app.commands.execute('terminal:create-new', void 0));

  let names = [
      'Terminal',
      'Notebook',
      'Text Editor',
      'Console',
      ''
  ]
  let actions = [
      'terminal:create-new',
      'file-operations:new-notebook',
      'file-operations:new-text-file',
      ''
  ]
  
  items.addItem("Add Random", () => {
  

      let index = Math.floor(Math.random() * actions.length);
      console.log("adding random" + index); 
      let itemName = names[index];
      let action = actions[index];

      l = items.addItem(itemName, () => app.commands.execute(action, void 0));
      
      console.log("added item ")
                       
      list.push(l)
  });


  l = items.addItem('Text Editor', () => { 
      app.commands.execute('file-operations:new-text-file', void 0);
  });

  // list.push(l)


  // l = items.addItem('Terminal');
  // list.push(l)
  // l = items.addItem('Terminal');
  // list.push(l)
  // l = items.addItem('Terminal');
  // list.push(l)
  // l = items.addItem('Terminal');
  // list.push(l)
  // l = items.addItem('Console');
  // list.push(l)

  // l = items.addItem('Add Terminal');
  // list.push(l)


  // l = items.addItem('Remove Terminal');
  // list.push(l)

  items.render()
  //  
  //    applyClickCallbacks(launcher.body, 'jp-ImageNotebook jp-Launcher-image', () => { 
  //        app.commands.execute('file-operations:new-notebook', void 0);
  //    });
  //  
  //    applyClickCallbacks(launcher.body, 'jp-ImageConsole jp-Launcher-image', () => {
  //        app.commands.execute(`console:create-${services.kernelspecs.default}`, void 0);
  //    });
  //  
  //    applyClickCallbacks(launcher.body, 'jp-ImageTextEditor jp-Launcher-image', () => {
  //        app.commands.execute('file-operations:new-text-file', void 0);
  //    });
  //    
  //    applyClickCallbacks(launcher.body, 'jp-ImageTerminal jp-Launcher-image', () => {
  //        app.commands.execute('terminal:create-new', void 0);
  //    });
  //  
  //    applyClickCallbacks(launcher.body, 'jp-ImageRemoveTerminal jp-Launcher-image', () => { 
  //        console.log(list);
  //        console.log(list.length);
  //        list.pop().dispose();
  //  
  //        //launcher.render()
  //        // XXX: re-render here
  //  
  //    });
  //    applyClickCallbacks(launcher.body, 'jp-ImageAddTerminal jp-Launcher-image', () => { 
  //        l = launcher.addItem('Remove Terminal', () => { console.log("hello"); });
  //        list.push(l)
  //    });




  app.commands.addCommand('jupyterlab-launcher:add-item', {
    label: 'Add Launcher Item',
    execute: () => {
        items.addItem("Add Random", () => {
          console.log("plus one");
        });
    }

  });


  app.commands.addCommand('jupyterlab-launcher:show', {
    label: 'Show Launcher',
    execute: () => {
      if (!widget.isAttached) {
        app.shell.addToLeftArea(widget);
      } else {
          app.shell.activateMain(widget.id);
        console.log("bye" + items.strList)
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

class LauncherItems {
    constructor(public body: HTMLElement){
    }
 
    public strList: string[] =  [];
    
    addItem(name: string, clickCallback: () => void): IDisposable {
        console.log('hello, adding ' + name);
        this.strList.push(name);
        

        let column = document.createElement('div');
        column.className = 'jp-Launcher-column';

        let img = document.createElement('span');
        let imgName = name.replace(' ', '');
        img.className = `jp-Image${imgName} jp-Launcher-image`;

        column.appendChild(img);

        let text = document.createElement('span');
        text.textContent = name;
        text.className = 'jp-Launcher-text';
        column.appendChild(text);

        column.addEventListener('click', clickCallback);

        this.body.appendChild(column);
      

        return new DisposableDelegate(() => {
            console.log("removing " + name);
            // XXX: remove corresponding DOM element
            this.strList.splice(this.strList.indexOf(name), 1);
            console.log(this.strList);

            this.body.removeChild(column);

        });
    }

    render() {

        // ['Notebook', 'Notebook2', 'Terminal', 'Text Editor', 'Notebook', 'Console', 'Terminal', 'Text Editor']
        // XXX: hack - remove all child nodes

        console.log('render called')


    }
}
