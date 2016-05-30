// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IKernelSpecIds
} from 'jupyter-js-services';

import {
  showDialog
} from 'jupyter-js-ui/lib/dialog';


/**
 * Present a dialog asking the user to select a kernel.
 */
export
function selectKernel(host: HTMLElement, kernelName: string, specs: IKernelSpecIds): Promise<string> {
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
  if (kernelName !== 'unknown') {
    selector.value = kernelName;
  } else {
    selector.value = specs.kernelspecs[specs.default].spec.display_name;
  }
  return showDialog({
    title: 'Select Kernel',
    host,
    body: selector
  }).then(result => {
    if (result.text === 'OK') {
      return selector.value;
    }
    return null;
  });
}


/**
 * Get the appropriate kernel name given a notebook model.
 */
export
function findKernel(kernelName: string, language: string, specs: IKernelSpecIds): string {
  if (kernelName === 'unknown') {
    return specs.default;
  }
  // Look for an exact match.
  for (let specName in specs.kernelspecs) {
    if (specName === kernelName) {
      return kernelName;
    }
  }
  // Next try to match the language name.
  if (language === 'unknown') {
    return specs.default;
  }
  for (let specName in specs.kernelspecs) {
    let kernelLanguage = specs.kernelspecs[name].spec.language;
    if (language === kernelLanguage) {
      console.log('No exact match found for ' + name +
                  ', using kernel ' + specName + ' that matches ' +
                  'language=' + language);
      return specName;
    }
  }
  // Finally, use the default kernel.
  console.log(`No matching kernel found for ${kernelName}, ` +
              `using default kernel ${specs.default}`);
  return specs.default;
}
