// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IKernelSpecId
} from 'jupyter-js-services';

import {
  showDialog
} from 'jupyter-js-ui/lib/dialog';

import {
  INotebookModel
} from './model';


/**
 * Present a dialog asking the user to select a kernel.
 */
export 
function selectKernel(host: HTMLElement, model: INotebookModel, specs: IKernelSpecId[]): Promise<void> {
  let selector = document.createElement('select');
  for (let spec of specs) {
    let option = document.createElement('option');
    option.value = spec.name;
    option.text = spec.spec.display_name;
  }
  return showDialog({
    title: 'Select Kernel',
    host,
    body: selector
  }).then(result => {
    if (result.text === 'OK') {
      return model.session.changeKernel(selector.value);
    }
  }).then(() => { return void 0; });
}
