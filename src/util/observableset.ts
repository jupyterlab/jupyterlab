import { IterableOrArrayLike, each } from '@phosphor/algorithm';

import { IDisposable } from '@phosphor/disposable';

import { ISignal, Signal } from '@phosphor/signaling';

export interface IObservableSet<T> extends IDisposable {
    readonly changed: ISignal<this, IObservableSet.IChangedArgs<T>>;
    readonly size: number;

    clear(): void;
    add(value: T): boolean;
    delete(value: T): boolean;
    has(value: T): boolean;
    dispose(): void;
}

export namespace IObservableSet {
    export type ChangeType = 'add' | 'remove' | 'clear';

    export interface IChangedArgs<T> {
        type: ChangeType;
        value?: T;
    }
}

export class ObservableSet<T> implements IObservableSet<T> {
    constructor(opts: ObservableSet.IOptions<T> = {}) {
        if (opts.values) {
            each(opts.values, value => {
                this._set.add(value);
            });
        }
    }

    get changed(): ISignal<this, IObservableSet.IChangedArgs<T>> {
        return this._changed;
    }

    get isDisposed(): boolean {
        return this._isDisposed;
    }

    get size(): number {
        return this._set.size;
    }

    add(value: T): boolean {
        let result = this._set.has(value);

        this._set.add(value);
        this._changed.emit({
            type: 'add',
            value
        });

        return result;
    }

    delete(value: T): boolean {
        if (this._set.delete(value)) {
            this._changed.emit({
                type: 'remove',
                value
            });

            return true;
        } else {
            return false;
        }
    }

    clear() {
        this._set.clear();
        this._changed.emit({
            type: 'clear'
        });
    }

    has(value: T): boolean {
        return this._set.has(value);
    }

    dispose(): void {
        if (this.isDisposed) {
            return;
        }

        this._isDisposed = true;
        Signal.clearData(this);
        this._set.clear();
    }

    private _set: Set<T> = new Set();
    private _changed = new Signal<this, IObservableSet.IChangedArgs<T>>(this);
    private _isDisposed = false;
}

export namespace ObservableSet {
    export interface IOptions<T> {
        values?: IterableOrArrayLike<T>;
    }
}
