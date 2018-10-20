import { ISignal, Signal, Slot } from '@phosphor/signaling';
import { IDisposable } from '@phosphor/disposable';

export namespace SignalExt {
  export class CombinedSignal<T, U> extends Signal<T, U>
    implements IDisposable {
    constructor(sender: T, ...parents: Array<ISignal<any, U>>) {
      super(sender);

      this._parents = parents;

      this._forwardFunc = (_aSender: any, value: U) => {
        this.emit(value);
      };
      this._parents.forEach(child => child.connect(this._forwardFunc));
    }

    get isDisposed() {
      return this._isDisposed;
    }

    dispose() {
      if (this.isDisposed) {
        return;
      }

      this._parents.forEach(child => child.disconnect(this._forwardFunc));
      this._isDisposed = true;
    }

    private _forwardFunc: Slot<any, U>;
    private _isDisposed = false;
    private _parents: Array<ISignal<any, U>>;
  }
}
