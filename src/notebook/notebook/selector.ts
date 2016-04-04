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
  if (model.kernelspec.name !== 'unknown') {
    selector.value = model.kernelspec.name;
  } else {
    selector.value = specs.kernelspecs[specs.default].spec.display_name;
  }
  return showDialog({
    title: 'Select Kernel',
    host,
    body: selector
  }).then(result => {
    if (result.text === 'OK') {
      return model.session.changeKernel({ name: selector.value });
    }
    return model.session.kernel;
  });
}


/**
 * Get the appropriate kernel name given a notebook model.
 */
export
function findKernel(model: INotebookModel, specs: IKernelSpecIds): string {
  let name = model.kernelspec.name;
  if (name === 'unknown') {
    return specs.default;
  }
  // Look for an exact match.
  for (let kernelName in specs.kernelspecs) {
    if (kernelName === name) {
      return name;
    }
  }
  // Next try to match the language name.
  let language = model.languageInfo.name;
  if (language === 'unknown') {
    return specs.default;
  }
  for (let kernelName in specs.kernelspecs) {
    let kernelLanguage = specs.kernelspecs[name].spec.language;
    if (language === kernelLanguage) {
      console.log('No exact match found for ' + name +
                  ', using kernel ' + kernelName + ' that matches ' +
                  'language=' + language);
      return kernelName;
    }
  }
  // Finally, use the default kernel.
  console.log(`No matching kernel found for ${name}, ` +
              `using default kernel ${specs.default}`);
  return specs.default;
}
