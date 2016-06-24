// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernelSpecIds, IKernelLanguageInfo, IKernelInfo
} from 'jupyter-js-services';

import {
  simulate
} from 'simulate-event';


/**
 * The default kernel spec ids.
 */
export
const KERNELSPECS: IKernelSpecIds = {
  default: 'python',
  kernelspecs: {
    python: {
      name: 'python',
      spec: {
        language: 'python',
        argv: [],
        display_name: 'Python',
        env: {}
      },
      resources: {}
    },
    shell: {
      name: 'shell',
      spec: {
        language: 'shell',
        argv: [],
        display_name: 'Shell',
        env: {}
      },
      resources: {}
    }
  }
};

/**
 * The default language infos.
 */
export
function getKernelInfo(name: string): IKernelInfo {
  return {
    protocol_version: '1',
    implementation: 'foo',
    implementation_version: '1',
    language_info: LANGUAGE_INFOS[name],
    banner: 'Hello',
    help_links: {}
  };
}


const LANGUAGE_INFOS: { [key: string]: IKernelLanguageInfo } = {
  python: {
    name: 'python',
    version: '1',
    mimetype: 'text/x-python',
    file_extension: '.py',
    pygments_lexer: 'python',
    codemirror_mode: 'python',
    nbconverter_exporter: ''
  },
  shell: {
    name: 'shell',
    version: '1',
    mimetype: 'text/x-sh',
    file_extension: '.sh',
    pygments_lexer: 'shell',
    codemirror_mode: 'shell',
    nbconverter_exporter: ''
  }
};


/**
 * Wait for a dialog to be attached to an element.
 */
export
function waitForDialog(host: HTMLElement = document.body): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let refresh = () => {
      let node = host.getElementsByClassName('jp-Dialog')[0];
      if (node) {
        resolve(void 0);
        return;
      }
      setTimeout(refresh, 10);
    };
    refresh();
  });
}


/**
 * Accept a dialog after it is attached if it has an OK button.
 */
export
function acceptDialog(host: HTMLElement = document.body): Promise<void> {
  return waitForDialog(host).then(() => {
    let node = host.getElementsByClassName('jp-Dialog-okButton')[0];
    if (node) {
      (node as HTMLElement).click();
    }
  });
}


/**
 * Dismiss a dialog after it is attached.
 */
export
function dismissDialog(host: HTMLElement = document.body): Promise<void> {
  return waitForDialog(host).then(() => {
    let node = host.getElementsByClassName('jp-Dialog')[0];
    if (node) {
      simulate(node as HTMLElement, 'keydown', { keyCode: 27 });
    }
  });
}
