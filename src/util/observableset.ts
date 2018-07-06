import { IterableOrArrayLike, each } from '@phosphor/algorithm';

import { IDisposable } from '@phosphor/disposable';

import { ISignal, Signal } from '@phosphor/signaling';

import { SetExt } from './set';

export interface IObservableSet<T> extends IDisposable {
    readonly changed: ISignal<this, IObservableSet.IChangedArgs<T>>;
    readonly size: number;

    clear(): void;
    add(value: T): void;
    addAll(values: Array<T>): void;
    delete(value: T): boolean;
    deleteAll(values: Array<T>): void;
    has(value: T): void;
    dispose(): void;
}

export namespace IObservableSet {
    export type ChangeType = 'add' | 'remove';

    export interface IChangedArgs<T> {
        type: ChangeType;
        values: ArrayLike<T>;
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

    add(value: T): void {
        this._set.add(value);
        this._changed.emit({
            type: 'add',
            values: [value]
        });
    }

    addAll(values: Array<T>): void {
        let newValues = SetExt.difference(new Set(values), this._set);

        if (newValues.size > 0) {
            newValues.forEach(element => {
                this._set.add(element);
            });

            this._changed.emit({
                type: 'add',
                values: new Array(...newValues)
            });
        }
    }

    delete(value: T): boolean {
        if (this._set.delete(value)) {
            this._changed.emit({
                type: 'remove',
                values: [value]
            });

            return true;
        } else {
            return false;
        }
    }

    deleteAll(values: Array<T>): void {
        let toRemoveValues = SetExt.intersection(this._set, new Set(values));

        if (toRemoveValues.size > 0) {
            toRemoveValues.forEach(element => {
                this._set.delete(element);
            });

            this._changed.emit({
                type: 'remove',
                values: new Array(...toRemoveValues)
            });
        }
    }

    clear() {
        let values = new Array(...this._set);
        this._set.clear();
        this._changed.emit({
            type: 'remove',
            values
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
