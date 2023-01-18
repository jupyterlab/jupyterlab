import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Notebook, NotebookActions } from '@jupyterlab/notebook';
import { Widget } from '@lumino/widgets';

/**
 * Initialization data for the jupyter_gai_dalle extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyter_gai_dalle:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyter_gai_dalle is activated!');

    // handle below-in-image insertion mode for notebooks
    app.commands.addCommand('gai:insert-below-in-image', {
      // context has type InsertionContext, but cannot be typed as the frontend
      // package is not yet published to NPM
      execute: (context: any) => {
        const notebook = context.widget as Widget;
        if (!(notebook instanceof Notebook)) {
          console.error('Editor widget is not of type "Notebook".');
          return false;
        }

        NotebookActions.insertBelow(notebook);
        NotebookActions.changeCellType(notebook, 'markdown');
        notebook.model?.cells
          .get(notebook.activeCellIndex)
          ?.sharedModel.setSource(`![](${context.response.output})`);
        NotebookActions.run(notebook);
      }
    });
  }
};

export default plugin;
