// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Signal, ISignal } from '@phosphor/signaling';

import { IVariable } from './variable';

export interface IVariablesModel {
  current: IVariable;
  filter: string;
  variables: IVariable[];
  currentChanged: ISignal<Model, IVariable>;
  variablesChanged: ISignal<Model, IVariable[]>;
}

export namespace IVariablesModel {
  export function create(model: IVariable[]) {
    return new Model(model);
  }
}

export class Model implements IVariablesModel {
  constructor(model: IVariable[]) {
    this._state = model;
  }

  get currentChanged(): ISignal<this, IVariable> {
    return this._currentChanged;
  }

  get current(): IVariable {
    return this._current;
  }
  set current(variable: IVariable) {
    if (this._current === variable) {
      return;
    }
    this._current = variable;
    this._currentChanged.emit(variable);
  }

  get filter() {
    return this._filterState;
  }
  set filter(value) {
    if (this._filterState === value) {
      return;
    }
    this._filterState = value;
    this._variablesChanged.emit(this._filterVariables());
  }

  get variables(): IVariable[] {
    if (this._filterState) {
      return this._filterVariables();
    }
    return this._state;
  }
  set variables(variables: IVariable[]) {
    this._state = variables;
  }

  get variablesChanged(): ISignal<this, IVariable[]> {
    return this._variablesChanged;
  }

  getCurrentVariables(): IVariable[] {
    return this.variables;
  }

  fstFil(name: string): boolean {
    return (
      this._filterState
        .split('')
        .filter((ele: string, index: number) => name[index] === ele)
        .join('') === this._filterState
    );
  }

  private _filterVariables(): IVariable[] {
    return this._state.filter(ele => this.fstFil(ele.name));
  }

  private _current: IVariable;
  private _currentChanged = new Signal<this, IVariable>(this);
  private _variablesChanged = new Signal<this, IVariable[]>(this);
  private _filterState: string = '';
  private _state: IVariable[];
}
