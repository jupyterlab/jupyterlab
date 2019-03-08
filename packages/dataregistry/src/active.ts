import { Token } from '@phosphor/coreutils';
import { ISignal, Signal } from '@phosphor/signaling';

export class ActiveDataset {
  constructor() {
    this._signal = new Signal(this);
  }
  get signal(): ISignal<ActiveDataset, URL | null> {
    return this._signal;
  }
  get active(): URL | null {
    return this._active;
  }

  set active(newURL: URL | null) {
    console.log('Setting active', newURL);
    this._active = newURL;
    this._signal.emit(newURL);
  }

  private _active: URL | null = null;
  private _signal: Signal<ActiveDataset, URL | null>;
}

export interface IActiveDataset extends ActiveDataset {}
export const IActiveDataset = new Token<IActiveDataset>(
  '@jupyterlab/dataregistry:IActiveDataset'
);
