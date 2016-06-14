// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  IKernelId, IKernel, IKernelSpecIds, ISessionId, IContentsModel
} from 'jupyter-js-services';

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
} from '../../../lib/docmanager';



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
    return null;
  }

  get path(): string {
    return '';
  }

  get contentsModel(): IContentsModel {
    return void 0;
  }

  get kernelspecs(): IKernelSpecIds {
    return void 0;
  }

  get isDisposed(): boolean {
    return this._model === null;
  }

  dispose(): void {
    this._model.dispose();
    this._model = null;
  }

  changeKernel(options: IKernelId): Promise<IKernel> {
    return Promise.resolve(void 0);
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
