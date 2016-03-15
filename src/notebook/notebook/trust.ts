/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2016, Jupyter Development Team.
|
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
'use strict';

import {
  showDialog
} from 'jupyter-js-ui/lib/dialog';

import {
  INotebookModel
} from './model';


// The message to display to the user when prompting to trust the notebook.
const TRUST_MESSAGE = '<p>A trusted Jupyter notebook may execute hidden malicious code when you open it.<br>Selecting trust will immediately reload this notebook in a trusted state.<br>For more information, see the <a href="http://ipython.org/ipython-doc/2/notebook/security.html">Jupyter security documentation</a>.</p>'


/**
 * Trust the notebook after prompting the user.
 */
export 
function trustNotebook(host: HTMLElement, model: INotebookModel): Promise<void> {
  // Do nothing if already trusted.
  let cells = model.cells;
  let trusted = true;
  for (let i = 0; i < cells.length; i++) {
    if (!cells.get(i).trusted) {
      trusted = false;
    }
  }
  if (trusted) {
    return Promise.resolve(void 0);
  }
  return showDialog({
    host,
    body: TRUST_MESSAGE,
    title: 'Trust this notebook?'
  }).then(result => {
    if (result.text === 'OK') {
      let cells = model.cells;
      for (let i = 0; i < cells.length; i++) {
        cells.get(i).trusted = true;
      }
    }
  });
}
