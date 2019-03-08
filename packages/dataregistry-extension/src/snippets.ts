/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  IConverterRegistry,
  snippetViewerConverter,
  fileSnippetConverter,
  URLSnippetConverter
} from '@jupyterlab/dataregistry';
import { INotebookTracker } from '@jupyterlab/notebook';

export default {
  activate,
  id: '@jupyterlab/dataregistry-extension:snippets',
  requires: [IConverterRegistry, INotebookTracker],
  autoStart: true
} as JupyterFrontEndPlugin<void>;

function activate(
  app: JupyterFrontEnd,
  converters: IConverterRegistry,
  notebookTracker: INotebookTracker
) {
  converters.register(
    snippetViewerConverter(
      async (snippet: string) => {
        notebookTracker.activeCell.model.value.insert(0, snippet);
      },
      async () => ({
        path: notebookTracker.currentWidget!.context.path
      })
    )
  );
  converters.register(
    fileSnippetConverter({
      mimeType: 'text/csv',
      label: 'Snippet',
      createSnippet: path =>
        `import pandas as pd\n\ndf = pd.read_csv(${JSON.stringify(path)})\ndf`
    })
  );
  converters.register(
    URLSnippetConverter({
      mimeType: 'text/csv',
      label: 'Snippet',
      createSnippet: (url: string | URL) =>
        `import pandas as pd\n\ndf = pd.read_csv(${JSON.stringify(
          url.toString()
        )})\ndf`
    })
  );
}
