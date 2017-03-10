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
interface IObservableValue extends IObservable {

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
  changed: ISignal<IModelDB, ModelDB.IChangedArgs>

  readonly basePath: string;

  get(path: string): IObservable;

  set(path: string, value: IObservable): void;

  view(basePath: string): IModelDB;
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
  constructor(options: ModelDB.ICreateOptions = {}) {
    this._basePath = options.basePath || '';
    if(options.baseDB) {
      this._baseDB = options.baseDB;
      this._baseDB.changed.connect((db, args)=>{
        this._changed.emit({
          path: args.path
        });
      })
    } else {
      this._db = new ObservableMap<IObservable>();
      this._db.changed.connect((db, args)=>{
        this._changed.emit({
          path: args.key,
        });
      });
    }
  }

  get basePath(): string {
    return this._basePath;
  }

  get changed(): ISignal<this, ModelDB.IChangedArgs> {
    return this._changed;
  }

  get(path: string): IObservable {
    if(this._baseDB) {
      return this._baseDB.get(this._basePath+'/'+path);
    } else {
      return this._db.get(this._basePath+'/'+path);
    }
  }

  set(path: string, value: IObservable): void {
    if(this._baseDB) {
      this._baseDB.set(this._basePath+'/'+path, value);
    } else {
      this._db.set(this._basePath+'/'+path, value);
    }
  }

  view(basePath: string): ModelDB {
    return new ModelDB({basePath, baseDB: this});
  }

  private _changed = new Signal<this, ModelDB.IChangedArgs>(this);
  private _db: ObservableMap<IObservable>;
  private _basePath: string;
  private _baseDB: IModelDB = null;
}

export
namespace ModelDB {
  export
  interface IChangedArgs {
    path: string;
  }

  export
  interface ICreateOptions {
    basePath?: string;
    baseDB?: IModelDB;
  }
}
