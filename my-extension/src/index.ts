import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { Widget } from '@lumino/widgets';

const extension: JupyterFrontEndPlugin<void> = {
  id: 'my-extension',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('My Extension is activated!');
    const widget = new Widget();
    widget.node.textContent = 'Hello JupyterLab!';
    app.shell.add(widget, 'main');
  }
};

export default extension;