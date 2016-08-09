// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IContents, IKernel, ISession
} from 'jupyter-js-services';

import {
  MockKernel, KERNELSPECS
} from 'jupyter-js-services/lib/mockkernel';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  IDocumentContext, IDocumentModel
} from '../../../lib/docregistry';


export
class MockContext<T extends IDocumentModel> implements IDocumentContext<T> {

  methods: string[] = [];

  constructor(model: T) {
    this._model = model;
  }

  kernelChanged: ISignal<IDocumentContext<IDocumentModel>, IKernel>;

  pathChanged: ISignal<IDocumentContext<IDocumentModel>, string>;

  contentsModelChanged: ISignal<IDocumentContext<T>, IContents.IModel>;

  populated: ISignal<IDocumentContext<IDocumentModel>, void>;

  get id(): string {
    return '';
  }

  get model(): T {
    return this._model;
  }

  get kernel(): IKernel {
    return this._kernel;
  }

  get path(): string {
    return this._path;
  }

  get contentsModel(): IContents.IModel {
    return void 0;
  }

  get kernelspecs(): IKernel.ISpecModels {
    return KERNELSPECS;
  }

  get isPopulated(): boolean {
    return true;
  }

  get isDisposed(): boolean {
    return this._model === null;
  }

  dispose(): void {
    this._model.dispose();
    this._model = null;
    this.methods.push('dispose');
  }

  changeKernel(options: IKernel.IModel): Promise<IKernel> {
    if (!options) {
      this._kernel = null;
    } else {
      this._kernel = new MockKernel(options);
    }
    this.kernelChanged.emit(this._kernel);
    this.methods.push('changeKernel');
    return Promise.resolve(this._kernel);
  }

  save(): Promise<void> {
    this.methods.push('save');
    return Promise.resolve(void 0);
  }

  saveAs(): Promise<void> {
    this._path = 'foo';
    this.pathChanged.emit(this._path);
    this.methods.push('saveAs');
    return Promise.resolve(void 0);
  }

  revert(): Promise<void> {
    this.methods.push('revert');
    return Promise.resolve(void 0);
  }

  createCheckpoint(): Promise<IContents.ICheckpointModel> {
    return Promise.resolve(void 0);
  }

  deleteCheckpoint(checkpointID: string): Promise<void> {
    return Promise.resolve(void 0);
  }

  restoreCheckpoint(checkpointID?: string): Promise<void> {
    return Promise.resolve(void 0);
  }

  listCheckpoints(): Promise<IContents.ICheckpointModel[]> {
    return Promise.resolve([]);
  }

  listSessions(): Promise<ISession.IModel[]> {
    this.methods.push('listSessions');
    return Promise.resolve([] as ISession.IModel[]);
  }

  resolveUrl(url: string): string {
    return url;
  }

  addSibling(widget: Widget): IDisposable {
    this.methods.push('addSibling');
    return void 0;
  }

  private _model: T = null;
  private _path = '';
  private _kernel: IKernel = null;
}


defineSignal(MockContext.prototype, 'kernelChanged');
defineSignal(MockContext.prototype, 'pathChanged');
defineSignal(MockContext.prototype, 'contentsModelChanged');
defineSignal(MockContext.prototype, 'populated');
