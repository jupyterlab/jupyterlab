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

const SCRIPTS = [
  {
    src: "http://10.10.20.37:8787/status/autoload.js?bokeh-autoload-element=0938e7ff-da78-4769-bf7f-b31d99fd9680",
    id: "0938e7ff-da78-4769-bf7f-b31d99fd9680",
    widget_id: "distributed-ui:bk-resource-profile-plot",
    text: "Resource Profile",
    "data-bokeh-model-id": "bk-resource-profile-plot",
    "data-bokeh-doc-id": ""
  },
  {
    src: "http://10.10.20.37:8787/status/autoload.js?bokeh-autoload-element=0938e7ff-da78-4769-bf7f-b31d99fd9681",
    id: "0938e7ff-da78-4769-bf7f-b31d99fd9681",
    widget_id: "distributed-ui:bk-network-profile-plot",
    text: "Network Profile",
    'data-bokeh-model-id': "bk-network-profile-plot",
    'data-bokeh-doc-id': ""
  },
  {
    src: "http://10.10.20.37:8787/status/autoload.js?bokeh-autoload-element=0938e7ff-da78-4769-bf7f-b31d99fd9682",
    id: "0938e7ff-da78-4769-bf7f-b31d99fd9682",
    widget_id: "distributed-ui:bk-nbytes-plot",
    text: "Memory Use",
    'data-bokeh-model-id': "bk-nbytes-plot",
    'data-bokeh-doc-id': ""
  },
  {
    src: "http://10.10.20.37:8787/status/autoload.js?bokeh-autoload-element=0938e7ff-da78-4769-bf7f-b31d99fd9683",
    id: "0938e7ff-da78-4769-bf7f-b31d99fd9683",
    widget_id: "distributed-ui:bk-task-stream-plot",
    text: "Task Stream",
    'data-bokeh-model-id': "bk-task-stream-plot",
    'data-bokeh-doc-id': ""
  },
  {
    src: "http://10.10.20.37:8787/status/autoload.js?bokeh-autoload-element=0938e7ff-da78-4769-bf7f-b31d99fd9684",
    id: "0938e7ff-da78-4769-bf7f-b31d99fd9684",
    widget_id: "distributed-ui:bk-progress-plot",
    text: "Progress Stream",
    'data-bokeh-model-id': "bk-progress-plot",
    'data-bokeh-doc-id': ""
  },
  {
    src: "http://10.10.20.37:8787/workers/autoload.js?bokeh-autoload-element=0938e7ff-da78-4769-bf7f-b31d99fd9685",
    id: "0938e7ff-da78-4769-bf7f-b31d99fd9685",
    widget_id: "distributed-ui:bk-processing-plot",
    text: "Processing and Pending",
    'data-bokeh-model-id': "bk-processing-plot",
    'data-bokeh-doc-id': ""
  },
  {
    src: "http://10.10.20.37:8787/workers/autoload.js?bokeh-autoload-element=0938e7ff-da78-4769-bf7f-b31d99fd9686",
    id: "0938e7ff-da78-4769-bf7f-b31d99fd9686",
    widget_id: "distributed-ui:bk-memory-usage-plot",
    text: "Worker Memory",
    'data-bokeh-model-id': "bk-memory-usage-plot",
    'data-bokeh-doc-id': ""
  },
  {
    src: "http://10.10.20.37:8787/workers/autoload.js?bokeh-autoload-element=0938e7ff-da78-4769-bf7f-b31d99fd9687",
    id: "0938e7ff-da78-4769-bf7f-b31d99fd9687",
    widget_id: "distributed-ui:bk-worker-table",
    text: "Workers Table",
    'data-bokeh-model-id': "bk-worker-table",
    'data-bokeh-doc-id': ""
  }
];


/**
 * Activate the bokeh application extension.
 */
function activateBokehApplication(app: JupyterLab, palette: ICommandPalette, mainMenu: IMainMenu): void {

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

  // let openBokehApplicationId = 'bk-application:open';
  //
  // app.commands.addCommand(openBokehApplicationId, {
  //   label: 'Open Bokeh Application',
  //   execute: () => {

  SCRIPTS.forEach(script => app.commands.addCommand(script.widget_id, {
    label: script.text,
    execute: () => {
      let tag = document.createElement('script')
      tag.src = script.src
      tag.id = script.id
      tag.setAttribute('data-bokeh-model-id', script['data-bokeh-model-id'])
      tag.setAttribute('data-bokeh-doc-id', script['data-bokeh-doc-id'])

      // wrap bokeh elements in div to apply css selector
      let div = document.createElement('div')
      div.classList.add('bk-root')
      div.appendChild(tag)

      let widget = new Widget();
      widget.id = script.widget_id
      widget.title.label = script.text
      widget.title.closable = true

      widget.node.appendChild(div)
      app.shell.addToMainArea(widget)
    }
  }))

  SCRIPTS.forEach(script => palette.addItem({
    command: script.widget_id,
    category: "Bokeh"
  }))

  // SCRIPTS.forEach(script => function(script: Object) {
  //   let menu = Private.createMenu(app)
  //   mainMenu.addMenu
  // })
      // let tag = document.createElement('script')
      // tag.src = "http://localhost:5006/sliders/autoload.js?bokeh-autoload-element=c50377bb-485f-439b-8f15-028ab8c25387"
      // tag.id = "c50377bb-485f-439b-8f15-028ab8c25387"
      // tag.setAttribute('data-bokeh-model-id', '')
      // tag.setAttribute('data-bokeh-doc-id', '')
      //
      // let widget = new Widget();
      // widget.id = openBokehApplicationId
      // widget.title.label = 'Bokeh';
      // widget.title.closable = true;
      //
      // widget.node.appendChild(tag);
      //
      // if (!widget.isAttached) {
      //   app.shell.addToMainArea(widget);
      // } else {
      //   app.shell.activateMain(widget.id);
      // }
  //   }
  // });

  // palette.addItem({ command: openBokehApplicationId, category: 'Bokeh'});

  // let menu = Private.createMenu(app);
  // mainMenu.addMenu(menu, {});

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
