// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  IKernelId, IKernel, IKernelSpecIds, ISessionId, IContentsModel,
  IKernelLanguageInfo
} from 'jupyter-js-services';

import {
  MockKernel
} from 'jupyter-js-services/lib/mockkernel';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';

import {
  IDocumentContext, IDocumentModel
} from '../../../lib/docregistry';



/**
 * The default kernel spec ids.
 */
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


export
class MockContext implements IDocumentContext {

  constructor(model: IDocumentModel) {
    this._model = model;
  }

  get kernelChanged(): ISignal<MockContext, IKernel> {
    return Private.kernelChangedSignal.bind(this);
  }

  get pathChanged(): ISignal<MockContext, string> {
    return Private.pathChangedSignal.bind(this);
  }

  get dirtyCleared(): ISignal<MockContext, void> {
    return Private.dirtyClearedSignal.bind(this);
  }

  get id(): string {
    return '';
  }

  get model(): IDocumentModel {
    return this._model;
  }

  get kernel(): IKernel {
    return this._kernel;
  }

  get path(): string {
    return '';
  }

  get contentsModel(): IContentsModel {
    return void 0;
  }

  get kernelspecs(): IKernelSpecIds {
    return KERNELSPECS;
  }

  get isDisposed(): boolean {
    return this._model === null;
  }

  dispose(): void {
    this._model.dispose();
    this._model = null;
  }

  changeKernel(options: IKernelId): Promise<IKernel> {
    this._kernel = new MockKernel(options);
    if (options.name) {
      let name = options.name;
      if (!LANGUAGE_INFOS[name]) {
        name = KERNELSPECS['default'];
      }
      let kernel = this._kernel as MockKernel;
      kernel.setKernelSpec(KERNELSPECS.kernelspecs[name].spec);
      kernel.setKernelInfo({
        protocol_version: '1',
        implementation: 'foo',
        implementation_version: '1',
        language_info: LANGUAGE_INFOS[name],
        banner: 'Hello',
        help_links: {}
      });
    }

    this.kernelChanged.emit(this._kernel);
    return Promise.resolve(this._kernel);
  }

  save(): Promise<void> {
    return Promise.resolve(void 0);
  }

  saveAs(path: string): Promise<void> {
    return Promise.resolve(void 0);
  }

  revert(): Promise<void> {
    return Promise.resolve(void 0);
  }

  listSessions(): Promise<ISessionId[]> {
    return Promise.resolve([] as ISessionId[]);
  }

  addSibling(widget: Widget): IDisposable {
    return void 0;
  }

  private _model: IDocumentModel = null;
  private _kernel: IKernel = null;
}




/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * A signal emitted when the kernel changes.
   */
  export
  const kernelChangedSignal = new Signal<MockContext, IKernel>();

  /**
   * A signal emitted when the path changes.
   */
  export
  const pathChangedSignal = new Signal<MockContext, string>();

  /**
   * A signal emitted when the model is saved or reverted.
   */
  export
  const dirtyClearedSignal = new Signal<MockContext, void>();
}
