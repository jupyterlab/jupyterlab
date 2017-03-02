// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  JSONValue, JSONObject
} from '@phosphor/coreutils';

import {
  ObservableMap
} from './observablemap';

export
interface IObservable {
  readonly type: string;

  readonly changed: ISignal<IObservable, IObservableChangedArgs>;
}

export
interface IObservableChangedArgs {
}

export
interface IObservableValue extends IObservable{

  type: 'value';

  readonly changed: ISignal<IObservableValue, IObservableValueChangedArgs> 

  get(): JSONValue;

  set(value: JSONValue): void;
}

export
interface IObservableValueChangedArgs extends IObservableChangedArgs {
  oldValue: JSONValue;

  newValue: JSONValue;
}

export
interface IModelDB {
  changed: ISignal<IModelDB, IModelDBChangedArgs>

  get(path: string): IObservable;

  set(path: string, value: IObservable): void;
}

export
interface IModelDBChangedArgs {
  path: string;

  oldValue: IObservable;

  newValue: IObservable;
}

export
class ObservableValue implements IObservableValue {
  constructor(initialValue: JSONValue) {
    this._value = initialValue;
  }

  readonly type: 'value';

  get changed(): ISignal<this, IObservableValueChangedArgs> {
    return this._changed;
  }

  get(): JSONValue {
    return this._value;
  }

  set(value: JSONValue): void {
    let oldValue = this._value;
    this._value = value;
    this._changed.emit({
      oldValue: oldValue,
      newValue: value
    });
  }

  private _value: JSONValue = null;
  private _changed = new Signal<ObservableValue, IObservableValueChangedArgs>(this);
}

export
class ModelDB implements IModelDB {
  constructor() {
    this._db.changed.connect((db, args)=>{
      this._changed.emit({
        path: args.key,
        newValue: args.newValue,
        oldValue: args.oldValue
      });
    });
  }
  get changed(): ISignal<this, IModelDBChangedArgs> {
    return this._changed;
  }

  get(path: string): IObservable {
    return this._db.get(path);
  }

  set(path: string, value: IObservable): void {
    this._db.set(path, value);
  }

  private _changed = new Signal<this, IModelDBChangedArgs>(this);
  private _db = new ObservableMap<IObservable>();
}
