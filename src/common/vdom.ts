// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  render, VNode
} from 'phosphor/lib/ui/vdom';


export
interface IVDomModel extends IDisposable {

  stateChanged: ISignal<IVDomModel, void>;

}


export class VDomModel implements IVDomModel {

  contructor() {}

  stateChanged: ISignal<IVDomModel, void>;

  dispose(): void {
    if (this.isDisposed) {
      return
    };
    this._isDisposed = true;
    clearSignalData(this);
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  _isDisposed = false;

}

defineSignal(VDomModel.prototype, 'stateChanged');


export
abstract class VDomWidget<T extends IVDomModel> extends Widget {

  constructor() {
    super();
  }

  modelChanged: ISignal<VDomWidget<T>, void>;


  set model(newValue: T) {
    if (!newValue && !this._model || newValue === this._model) {
      return;
    }

    if (this._model) {
      this._model.stateChanged.disconnect(this.update, this);
    }
    this._model = newValue;
    this._model.stateChanged.connect(this.update, this);
    this.update();
    this.modelChanged.emit(void 0);
  }


  get model(): T {
    return this._model;
  }

  protected onUpdateRequest(msg: Message): void {
    let vnode = this.render();
    render(vnode, this.node);
  }

  protected abstract render(): VNode | VNode[]


  get isDisposed(): boolean {
    return this._model === null;
  }


  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._model = null;
    super.dispose();
  }

  _model: T

}

defineSignal(VDomWidget.prototype, 'modelChanged');
