// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IKernelSpecIds, IKernel
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
function selectKernel(host: HTMLElement, model: INotebookModel, specs: IKernelSpecIds): Promise<IKernel> {
  let selector = document.createElement('select');
  let options: HTMLOptionElement[] = [];
  for (let name in specs.kernelspecs) {
    let option = document.createElement('option');
    option.value = name;
    option.text = specs.kernelspecs[name].spec.display_name;
    options.push(option);
  }
  options.sort((a, b) => { return a.text.localeCompare(b.text); });
  for (let option of options) {
    selector.appendChild(option);
  }
  if (model.session) {
    selector.value = model.session.kernel.name;
  } else if (model.metadata && model.metadata.kernelspec) {
    selector.value = model.metadata.kernelspec.name;
  } else {
    selector.value = specs.kernelspecs[specs.default].spec.display_name;
  }
  return showDialog({
    title: 'Select Kernel',
    host,
    body: selector
  }).then(result => {
    if (result.text === 'OK') {
      if (model.session.kernel.name !== selector.value) {
        return model.session.changeKernel(selector.value);
      }
    }
    return model.session.kernel;
  });
}
