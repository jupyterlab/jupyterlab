// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Signal, ISignal } from '@phosphor/signaling';

import { IVariable } from './variable';

export interface IVariablesModel {
  filter: string;
  variables: IVariable[];
  changeCurrentVariable: ISignal<Model, IVariable>;
  changeVariables: ISignal<Model, IVariable[]>;
  variable: IVariable;
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

  get changeCurrentVariable(): ISignal<this, IVariable> {
    return this._changeCurrentVariable;
  }

  get changeVariables(): ISignal<this, IVariable[]> {
    return this._changeVariables;
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

  get variable(): IVariable {
    return this._currentVariabile;
  }
  set variable(variable: IVariable) {
    if (this._currentVariabile === variable) {
      return;
    }
    this._currentVariabile = variable;
    this._changeCurrentVariable.emit(variable);
  }

  get filter() {
    return this._filterState;
  }
  set filter(value) {
    if (this._filterState === value) {
      return;
    }
    this._filterState = value;
    this._changeVariables.emit(this._filterVariables());
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

  private _changeCurrentVariable = new Signal<this, IVariable>(this);
  private _changeVariables = new Signal<this, IVariable[]>(this);
  private _currentVariabile: IVariable;
  private _filterState: string = '';
  private _state: IVariable[];
}
