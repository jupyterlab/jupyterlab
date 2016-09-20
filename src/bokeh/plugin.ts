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
  // {
  //   "src": "http://10.10.20.36:8787/status/autoload.js?bokeh-autoload-element=6ffa889b-9900-4f86-badc-e474b3b26b09&bokeh-session-id=18e1885e-7f65-11e6-8ce9-a0999b178b7f",
  //   "id": "6ffa889b-9900-4f86-badc-e474b3b26b09",
  //   "data-bokeh-model-id": "f8c1490c-a1ef-4b85-a4a3-b1b3a50496f9",
  //   "data-bokeh-doc-id": "",
  //   "text": "Chart 1"
  // }


  // <script
  //     src="http://10.10.20.36:8787/status/autoload.js?bokeh-autoload-element=0938e7ff-da78-4769-bf7f-b31d99fd9683"
  //     id="0938e7ff-da78-4769-bf7f-b31d99fd9683"
  //     data-bokeh-model-id=""
  //     data-bokeh-doc-id=""
  // ></script>
  {
    src: "http://10.10.20.36:8787/status/autoload.js?bokeh-autoload-element=0938e7ff-da78-4769-bf7f-b31d99fd9683",
    id: "0938e7ff-da78-4769-bf7f-b31d99fd9683",
    text: "Status"
  },
  {
    src: "http://10.10.20.36:8787/tasks/autoload.js?bokeh-autoload-element=0938e7ff-da78-4769-bf7f-b31d99fd9684",
    id: "0938e7ff-da78-4769-bf7f-b31d99fd9684",
    text: "Tasks"
  },
  {
    src: "http://10.10.20.36:8787/workers/autoload.js?bokeh-autoload-element=0938e7ff-da78-4769-bf7f-b31d99fd9685",
    id: "0938e7ff-da78-4769-bf7f-b31d99fd9685",
    text: "Workers"
  }
  // },
  // {
  //   text: 'Numpy Reference',
  //   id: 'help-doc:numpy-reference',
  //   url: '//docs.scipy.org/doc/numpy/reference/'
  // },
  // {
  //   text: 'Scipy Reference',
  //   id: 'help-doc:scipy-reference',
  //   url: '//docs.scipy.org/doc/scipy/reference/'
  // },
  // {
  //   text: 'Notebook Tutorial',
  //   id: 'help-doc:notebook-tutorial',
  //   url: '//nbviewer.jupyter.org/github/jupyter/notebook/' +
  //     'blob/master/docs/source/examples/Notebook/Notebook Basics.ipynb'
  // },
  // {
  //   text: 'Python Reference',
  //   id: 'help-doc:python-reference',
  //   url: '//docs.python.org/3.5/'
  // },
  // {
  //   text: 'IPython Reference',
  //   id: 'help-doc:ipython-reference',
  //   url: '//ipython.org/documentation.html?v=20160707164940'
  // },
  // {
  //   text: 'Matplotlib Reference',
  //   id: 'help-doc:mathplotlib-reference',
  //   url: 'http://matplotlib.org/contents.html?v=20160707164940'
  // },
  // {
  //   text: 'SymPy Reference',
  //   id: 'help-doc:sympy-reference',
  //   url: 'http://docs.sympy.org/latest/index.html?v=20160707164940'
  // },
  // {
  //   text: 'Pandas Reference',
  //   id: 'help-doc:pandas-reference',
  //   url: 'http://pandas.pydata.org/pandas-docs/stable/?v=20160707164940'
  // },
  // {
  //   text: 'Markdown Reference',
  //   id: 'help-doc:markdown-reference',
  //   url: '//help.github.com/articles/getting-started-with-writing-and-formatting-on-github/'
  // }
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

  SCRIPTS.forEach(script => app.commands.addCommand(script.id, {
    label: script.text,
    execute: () => {
      let tag = document.createElement('script')
      tag.src = script.src
      tag.id = script.id
      tag.setAttribute('data-bokeh-model-id', "")
      tag.setAttribute('data-bokeh-doc-id', "")

      let widget = new Widget();
      widget.id = script.id
      widget.title.label="Bokeh"
      widget.title.closable = true

      let div_child = document.createElement('div')
      let div_parent = document.createElement('div')
      div_parent.classList.add("bk-root")
      div_child.appendChild(tag)
      div_parent.appendChild(div_child)

      widget.node.appendChild(div_parent)
      app.shell.addToMainArea(widget)
    }
  }))

  SCRIPTS.forEach(script => palette.addItem({
    command: script.id,
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
