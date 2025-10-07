import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ITranslator } from '@jupyterlab/translation';
import { IDocumentManagerDialogs } from './tokens';
import { DocumentManagerDialogs } from './dialogs';

/**
 * The default document manager dialogs provider.
 */
const dialogsPlugin: JupyterFrontEndPlugin<IDocumentManagerDialogs> = {
  id: '@jupyterlab/docmanager-extension:dialogs',
  description: 'Provides default dialogs for document management operations.',
  autoStart: true,
  provides: IDocumentManagerDialogs,
  requires: [ITranslator],
  activate: (app: JupyterFrontEnd, translator: ITranslator) => {
    return new DocumentManagerDialogs({ translator });
  }
};

export default dialogsPlugin;
