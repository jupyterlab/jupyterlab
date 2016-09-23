import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  DistributedUIElement
} from './index'

const URL = '10.10.20.40'
const PORT = '8787'

const SCRIPTS = [
  {
    src: `http://${URL}:${PORT}/status/autoload.js?bokeh-autoload-element=0938e7ff-da78-4769-bf7f-b31d99fd9680`,
    bokeh_id: "0938e7ff-da78-4769-bf7f-b31d99fd9680",
    id: "distributed-ui:bk-resource-profile-plot",
    text: "Resource Profile",
    "data-bokeh-model-id": "bk-resource-profile-plot",
    "data-bokeh-doc-id": ""
  },
  {
    src: `http://${URL}:${PORT}/status/autoload.js?bokeh-autoload-element=0938e7ff-da78-4769-bf7f-b31d99fd9681`,
    bokeh_id: "0938e7ff-da78-4769-bf7f-b31d99fd9681",
    id: "distributed-ui:bk-network-profile-plot",
    text: "Network Profile",
    'data-bokeh-model-id': "bk-network-profile-plot",
    'data-bokeh-doc-id': ""
  },
  {
    src: `http://${URL}:${PORT}/status/autoload.js?bokeh-autoload-element=0938e7ff-da78-4769-bf7f-b31d99fd9682`,
    bokeh_id: "0938e7ff-da78-4769-bf7f-b31d99fd9682",
    id: "distributed-ui:bk-nbytes-plot",
    text: "Memory Use",
    'data-bokeh-model-id': "bk-nbytes-plot",
    'data-bokeh-doc-id': ""
  },
  {
    src: `http://${URL}:${PORT}/status/autoload.js?bokeh-autoload-element=0938e7ff-da78-4769-bf7f-b31d99fd9683`,
    bokeh_id: "0938e7ff-da78-4769-bf7f-b31d99fd9683",
    id: "distributed-ui:bk-task-stream-plot",
    text: "Task Stream",
    'data-bokeh-model-id': "bk-task-stream-plot",
    'data-bokeh-doc-id': ""
  },
  {
    src: `http://${URL}:${PORT}/status/autoload.js?bokeh-autoload-element=0938e7ff-da78-4769-bf7f-b31d99fd9684`,
    bokeh_id: "0938e7ff-da78-4769-bf7f-b31d99fd9684",
    id: "distributed-ui:bk-progress-plot",
    text: "Progress Stream",
    'data-bokeh-model-id': "bk-progress-plot",
    'data-bokeh-doc-id': ""
  },
  {
    src: `http://${URL}:${PORT}/workers/autoload.js?bokeh-autoload-element=0938e7ff-da78-4769-bf7f-b31d99fd9685`,
    bokeh_id: "0938e7ff-da78-4769-bf7f-b31d99fd9685",
    id: "distributed-ui:bk-processing-plot",
    text: "Processing and Pending",
    'data-bokeh-model-id': "bk-processing-plot",
    'data-bokeh-doc-id': ""
  },
  {
    src: `http://${URL}:${PORT}/workers/autoload.js?bokeh-autoload-element=0938e7ff-da78-4769-bf7f-b31d99fd9686`,
    bokeh_id: "0938e7ff-da78-4769-bf7f-b31d99fd9686",
    id: "distributed-ui:bk-memory-usage-plot",
    text: "Worker Memory",
    'data-bokeh-model-id': "bk-memory-usage-plot",
    'data-bokeh-doc-id': ""
  },
  {
    src: `http://${URL}:${PORT}/workers/autoload.js?bokeh-autoload-element=0938e7ff-da78-4769-bf7f-b31d99fd9687`,
    bokeh_id: "0938e7ff-da78-4769-bf7f-b31d99fd9687",
    id: "distributed-ui:bk-worker-table",
    text: "Workers Table",
    'data-bokeh-model-id': "bk-worker-table",
    'data-bokeh-doc-id': ""
  }
];

/**
 * A namespace for help plugin private functions.
 */
export
const distributedUILab: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.distributed-ui-lab',
  requires: [ICommandPalette],
  activate: activateDistributedUILab,
  autoStart: true
}

/**
 * Activate the bokeh application extension.
 */
function activateDistributedUILab(app: JupyterLab, palette: ICommandPalette): void {

  let elements: Array<DistributedUIElement> = [];

  for (let script of SCRIPTS) {
    elements.push(new DistributedUIElement(script))
  }

  // Register commands for each DistributedUIElement
  elements.forEach(element => app.commands.addCommand(element.id, {
    label: element.title.label,
    execute: () => {
      app.shell.addToMainArea(element)
    }
  }))

  // Add a palette element for each DistributedUIElement command
  elements.forEach(element => palette.addItem({
    command: element.id,
    category: "Dask Distributed UI"
  }))
}


/**
 * A namespace for help plugin private functions.
 */
namespace Private {
}
