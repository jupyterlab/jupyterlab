/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import {
  IConverterRegistry,
  snippetViewerConverter,
  fileSnippetConverter,
  URLSnippetConverter
} from '@jupyterlab/databus';
import { INotebookTracker } from '@jupyterlab/notebook';

export default {
  activate,
  id: '@jupyterlab/databus-extension:snippets',
  requires: [IConverterRegistry, INotebookTracker],
  autoStart: true
} as JupyterLabPlugin<void>;

function activate(
  app: JupyterLab,
  converters: IConverterRegistry,
  notebookTracker: INotebookTracker
) {
  converters.register(
    snippetViewerConverter(async (snippet: string) => {
      notebookTracker.activeCell.model.value.insert(0, snippet);
    })
  );
  converters.register(
    fileSnippetConverter({
      mimeType: 'text/csv',
      label: 'Snippet',
      createSnippet: (path: string) =>
        `import pandas as pd\n\ndf = pd.read_csv(${JSON.stringify(
          '.' + path
        )})\ndf`
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
